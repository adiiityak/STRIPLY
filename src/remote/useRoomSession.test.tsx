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
  it('automatically reclaims the stored room seat after a refresh', async () => {
    const socket = new FakeSocket();
    sessionStorage.setItem('striply-remote-room', JSON.stringify({ code: 'ABC234', reconnectToken: 'token-1' }));
    socket.emit.mockImplementation((event: string, payload: any, ack: (result: any) => void) => {
      if (event !== 'room:reconnect') return;
      ack({
        ok: true,
        data: {
          identity: {
            participant: { id: 'guest-1', name: 'Maya', role: 'guest', ready: false, connection: 'connected' },
            reconnectToken: payload.reconnectToken
          },
          snapshot: {
            ...snapshot(0),
            participants: [
              { id: 'creator-1', name: 'Adk', role: 'creator', ready: false, connection: 'connected' },
              { id: 'guest-1', name: 'Maya', role: 'guest', ready: false, connection: 'connected' }
            ]
          }
        }
      });
    });

    const { result } = renderHook(() => useRoomSession({ socket: socket as any }));
    await act(async () => {});

    expect(socket.emit).toHaveBeenCalledWith(
      'room:reconnect',
      { code: 'ABC234', reconnectToken: 'token-1' },
      expect.any(Function)
    );
    expect(result.current.status).toBe('joined');
    expect(result.current.self?.participant.id).toBe('guest-1');
    sessionStorage.clear();
  });

  it('stops waiting and shows an error when the room server never acknowledges creation', async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const { result } = renderHook(() =>
      useRoomSession({ socket: socket as any, requestTimeoutMs: 250 })
    );

    let created: Promise<boolean>;
    act(() => {
      created = result.current.createRoom('Maya');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    await expect(created!).resolves.toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/room service.*unavailable/i);
    vi.useRealTimers();
  });

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
