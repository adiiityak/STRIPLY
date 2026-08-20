import { randomBytes as nodeRandomBytes } from 'node:crypto';
import type {
  ParticipantRole,
  ParticipantSnapshot,
  RoomErrorCode,
  RoomIdentity,
  RoomPhase,
  RoomSnapshot,
  SharedRoomConfig
} from '../src/remote/types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 30 * 60 * 1000;
const RECONNECT_GRACE_MS = 60 * 1000;

/** Frames in a finished strip. */
export const TOTAL_FRAMES = 4;
/** Visible 5-4-3-2-1 before each shutter. */
export const COUNTDOWN_MS = 5_000;
/** Beat after a shutter so both people can see the frame that was taken. */
export const REVIEW_PAUSE_MS = 1_500;

interface InternalParticipant extends ParticipantSnapshot {
  reconnectToken: string;
  disconnectedAt?: number;
}

interface InternalRoom {
  code: string;
  revision: number;
  phase: RoomPhase;
  participants: InternalParticipant[];
  shared: SharedRoomConfig;
  captureTargetAt?: number;
  captureControllerId?: string;
  acceptedFrameIds: string[];
  updatedBy?: string;
  expiresAt: number;
}

export class RoomServiceError extends Error {
  constructor(
    public readonly code: RoomErrorCode,
    message: string,
    public readonly snapshot?: RoomSnapshot
  ) {
    super(message);
    this.name = 'RoomServiceError';
  }
}

export interface RoomServiceOptions {
  now?: () => number;
  randomBytes?: (size: number) => Uint8Array;
}

