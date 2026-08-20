import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebcamModal } from './WebcamModal';

const fakeSocket = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  return {
    listeners,
    on: vi.fn((event: string, listener: (payload: unknown) => void) => {
      const current = listeners.get(event) ?? new Set();
      current.add(listener);
      listeners.set(event, current);
    }),
    off: vi.fn((event: string, listener: (payload: unknown) => void) => {
      listeners.get(event)?.delete(listener);
    }),
    emit: vi.fn()
  };
});

vi.mock('../remote/roomClient', async () => {
  const actual = await vi.importActual<typeof import('../remote/roomClient')>('../remote/roomClient');
  return { ...actual, getRoomSocket: () => fakeSocket };
});

describe('WebcamModal deliberate remote exit', () => {
  beforeEach(() => {
    fakeSocket.emit.mockReset();
    fakeSocket.listeners.clear();
    sessionStorage.clear();
    history.replaceState({}, '', '/?room=ABC234');
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('camera unavailable in test')) }
    });
  });

  it('leaves and forgets the previous room when the close button is pressed', async () => {
    sessionStorage.setItem(
      'striply-remote-room',
      JSON.stringify({ code: 'ABC234', reconnectToken: 'token-1' })
    );
    fakeSocket.emit.mockImplementation((event: string, payload: unknown, ack?: (value: unknown) => void) => {
      if (event !== 'room:reconnect' || !ack) return;
      ack({
        ok: true,
        data: {
          identity: {
            participant: {
              id: 'creator-1',
              name: 'Aditya',
              role: 'creator',
              ready: false,
              connection: 'connected'
            },
            reconnectToken: 'token-1'
          },
          snapshot: {
            code: 'ABC234',
            revision: 0,
            phase: 'lobby',
            participants: [
              {
                id: 'creator-1',
                name: 'Aditya',
                role: 'creator',
                ready: false,
                connection: 'connected'
              }
            ],
            shared: {
              layout: 'vertical-1x4',
              templateId: 'airmail',
              filterPreset: 'normal',
              background: { mode: 'original' }
            },
            acceptedFrameIds: [],
            expiresAt: Date.now() + 60_000
          }
        }
      });
    });
    const onClose = vi.fn();

    render(
      <WebcamModal
        isOpen
        onClose={onClose}
        onPhotosCaptured={vi.fn()}
        onRemoteSessionComplete={vi.fn()}
      />
    );

    await screen.findByText('ABC234');
    fireEvent.click(screen.getByRole('button', { name: 'Close remote booth' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('striply-remote-room')).toBeNull();
    expect(new URLSearchParams(location.search).has('room')).toBe(false);
    await waitFor(() => expect(fakeSocket.emit).toHaveBeenCalledWith('room:leave'));
  });
});
