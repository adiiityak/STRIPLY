import type { SignalPayload } from './types';

/** The slice of RTCPeerConnection the signalling handler actually needs. */
export interface SignalTarget {
  readonly remoteDescription: RTCSessionDescriptionInit | null;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  createAnswer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
}

/**
 * Applies incoming signals one at a time, buffering ICE candidates until a
 * remote description exists.
 *
 * Signals arrive as independent socket events, so handling them concurrently let
 * a trickled ICE candidate reach addIceCandidate while setRemoteDescription was
 * still in flight. That throws InvalidStateError, and the old handler turned any
 * such throw into connectionState 'failed' -- losing the whole call to a
 * candidate that merely arrived a few milliseconds early.
 */
export function createSignalQueue(
  peer: SignalTarget,
  sendSignal: (payload: SignalPayload) => void,
  onError: (error: unknown) => void
) {
  const pendingCandidates: RTCIceCandidateInit[] = [];
  let chain: Promise<void> = Promise.resolve();

  const flushCandidates = async () => {
    while (pendingCandidates.length > 0) {
      await peer.addIceCandidate(pendingCandidates.shift() as RTCIceCandidateInit);
    }
  };

  const handle = async (payload: SignalPayload) => {
    if (payload.kind === 'offer') {
      await peer.setRemoteDescription(payload.data as RTCSessionDescriptionInit);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendSignal({ kind: 'answer', data: answer });
      await flushCandidates();
      return;
    }

    if (payload.kind === 'answer') {
      await peer.setRemoteDescription(payload.data as RTCSessionDescriptionInit);
      await flushCandidates();
      return;
    }

    const candidate = payload.data as RTCIceCandidateInit;
    if (!peer.remoteDescription) pendingCandidates.push(candidate);
    else await peer.addIceCandidate(candidate);
  };

  return (payload: SignalPayload) => {
    // Each link catches its own failure so one bad signal cannot wedge the
    // queue for everything that follows.
    chain = chain.then(() => handle(payload)).catch(onError);
  };
}
