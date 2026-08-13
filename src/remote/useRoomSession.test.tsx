import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRoomSession } from './useRoomSession';
import type { RoomSnapshot } from './types';

class FakeSocket {
  listeners = new Map<string, Set<(payload: any) => void>>();
  on(event: string, listener: (payload: any) => void) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }
  off(event: string, listener: (payload: any) => void) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }
  emit = vi.fn();
  serverEmit(event: string, payload: any) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

const snapshot = (revision: number): RoomSnapshot => ({
  code: 'ABC234',
  revision,
  phase: 'lobby',
  participants: [],
  shared: {
    layout: 'vertical-1x4',
    templateId: 'airmail',
    filterPreset: 'normal',
    background: { mode: 'original' }
  },
  acceptedFrameIds: [],
  expiresAt: Date.now() + 10_000
});

describe('useRoomSession', () => {
  it('ignores room snapshots older than the current authoritative revision', () => {
    const socket = new FakeSocket();
    const { result } = renderHook(() => useRoomSession({ socket: socket as any }));

    act(() => socket.serverEmit('room:state', snapshot(3)));
    act(() => socket.serverEmit('room:state', snapshot(2)));

    expect(result.current.snapshot?.revision).toBe(3);
  });

  it('removes every socket listener during cleanup', () => {
    const socket = new FakeSocket();
    const { unmount } = renderHook(() => useRoomSession({ socket: socket as any }));
    unmount();

    expect(Array.from(socket.listeners.values()).every((listeners) => listeners.size === 0)).toBe(true);
  });
});
