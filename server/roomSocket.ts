import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, RoomAck, ServerToClientEvents } from '../src/remote/types';
import { createRoomService, RoomServiceError, type RoomService } from './roomService';

interface SocketData {
  roomCode?: string;
  participantId?: string;
}

const channel = (code: string) => `room:${code}`;

export function attachRoomSocketServer(httpServer: HttpServer, roomService: RoomService = createRoomService()) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: true, credentials: true },
    maxHttpBufferSize: 1_000_000
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
      if (!payload.dataUrl.startsWith('data:image/jpeg;base64,') || payload.dataUrl.length > 900_000) return;
      socket.to(channel(socket.data.roomCode)).emit('capture:frame', payload);
    });

    socket.on('capture:remove', (payload) => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      socket.to(channel(socket.data.roomCode)).emit('capture:removed', payload);
    });

    const leave = () => {
      if (!socket.data.roomCode || !socket.data.participantId) return;
      const code = socket.data.roomCode;
      const snapshot = roomService.disconnect(code, socket.data.participantId);
      if (snapshot) broadcast(code, snapshot);
    };

    socket.on('room:leave', leave);
    socket.on('disconnect', leave);
  });

  return io;
}
