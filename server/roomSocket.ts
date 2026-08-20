import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, RoomAck, ServerToClientEvents } from '../src/remote/types';
import { MAX_FRAME_CHARS } from '../src/remote/types';
import { createRoomService, RoomServiceError, type RoomService } from './roomService';

interface SocketData {
  roomCode?: string;
  participantId?: string;
}

interface RoomSocketServerOptions {
  path?: string;
}

const channel = (code: string) => `room:${code}`;

// Kept comfortably below maxHttpBufferSize: exceeding the transport limit closes
// the socket outright rather than dropping one message, which would take the
// whole room down instead of costing a single frame. Senders check the same
// limit before publishing, because in production an outsized message is dropped
// in transit and this check never runs.

export function attachRoomSocketServer(
  httpServer: HttpServer,
  roomService: RoomService = createRoomService(),
  options: RoomSocketServerOptions = {}
) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: true, credentials: true },
    // Headroom over MAX_FRAME_CHARS so an accepted frame plus protocol framing
    // can never trip the transport limit and drop the connection.
    maxHttpBufferSize: 2_000_000,
    path: options.path ?? '/socket.io'
  });

  io.on('connection', (socket) => {
    const bind = (code: string, participantId: string) => {
      socket.data.roomCode = code;
      socket.data.participantId = participantId;
      socket.join(channel(code));
    };

    const replyError = <T>(error: unknown, ack: (result: RoomAck<T>) => void) => {
      if (error instanceof RoomServiceError) {
        ack({ ok: false, error: { code: error.code, message: error.message, snapshot: error.snapshot } });
      } else {
        console.error('Remote booth socket error:', error);
        ack({ ok: false, error: { code: 'INVALID_PHASE', message: 'The room could not process that action.' } });
      }
    };

    const member = () => {
      if (!socket.data.roomCode || !socket.data.participantId) {
        throw new RoomServiceError('FORBIDDEN', 'Join a room before using booth controls.');
      }
      return { code: socket.data.roomCode, participantId: socket.data.participantId };
    };

    const broadcast = (code: string, snapshot: ReturnType<RoomService['getSnapshot']>) => {
      io.to(channel(code)).emit('room:state', snapshot);
    };

    socket.on('room:create', ({ name }, ack) => {
      try {
        const result = roomService.createRoom(name);
        bind(result.snapshot.code, result.identity.participant.id);
        ack({ ok: true, data: result });
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('room:join', ({ code, name }, ack) => {
      try {
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        const result = roomService.joinRoom(normalized, name);
        bind(normalized, result.identity.participant.id);
        ack({ ok: true, data: result });
        broadcast(normalized, result.snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('room:reconnect', ({ code, reconnectToken }, ack) => {
      try {
        const result = roomService.reconnect(code, reconnectToken);
        bind(code, result.identity.participant.id);
        ack({ ok: true, data: result });
        broadcast(code, result.snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('room:ready', ({ ready }, ack) => {
      try {
        const { code, participantId } = member();
        const snapshot = roomService.setReady(code, participantId, ready);
        ack({ ok: true, data: snapshot });
        broadcast(code, snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('room:update', ({ baseRevision, patch }, ack) => {
      try {
        const { code, participantId } = member();
        const snapshot = roomService.updateSharedConfig(code, participantId, baseRevision, patch);
        ack({ ok: true, data: snapshot });
        broadcast(code, snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('capture:start', (_payload, ack) => {
      try {
        const { code, participantId } = member();
        const snapshot = roomService.startCountdown(code, participantId);
        ack({ ok: true, data: snapshot });
        broadcast(code, snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('capture:accept', ({ frameId }, ack) => {
      try {
        const { code, participantId } = member();
        const snapshot = roomService.acceptFrame(code, participantId, frameId);
        ack({ ok: true, data: snapshot });
        broadcast(code, snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('capture:retake', ({ index }, ack) => {
      try {
        const { code, participantId } = member();
        const snapshot = roomService.retakeFrame(code, participantId, index);
        ack({ ok: true, data: snapshot });
        broadcast(code, snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('room:finish', (_payload, ack) => {
      try {
        const { code, participantId } = member();
        const snapshot = roomService.finish(code, participantId);
        ack({ ok: true, data: snapshot });
        broadcast(code, snapshot);
      } catch (error) {
        replyError(error, ack);
      }
    });

    socket.on('signal:send', (payload) => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      socket.to(channel(socket.data.roomCode)).emit('signal:receive', payload);
    });

    socket.on('capture:publish', (payload) => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      if (!Number.isInteger(payload.index) || payload.index < 0 || payload.index > 3) return;
      if (!payload.dataUrl.startsWith('data:image/jpeg;base64,')) return;
      if (payload.dataUrl.length > MAX_FRAME_CHARS) {
        // Dropping this silently is how a capture came out fine on the shooting
        // device and never appeared on its partner's. Tell the sender instead.
        console.warn(`Rejected an oversized capture frame: ${payload.dataUrl.length} chars`);
        socket.emit('room:error', {
          code: 'INVALID_PHASE',
          message: 'That photo was too large to send to your partner. It was skipped.'
        });
        return;
      }
      socket.to(channel(socket.data.roomCode)).emit('capture:frame', payload);
    });

    socket.on('capture:remove', (payload) => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      socket.to(channel(socket.data.roomCode)).emit('capture:removed', payload);
    });

    const disconnect = () => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      const code = socket.data.roomCode;
      const snapshot = roomService.disconnect(code, socket.data.participantId);
      if (snapshot) broadcast(code, snapshot);
    };

    socket.on('room:leave', () => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      const code = socket.data.roomCode;
      const snapshot = roomService.leave(code, socket.data.participantId);
      socket.leave(channel(code));
      socket.data.roomCode = undefined;
      socket.data.participantId = undefined;
      broadcast(code, snapshot);
    });
    socket.on('disconnect', disconnect);
  });

  return io;
}
