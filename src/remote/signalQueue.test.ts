import { describe, expect, it, vi } from 'vitest';
import { createSignalQueue, type SignalTarget } from './signalQueue';

function fakePeer(overrides: Partial<SignalTarget> = {}) {
  const applied: string[] = [];
  let remoteDescription: RTCSessionDescriptionInit | null = null;
  // Created upfront so the test can open the gate before or after
  // setRemoteDescription is reached, without depending on microtask ordering.
  let openGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    openGate = resolve;
  });

  const peer: SignalTarget = {
    get remoteDescription() {
      return remoteDescription;
    },
    setRemoteDescription: async (description) => {
      // Deliberately slow, to model the real async gap during which further
      // socket events keep arriving.
      await gate;
      remoteDescription = description;
      applied.push(`remote:${description.type}`);
    },
    createAnswer: async () => ({ type: 'answer', sdp: 'a' }),
    setLocalDescription: async () => {
      applied.push('local:answer');
    },
    addIceCandidate: async (candidate) => {
      if (!remoteDescription) throw new Error('InvalidStateError: no remote description');
      applied.push(`ice:${candidate.candidate}`);
    },
    ...overrides
  };

  return { peer, applied, releaseRemote: () => openGate() };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createSignalQueue', () => {
  it('buffers ICE candidates that arrive before a remote description exists', async () => {
    const { peer, applied, releaseRemote } = fakePeer();
    const onError = vi.fn();
    const queue = createSignalQueue(peer, vi.fn(), onError);

    queue({ kind: 'offer', data: { type: 'offer', sdp: 'o' } });
    // The candidate races in while setRemoteDescription is still pending. This is
    // what used to throw InvalidStateError and mark the connection failed.
    queue({ kind: 'ice', data: { candidate: 'c1' } as RTCIceCandidateInit });
    await flush();

    expect(applied).toEqual([]);
    releaseRemote();
    await flush();
    await flush();

    expect(onError).not.toHaveBeenCalled();
    expect(applied).toEqual(['remote:offer', 'local:answer', 'ice:c1']);
  });

  it('processes signals in arrival order rather than concurrently', async () => {
    const { peer, applied, releaseRemote } = fakePeer();
    const queue = createSignalQueue(peer, vi.fn(), vi.fn());

    queue({ kind: 'offer', data: { type: 'offer', sdp: 'o' } });
    queue({ kind: 'ice', data: { candidate: 'first' } as RTCIceCandidateInit });
    queue({ kind: 'ice', data: { candidate: 'second' } as RTCIceCandidateInit });
    releaseRemote();
    await flush();
    await flush();
    await flush();

    expect(applied).toEqual(['remote:offer', 'local:answer', 'ice:first', 'ice:second']);
  });

  it('sends an answer back after applying an offer', async () => {
    const { peer, releaseRemote } = fakePeer();
    const sendSignal = vi.fn();
    const queue = createSignalQueue(peer, sendSignal, vi.fn());

    queue({ kind: 'offer', data: { type: 'offer', sdp: 'o' } });
    releaseRemote();
    await flush();
    await flush();

    expect(sendSignal).toHaveBeenCalledWith({ kind: 'answer', data: { type: 'answer', sdp: 'a' } });
  });

  it('applies a candidate immediately once a remote description is in place', async () => {
    const { peer, applied, releaseRemote } = fakePeer();
    const queue = createSignalQueue(peer, vi.fn(), vi.fn());

    queue({ kind: 'answer', data: { type: 'answer', sdp: 'a' } });
    releaseRemote();
    await flush();
    await flush();
    queue({ kind: 'ice', data: { candidate: 'late' } as RTCIceCandidateInit });
    await flush();

    expect(applied).toEqual(['remote:answer', 'ice:late']);
  });

  it('reports a failure without wedging the queue for later signals', async () => {
    const { peer, applied, releaseRemote } = fakePeer({
      createAnswer: async () => {
        throw new Error('boom');
      }
    });
    const onError = vi.fn();
    const queue = createSignalQueue(peer, vi.fn(), onError);

    queue({ kind: 'offer', data: { type: 'offer', sdp: 'o' } });
    releaseRemote();
    await flush();
    await flush();

    expect(onError).toHaveBeenCalledTimes(1);

    queue({ kind: 'ice', data: { candidate: 'after-error' } as RTCIceCandidateInit });
    await flush();
    expect(applied).toContain('ice:after-error');
  });
});