export function createRoomService(options: RoomServiceOptions = {}) {
  const now = options.now ?? Date.now;
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const rooms = new Map<string, InternalRoom>();

  const token = (size = 18) => Buffer.from(randomBytes(size)).toString('base64url');
  const roomCode = () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const bytes = randomBytes(6);
      const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
      if (!rooms.has(code)) return code;
    }
    throw new Error('Unable to allocate a unique room code');
  };

  const snapshot = (room: InternalRoom): RoomSnapshot => ({
    code: room.code,
    revision: room.revision,
    phase: room.phase,
    participants: room.participants.map(({ reconnectToken: _token, disconnectedAt: _at, ...participant }) => ({
      ...participant
    })),
    shared: structuredClone(room.shared),
    captureTargetAt: room.captureTargetAt,
    captureControllerId: room.captureControllerId,
    acceptedFrameIds: [...room.acceptedFrameIds],
    updatedBy: room.updatedBy,
    expiresAt: room.expiresAt
  });

  const hasConnectedParticipant = (room: InternalRoom) =>
    room.participants.some((participant) => participant.connection === 'connected');

  const getRoom = (code: string) => {
    const room = rooms.get(code);
    if (!room) {
      throw new RoomServiceError('ROOM_NOT_FOUND', 'This room does not exist or has expired.');
    }
    if (room.expiresAt <= now()) {
      // A live invitation belongs to the connected participant, not to a fixed
      // timer. Only an empty/disconnected room is eligible for expiry.
      if (hasConnectedParticipant(room)) room.expiresAt = now() + ROOM_TTL_MS;
      else {
        rooms.delete(code);
        throw new RoomServiceError('ROOM_NOT_FOUND', 'This room does not exist or has expired.');
      }
    }
    return room;
  };

  const touch = (room: InternalRoom) => {
    room.expiresAt = now() + ROOM_TTL_MS;
  };

  const getParticipant = (room: InternalRoom, participantId: string) => {
    const participant = room.participants.find((item) => item.id === participantId);
    if (!participant) throw new RoomServiceError('FORBIDDEN', 'You are not a member of this room.');
    return participant;
  };

  const identity = (participant: InternalParticipant): RoomIdentity => ({
    participant: {
      id: participant.id,
      name: participant.name,
      role: participant.role,
      ready: participant.ready,
      connection: participant.connection
    },
    reconnectToken: participant.reconnectToken
  });

  const validateSharedPatch = (patch: Partial<SharedRoomConfig>) => {
    if (patch.layout && patch.layout !== 'vertical-1x4' && patch.layout !== 'grid-2x2') {
      throw new RoomServiceError('INVALID_PHASE', 'That shared layout is not supported.');
    }
    const background = patch.background;
    if (!background) return;
    if (background.mode === 'original' || background.mode === 'removed') {
      if (background.value !== undefined) {
        throw new RoomServiceError('INVALID_PHASE', 'That shared background is invalid.');
      }
      return;
    }
    const value = background.value ?? '';
    // Booth backgrounds are the raw tiles under /pattern-backgrounds/. The
    // template-previews path stays allowed so a client mid-session on the older
    // build does not have its background rejected.
    const isPreset =
      background.mode === 'preset' &&
      /^\/(pattern-backgrounds|template-previews)\/[a-z0-9-]+\.png$/.test(value);
    const isUpload =
      background.mode === 'uploaded' &&
      value.startsWith('data:image/jpeg;base64,') &&
      value.length <= 700_000;
    if (!isPreset && !isUpload) {
      throw new RoomServiceError('INVALID_PHASE', 'That shared background is invalid.');
    }
  };

  const createParticipant = (name: string, role: ParticipantRole): InternalParticipant => {
    const cleanName = name.trim().slice(0, 32);
    if (!cleanName) throw new RoomServiceError('INVALID_NAME', 'Enter your name to continue.');
    return {
      id: token(12),
      name: cleanName,
      role,
      ready: false,
      connection: 'connected',
      reconnectToken: token()
    };
  };

  return {
    createRoom(name: string) {
      const creator = createParticipant(name, 'creator');
      const code = roomCode();
      const room: InternalRoom = {
        code,
        revision: 0,
        phase: 'lobby',
        participants: [creator],
        shared: {
          layout: 'vertical-1x4',
          templateId: 'airmail',
          filterPreset: 'normal',
          background: { mode: 'original' }
        },
        acceptedFrameIds: [],
        expiresAt: now() + ROOM_TTL_MS
      };
      rooms.set(code, room);
      return { identity: identity(creator), snapshot: snapshot(room) };
    },

    joinRoom(code: string, name: string) {
      const room = getRoom(code);
      // A disconnected participant may still reclaim the seat with its private
      // token, but it must not make the public room look full. If somebody else
      // joins first, the vacant seat belongs to the new participant.
      const active = room.participants.filter((participant) => participant.connection !== 'disconnected');
      if (active.length >= 2) throw new RoomServiceError('ROOM_FULL', 'This room already has two people.');
      room.participants = active;
      const guest = createParticipant(name, 'guest');
      room.participants.push(guest);
      touch(room);
      return { identity: identity(guest), snapshot: snapshot(room) };
    },

    reconnect(code: string, reconnectToken: string) {
      const room = getRoom(code);
      const participant = room.participants.find((item) => item.reconnectToken === reconnectToken);
      if (
        !participant ||
        (participant.disconnectedAt !== undefined && now() - participant.disconnectedAt > RECONNECT_GRACE_MS)
      ) {
        throw new RoomServiceError('FORBIDDEN', 'This reconnection link has expired.');
      }
      participant.connection = 'connected';
      participant.disconnectedAt = undefined;
      touch(room);
      return { identity: identity(participant), snapshot: snapshot(room) };
    },

    setReady(code: string, participantId: string, ready: boolean) {
      const room = getRoom(code);
      const participant = getParticipant(room, participantId);
      participant.ready = ready;
      if (room.participants.length === 2 && room.participants.every((item) => item.ready)) room.phase = 'ready';
      else if (room.phase === 'ready') room.phase = 'lobby';
      touch(room);
      return snapshot(room);
    },

    updateSharedConfig(code: string, participantId: string, baseRevision: number, patch: Partial<SharedRoomConfig>) {
      const room = getRoom(code);
      const participant = getParticipant(room, participantId);
      validateSharedPatch(patch);
      if (baseRevision !== room.revision) {
        throw new RoomServiceError('STALE_REVISION', 'A newer shared change is already active.', snapshot(room));
      }
      room.shared = {
        ...room.shared,
        ...patch,
        background: patch.background ? { ...patch.background } : room.shared.background
      };
      room.revision += 1;
      room.updatedBy = participant.name;
      touch(room);
      return snapshot(room);
    },

    startCountdown(code: string, participantId: string) {
      const room = getRoom(code);
      getParticipant(room, participantId);
      if (room.participants.length !== 2) throw new RoomServiceError('INVALID_PHASE', 'Wait for your partner to join.');
      room.phase = 'countdown';
      room.captureTargetAt = now() + COUNTDOWN_MS;
      // Whoever starts the run drives all four shots. A single controller for the
      // whole sequence is what stops the two devices racing each other for it.
      room.captureControllerId = participantId;
      touch(room);
      return snapshot(room);
    },

    acceptFrame(code: string, participantId: string, frameId: string) {
      const room = getRoom(code);
      getParticipant(room, participantId);
      room.acceptedFrameIds = [...room.acceptedFrameIds, frameId].slice(0, TOTAL_FRAMES);

      if (room.acceptedFrameIds.length >= TOTAL_FRAMES) {
        // Strip is full. Go straight to 'complete' so both clients hand off into
        // the editor without anyone pressing a finish button.
        room.phase = 'complete';
        room.captureTargetAt = undefined;
        room.captureControllerId = undefined;
      } else {
        // Keep the run going: a beat to see the frame just taken, then the next
        // countdown. Driven from here so both devices count off the same clock.
        room.phase = 'countdown';
        room.captureTargetAt = now() + REVIEW_PAUSE_MS + COUNTDOWN_MS;
      }

      touch(room);
      return snapshot(room);
    },

    retakeFrame(code: string, participantId: string, index: number) {
      const room = getRoom(code);
      getParticipant(room, participantId);
      if (index < 0 || index >= room.acceptedFrameIds.length) {
        throw new RoomServiceError('INVALID_PHASE', 'That frame is not available to retake.');
      }
      room.acceptedFrameIds.splice(index, 1);
      // A retake halts the automatic run so the next countdown does not fire at
      // someone who is busy deciding. Starting again resumes from the gap.
      room.phase = 'ready';
      room.captureTargetAt = undefined;
      room.captureControllerId = undefined;
      touch(room);
      return snapshot(room);
    },

    finish(code: string, participantId: string) {
      const room = getRoom(code);
      getParticipant(room, participantId);
      if (room.acceptedFrameIds.length !== 4) {
        throw new RoomServiceError('INVALID_PHASE', 'Capture four frames before finishing.');
      }
      room.phase = 'complete';
      touch(room);
      return snapshot(room);
    },

    disconnect(code: string, participantId: string) {
      const room = rooms.get(code);
      if (!room) return undefined;
      const participant = room.participants.find((item) => item.id === participantId);
      if (!participant) return snapshot(room);
      participant.connection = 'disconnected';
      participant.disconnectedAt = now();
      // A dropped socket may simply be a refresh. Preserve an otherwise empty
      // room just long enough for its private reconnect token to reclaim it.
      if (!hasConnectedParticipant(room)) room.expiresAt = now() + RECONNECT_GRACE_MS;
      return snapshot(room);
    },

    leave(code: string, participantId: string) {
      const room = getRoom(code);
      getParticipant(room, participantId);
      room.participants = room.participants.filter((participant) => participant.id !== participantId);
      if (room.participants.length === 0) {
        room.phase = 'closed';
        const result = snapshot(room);
        rooms.delete(code);
        return result;
      }
      if (room.participants.length < 2 && room.phase !== 'complete') {
        room.phase = 'lobby';
        room.captureTargetAt = undefined;
        room.captureControllerId = undefined;
      }
      touch(room);
      return snapshot(room);
    },

    closeRoom(code: string, participantId: string) {
      const room = getRoom(code);
      getParticipant(room, participantId);
      room.phase = 'closed';
      const result = snapshot(room);
      rooms.delete(code);
      return result;
    },

    getSnapshot(code: string) {
      return snapshot(getRoom(code));
    },

    sweepExpired(at = now()) {
      for (const [code, room] of rooms) {
        if (room.expiresAt > at) continue;
        if (hasConnectedParticipant(room)) room.expiresAt = at + ROOM_TTL_MS;
        else rooms.delete(code);
      }
      return rooms.size;
    }
  };
}

export type RoomService = ReturnType<typeof createRoomService>;
