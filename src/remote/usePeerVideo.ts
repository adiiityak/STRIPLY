import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParticipantRole, RoomPhase, SignalPayload } from './types';
import { shouldSendOffer } from './negotiation';
import { choosePeerRecovery, type PeerRecoveryAction } from './peerRecovery';
import { createSignalQueue, type SignalTarget } from './signalQueue';

type IceEnvironment = Record<string, string | undefined>;
type IceFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const TURN_CREDENTIALS_PATH = '/api/socket-io/turn-credentials';
const CONNECT_GRACE_MS = 12_000;
const RETRY_EVERY_MS = 10_000;
const GUEST_STAGGER_MS = 6_000;

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

function withoutBrowserBlockedPort53(server: RTCIceServer): RTCIceServer | null {
  const urls = typeof server.urls === 'string' ? [server.urls] : server.urls;
  const supportedUrls = urls.filter((url) => !/:(?:53)(?:\?|$)/.test(url));
  if (supportedUrls.length === 0) return null;
  return { ...server, urls: supportedUrls };
}

function isIceServer(value: unknown): value is RTCIceServer {
  if (!value || typeof value !== 'object') return false;
  const server = value as Record<string, unknown>;
  return (
    (typeof server.urls === 'string' ||
      (Array.isArray(server.urls) && server.urls.every((url) => typeof url === 'string'))) &&
    (server.username === undefined || typeof server.username === 'string') &&
    (server.credential === undefined || typeof server.credential === 'string')
  );
}

export async function loadIceServers(
  environment: IceEnvironment,
  fetcher: IceFetcher = fetch
): Promise<RTCIceServer[]> {
  try {
    const response = await fetcher(TURN_CREDENTIALS_PATH, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return buildIceServers(environment);

    const payload = (await response.json()) as { iceServers?: unknown };
    if (!Array.isArray(payload.iceServers) || !payload.iceServers.every(isIceServer)) {
      return buildIceServers(environment);
    }

    const iceServers = payload.iceServers
      .map(withoutBrowserBlockedPort53)
      .filter((server): server is RTCIceServer => server !== null);
    return iceServers.length > 0 ? iceServers : buildIceServers(environment);
  } catch {
    return buildIceServers(environment);
  }
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
  const unhealthyChecksRef = useRef(0);
  const requestRestartOnReadyRef = useRef(false);

  const retry = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !role || !localStream || typeof RTCPeerConnection === 'undefined') return;

    const environment = (import.meta as ImportMeta & { env?: IceEnvironment }).env ?? {};
    let cancelled = false;
    let peer: RTCPeerConnection | null = null;
    let unsubscribe: (() => void) | null = null;
    let watchdog: number | null = null;
    let recoveryInFlight = false;

    const clearWatchdog = () => {
      if (watchdog !== null) window.clearTimeout(watchdog);
      watchdog = null;
    };

    const rebuild = (requestRestart: boolean) => {
      requestRestartOnReadyRef.current = requestRestart;
      setGeneration((value) => value + 1);
    };

    const performRecovery = async (action: PeerRecoveryAction) => {
      if (!peer || cancelled || recoveryInFlight) return;
      if (action === 'request-restart') {
        sendSignal({ kind: 'restart', data: {} });
        return;
      }
      if (action === 'rebuild' || action === 'rebuild-and-request') {
        rebuild(action === 'rebuild-and-request');
        return;
      }

      recoveryInFlight = true;
      try {
        peer.restartIce();
        const offer = await peer.createOffer({ iceRestart: true });
        await peer.setLocalDescription(offer);
        sendSignal({ kind: 'offer', data: offer });
        setConnectionState('connecting');
      } catch (error) {
        console.error('WebRTC ICE restart failed:', error);
        rebuild(false);
      } finally {
        recoveryInFlight = false;
      }
    };

    const recover = (force = false) => {
      if (!peer || cancelled || (!force && peer.connectionState === 'connected')) return;
      unhealthyChecksRef.current += 1;
      void performRecovery(
        choosePeerRecovery({
          role,
          unhealthyChecks: unhealthyChecksRef.current,
          signalingState: peer.signalingState
        })
      );
    };

    const armWatchdog = (delay: number) => {
      clearWatchdog();
      watchdog = window.setTimeout(() => {
        if (!peer || cancelled) return;
        if (peer.connectionState === 'connected') unhealthyChecksRef.current = 0;
        else recover();
        armWatchdog(RETRY_EVERY_MS + (role === 'guest' ? GUEST_STAGGER_MS : 0));
      }, delay);
    };

    void loadIceServers(environment).then((iceServers) => {
      if (cancelled) return;

      peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;
      localStream.getVideoTracks().forEach((track) => peer?.addTrack(track, localStream));

      peer.ontrack = (event) => setRemoteStream(event.streams[0] ?? new MediaStream([event.track]));
      peer.onconnectionstatechange = () => {
        const state = peer?.connectionState ?? 'closed';
        setConnectionState(state);
        if (state === 'connected') unhealthyChecksRef.current = 0;
        else if (state === 'failed') recover();
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) sendSignal({ kind: 'ice', data: event.candidate.toJSON() });
      };

      const receive = createSignalQueue(
        peer as unknown as SignalTarget,
        sendSignal,
        (error) => {
          console.error('WebRTC signaling error:', error);
          setConnectionState('failed');
          recover();
        },
        () => {
          if (role === 'creator') recover(true);
        }
      );
      unsubscribe = subscribeSignal(receive);
      // Only now is this peer able to handle an incoming offer. Announcing
      // readiness before this point is what lost the handshake.
      setPeerEpoch((value) => value + 1);
      if (requestRestartOnReadyRef.current) {
        requestRestartOnReadyRef.current = false;
        sendSignal({ kind: 'restart', data: {} });
      }
      armWatchdog(CONNECT_GRACE_MS + (role === 'guest' ? GUEST_STAGGER_MS : 0));
    });

    return () => {
      cancelled = true;
      clearWatchdog();
      unsubscribe?.();
      if (peer) {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.close();
      }
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
