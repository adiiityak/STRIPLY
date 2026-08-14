import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRoomSocket, shouldAcceptRoomSnapshot, type RoomSocket } from './roomClient';
import type {
  RoomAck,
  RoomIdentity,
  RoomSnapshot,
  SharedRoomConfig,
  SignalPayload
} from './types';

interface UseRoomSessionOptions {
  socket?: RoomSocket;
  requestTimeoutMs?: number;
}

interface StoredIdentity {
  code: string;
  reconnectToken: string;
}

const STORAGE_KEY = 'striply-remote-room';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export function useRoomSession(options: UseRoomSessionOptions = {}) {
  const socket = useMemo(() => options.socket ?? getRoomSocket(), [options.socket]);
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const [self, setSelf] = useState<RoomIdentity | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'joined' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const signalListeners = useRef(new Set<(payload: SignalPayload) => void>());
  const frameListeners = useRef(new Set<(payload: { index: number; dataUrl?: string }) => void>());

  const accept = useCallback((incoming: RoomSnapshot) => {
    if (!shouldAcceptRoomSnapshot(snapshotRef.current, incoming)) return;
    snapshotRef.current = incoming;
    setSnapshot(incoming);
  }, []);

  useEffect(() => {
    const onState = (incoming: RoomSnapshot) => accept(incoming);
    const onError = (incoming: { message: string }) => setError(incoming.message);
    const onSignal = (payload: SignalPayload) => signalListeners.current.forEach((listener) => listener(payload));
    const onFrame = (payload: { index: number; dataUrl: string }) =>
      frameListeners.current.forEach((listener) => listener(payload));
    const onFrameRemoved = (payload: { index: number }) =>
      frameListeners.current.forEach((listener) => listener(payload));
    socket.on('room:state', onState);
    socket.on('room:error', onError);
    socket.on('signal:receive', onSignal);
    socket.on('capture:frame', onFrame);
    socket.on('capture:removed', onFrameRemoved);
    return () => {
      socket.off('room:state', onState);
      socket.off('room:error', onError);
      socket.off('signal:receive', onSignal);
      socket.off('capture:frame', onFrame);
      socket.off('capture:removed', onFrameRemoved);
    };
  }, [accept, socket]);

  const remember = (code: string, identity: RoomIdentity) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code, reconnectToken: identity.reconnectToken }));
  };

  const enter = useCallback(
    (event: 'room:create' | 'room:join', payload: { name: string; code?: string }) =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        setStatus('connecting');
        setError(null);
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          setStatus('error');
          setError('The room service is unavailable. Please try again in a moment.');
          resolve(false);
        }, requestTimeoutMs);
        socket.emit(event as never, payload as never, ((result: RoomAck<{ identity: RoomIdentity; snapshot: RoomSnapshot }>) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          if (!result.ok || !result.data) {
            setStatus('error');
            setError(result.error?.message ?? 'Unable to enter the room.');
            resolve(false);
            return;
          }
          setSelf(result.data.identity);
          accept(result.data.snapshot);
          remember(result.data.snapshot.code, result.data.identity);
          setStatus('joined');
          resolve(true);
        }) as never);
      }),
    [accept, requestTimeoutMs, socket]
  );

  const command = useCallback(
    <T,>(event: string, payload: T) =>
      new Promise<RoomSnapshot | null>((resolve) => {
        socket.emit(event as never, payload as never, ((result: RoomAck<RoomSnapshot>) => {
          if (!result.ok || !result.data) {
            if (result.error?.snapshot) accept(result.error.snapshot);
            setError(result.error?.message ?? 'The room action failed.');
            resolve(null);
            return;
          }
          accept(result.data);
          resolve(result.data);
        }) as never);
      }),
    [accept, socket]
  );

  const reconnect = useCallback(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return Promise.resolve(false);
    let stored: StoredIdentity;
    try {
      stored = JSON.parse(raw) as StoredIdentity;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      socket.emit('room:reconnect', stored, (result) => {
        if (!result.ok || !result.data) {
          sessionStorage.removeItem(STORAGE_KEY);
          resolve(false);
          return;
        }
        setSelf(result.data.identity);
        accept(result.data.snapshot);
        setStatus('joined');
        resolve(true);
      });
    });
  }, [accept, socket]);

  const createRoom = useCallback((name: string) => enter('room:create', { name }), [enter]);
  const joinRoom = useCallback((code: string, name: string) => enter('room:join', { code, name }), [enter]);
  const setReady = useCallback((ready: boolean) => command('room:ready', { ready }), [command]);
  const updateSharedConfig = useCallback(
    (patch: Partial<SharedRoomConfig>) =>
      command('room:update', { baseRevision: snapshotRef.current?.revision ?? 0, patch }),
    [command]
  );
  const startCountdown = useCallback(() => command('capture:start', {}), [command]);
  const acceptFrame = useCallback((frameId: string) => command('capture:accept', { frameId }), [command]);
  const retakeFrame = useCallback((index: number) => command('capture:retake', { index }), [command]);
  const finishRoom = useCallback(() => command('room:finish', {}), [command]);
  const sendSignal = useCallback((payload: SignalPayload) => socket.emit('signal:send', payload), [socket]);
  const subscribeSignal = useCallback((listener: (payload: SignalPayload) => void) => {
    signalListeners.current.add(listener);
    return () => signalListeners.current.delete(listener);
  }, []);
  const publishFrame = useCallback(
    (index: number, dataUrl: string) => socket.emit('capture:publish', { index, dataUrl }),
    [socket]
  );
  const publishFrameRemoval = useCallback((index: number) => socket.emit('capture:remove', { index }), [socket]);
  const subscribeFrames = useCallback((listener: (payload: { index: number; dataUrl?: string }) => void) => {
    frameListeners.current.add(listener);
    return () => frameListeners.current.delete(listener);
  }, []);
  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    sessionStorage.removeItem(STORAGE_KEY);
    snapshotRef.current = null;
    setSnapshot(null);
    setSelf(null);
    setStatus('idle');
  }, [socket]);

  return {
    status,
    snapshot,
    self,
    error,
    createRoom,
    joinRoom,
    reconnect,
    setReady,
    updateSharedConfig,
    startCountdown,
    acceptFrame,
    retakeFrame,
    finishRoom,
    sendSignal,
    subscribeSignal,
    publishFrame,
    publishFrameRemoval,
    subscribeFrames,
    leaveRoom,
    clearError: () => setError(null)
  };
}

export type RoomSession = ReturnType<typeof useRoomSession>;
