import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParticipantRole, RoomPhase, SignalPayload } from './types';
import { shouldSendOffer } from './negotiation';
import { createSignalQueue, type SignalTarget } from './signalQueue';

type IceEnvironment = Record<string, string | undefined>;

export function buildIceServers(environment: IceEnvironment): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: environment.VITE_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302' }
  ];
  if (
    environment.VITE_WEBRTC_TURN_URL &&
    environment.VITE_WEBRTC_TURN_USERNAME &&
    environment.VITE_WEBRTC_TURN_CREDENTIAL
  ) {
    servers.push({
      urls: environment.VITE_WEBRTC_TURN_URL,
      username: environment.VITE_WEBRTC_TURN_USERNAME,
      credential: environment.VITE_WEBRTC_TURN_CREDENTIAL
    });
  }
  return servers;
}

interface UsePeerVideoOptions {
  role?: ParticipantRole;
  localStream: MediaStream | null;
  enabled: boolean;
  /**
   * Room phase. Negotiation waits for it to reach 'ready', which is the room's
   * signal that both peers have a signal listener attached.
   */
  phase: RoomPhase;
  sendSignal: (payload: SignalPayload) => void;
  subscribeSignal: (listener: (payload: SignalPayload) => void) => () => void;
}

export function usePeerVideo({ role, localStream, enabled, phase, sendSignal, subscribeSignal }: UsePeerVideoOptions) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [generation, setGeneration] = useState(0);
  // Bumped once a peer exists and its signal listener is attached, so the
  // offer effect below re-evaluates against a live connection.
  const [peerEpoch, setPeerEpoch] = useState(0);
  const offeredEpochRef = useRef<number | null>(null);

  const retry = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !role || !localStream || typeof RTCPeerConnection === 'undefined') return;

    const environment = (import.meta as ImportMeta & { env?: IceEnvironment }).env ?? {};
    const peer = new RTCPeerConnection({ iceServers: buildIceServers(environment) });
    peerRef.current = peer;
    localStream.getVideoTracks().forEach((track) => peer.addTrack(track, localStream));

    peer.ontrack = (event) => setRemoteStream(event.streams[0] ?? new MediaStream([event.track]));
    peer.onconnectionstatechange = () => setConnectionState(peer.connectionState);
    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ kind: 'ice', data: event.candidate.toJSON() });
    };

    const receive = createSignalQueue(peer as unknown as SignalTarget, sendSignal, (error) => {
      console.error('WebRTC signaling error:', error);
      setConnectionState('failed');
    });
    const unsubscribe = subscribeSignal(receive);
    // Only now is this peer able to handle an incoming offer. Announcing
    // readiness before this point is what lost the handshake.
    setPeerEpoch((value) => value + 1);

    return () => {
      unsubscribe();
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.close();
      peerRef.current = null;
      setRemoteStream(null);
    };
  }, [enabled, generation, localStream, role, sendSignal, subscribeSignal]);

  // Kept out of the effect above so that a phase change never tears down and
  // rebuilds a working peer connection.
  useEffect(() => {
    const peer = peerRef.current;
    if (
      !peer ||
      !shouldSendOffer({
        role,
        phase,
        hasPeer: true,
        alreadyOffered: offeredEpochRef.current === peerEpoch
      })
    ) return;

    offeredEpochRef.current = peerEpoch;
    void (async () => {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal({ kind: 'offer', data: offer });
      } catch (error) {
        console.error('WebRTC offer failed:', error);
        // Allow a later attempt for this same peer rather than wedging silently.
        offeredEpochRef.current = null;
        setConnectionState('failed');
      }
    })();
  }, [peerEpoch, phase, role, sendSignal]);

  return { remoteStream, connectionState, retry, isListeningForSignals: peerEpoch > 0 };
}
