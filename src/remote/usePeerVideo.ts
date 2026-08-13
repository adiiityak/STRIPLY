import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParticipantRole, SignalPayload } from './types';

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
  sendSignal: (payload: SignalPayload) => void;
  subscribeSignal: (listener: (payload: SignalPayload) => void) => () => void;
}

export function usePeerVideo({ role, localStream, enabled, sendSignal, subscribeSignal }: UsePeerVideoOptions) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [generation, setGeneration] = useState(0);

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

    const receive = async (payload: SignalPayload) => {
      try {
        if (payload.kind === 'offer') {
          await peer.setRemoteDescription(payload.data as RTCSessionDescriptionInit);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal({ kind: 'answer', data: answer });
        } else if (payload.kind === 'answer') {
          await peer.setRemoteDescription(payload.data as RTCSessionDescriptionInit);
        } else {
          await peer.addIceCandidate(payload.data as RTCIceCandidateInit);
        }
      } catch (error) {
        console.error('WebRTC signaling error:', error);
        setConnectionState('failed');
      }
    };
    const unsubscribe = subscribeSignal(receive);

    if (role === 'creator') {
      void (async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal({ kind: 'offer', data: offer });
      })();
    }

    return () => {
      unsubscribe();
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.close();
      peerRef.current = null;
      setRemoteStream(null);
    };
  }, [enabled, generation, localStream, role, sendSignal, subscribeSignal]);

  return { remoteStream, connectionState, retry };
}
