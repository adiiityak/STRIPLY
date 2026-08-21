import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Copy, Link2, RefreshCw, Users, Wifi } from 'lucide-react';
import type { PhotoItem, StripConfiguration } from '../types';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import { composeRemoteFrame } from '../remote/compositeCapture';
import { usePeerVideo } from '../remote/usePeerVideo';
import { useRoomSession, type RoomSession } from '../remote/useRoomSession';
import type {
  ParticipantSnapshot,
  RoomPhase,
  SharedBackground,
  SharedRoomConfig
} from '../remote/types';
import { MAX_FRAME_CHARS } from '../remote/types';
import { shouldAnnounceReady } from '../remote/negotiation';
import { useLiveBackground } from '../remote/useLiveBackground';
import { isCountdownStale } from '../remote/countdown';
import { BackgroundPicker } from './BackgroundPicker';
import { CountdownOverlay } from './CountdownOverlay';
import { RoomEntry } from './RoomEntry';
import { optimiseSharedBackground } from '../utils/photoImport';
import { getPoseSuggestion } from '../utils/poseSuggestions';

/** How long the copy button holds its confirmed state before reverting. */
const COPIED_FEEDBACK_MS = 2_000;
/** Frames in a finished strip. Mirrors TOTAL_FRAMES on the room service. */
const TOTAL_FRAMES = 4;
/** Highest number the countdown overlay ever shows. */
const COUNTDOWN_SECONDS = 5;

interface RemoteBoothProps {
  onComplete: (photos: PhotoItem[], config: StripConfiguration) => void;
  entryMode?: 'create' | 'join';
}

export interface RemoteBoothHandle {
  leaveRoom: () => void;
}

interface RemoteBoothViewProps {
  code: string;
  participants: ParticipantSnapshot[];
  selfId?: string;
  shared: SharedRoomConfig;
  phase: RoomPhase;
  targetAt?: number;
  frameUrls: string[];
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onFinish: () => void;
  onRetake: (index: number) => void;
  onBackgroundChange: (background: SharedBackground) => void;
  onBackgroundUpload?: (file: File) => void;
  connectionState?: RTCPeerConnectionState;
}

export const RemoteBoothView: React.FC<RemoteBoothViewProps> = ({
  code,
  participants,
  selfId,
  shared,
  phase,
  targetAt,
  frameUrls,
  localVideoRef,
  remoteVideoRef,
  onCapture,
  onFinish,
  onRetake,
  onBackgroundChange,
  onBackgroundUpload,
  connectionState = 'new'
}) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetAt || phase !== 'countdown') return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [phase, targetAt]);
  // Both feeds preview the shared background, so what you see is what gets saved.
  const localBackground = useLiveBackground(localVideoRef, shared.background);
  const remoteBackground = useLiveBackground(remoteVideoRef, shared.background);
  const backgroundFallback = localBackground.fallbackReason ?? remoteBackground.fallbackReason;

  const [copiedInvite, setCopiedInvite] = useState(false);
  const copyResetRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
  }, []);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${code}`);
    } catch {
      // Clipboard unavailable or permission denied. Say nothing rather than
      // confirming a copy that did not happen.
      return;
    }
    setCopiedInvite(true);
    if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
    copyResetRef.current = window.setTimeout(() => setCopiedInvite(false), COPIED_FEEDBACK_MS);
  };

  const staleCountdown = isCountdownStale({ phase, captureTargetAt: targetAt, now });
  // An automatic run is in progress. Restarting mid-run would reset the sequence,
  // so the control reports progress instead of inviting another press.
  const running = phase === 'countdown' && !staleCountdown;
  // Hide the overlay for a countdown that never produced a frame, so the booth
  // does not sit behind a frozen 📸. The number is clamped because the gap
  // between shots is longer than the countdown itself -- the pause should not
  // show up as "6".
  const remaining =
    targetAt && !staleCountdown
      ? Math.min(COUNTDOWN_SECONDS, Math.max(0, Math.ceil((targetAt - now) / 1000)))
      : null;
  const partner = participants.find((participant) => participant.id !== selfId);
  const connectedParticipantCount = participants.filter((participant) => participant.connection === 'connected').length;
  const ready = participants.length === 2 && participants.every((participant) => participant.connection === 'connected');

  return (
    <div
      data-testid="remote-booth-layout"
      className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-4"
    >
      <div className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-[#E8E6DF] bg-[#FAF9F6] px-3 py-2 lg:col-start-2 lg:row-start-1 lg:p-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Room code</div>
          <div className="font-mono text-lg font-black tracking-[.22em] lg:text-xl">{code}</div>
        </div>
        <button
          onClick={handleCopyInvite}
          aria-live="polite"
          className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors duration-200 ${
            copiedInvite
              ? 'border-[#2D2D2D] bg-[#2D2D2D] text-white'
              : 'border-[#E8E6DF] bg-white text-[#2D2D2D]'
          }`}
        >
          {copiedInvite ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied invite
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy invite
            </>
          )}
        </button>
      </div>

      <div
        data-testid="remote-feed-grid"
        className="relative grid aspect-video grid-cols-2 overflow-hidden rounded-2xl bg-[#222] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:aspect-[4/3] lg:self-start"
      >
        <div className="relative min-w-0 overflow-hidden border-r border-white/30">
          {/* The video stays mounted as the segmentation source; the canvas covers
              it while a background is applied. */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover -scale-x-100 ${localBackground.active ? 'invisible' : ''}`}
          />
          {/* Always mounted: the effect that activates it needs the element to
              already exist. Visibility, not mounting, is what toggles. */}
          <canvas
            ref={localBackground.canvasRef}
            className={`absolute inset-0 h-full w-full object-cover -scale-x-100 ${localBackground.active ? '' : 'hidden'}`}
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">You</span>
          {localBackground.preparing && (
            <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
              Preparing background…
            </span>
          )}
        </div>
        <div className="relative min-w-0 overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${remoteBackground.active ? 'invisible' : ''}`}
          />
          <canvas
            ref={remoteBackground.canvasRef}
            className={`absolute inset-0 h-full w-full object-cover ${remoteBackground.active ? '' : 'hidden'}`}
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
            {partner?.name ?? 'Waiting…'}
          </span>
        </div>
        <CountdownOverlay value={remaining} />
        <div className="absolute bottom-3 left-1/2 z-20 max-w-[80%] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-[10px] font-semibold text-white backdrop-blur-sm lg:text-xs">
          <span className="mr-1 uppercase tracking-widest text-white/70">Try</span>
          {getPoseSuggestion(frameUrls.length)}
        </div>
      </div>

      <div data-testid="remote-booth-controls" className="min-w-0 space-y-2 lg:col-start-2 lg:row-start-2">
        <div className="flex items-center justify-between text-[11px] text-[#666]">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {connectedParticipantCount}/2 joined</span>
          <span className="flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> {connectionState}</span>
        </div>

        <BackgroundPicker value={shared.background} onChange={onBackgroundChange} onUpload={onBackgroundUpload} />
        {backgroundFallback && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
            {backgroundFallback === 'too-slow'
              ? 'This device cannot preview the background smoothly, so the live view stays as-is. Your saved photos still get it.'
              : 'Live background preview is unavailable on this browser. Your saved photos still get it.'}
          </p>
        )}

        <div className="grid grid-cols-4 gap-1.5 lg:gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <button
              key={index}
              onClick={() => frameUrls[index] && onRetake(index)}
              className="relative aspect-video min-h-11 overflow-hidden rounded-xl border bg-[#FAF9F6] lg:aspect-[4/3]"
              aria-label={frameUrls[index] ? `Retake photo ${index + 1}` : `Photo ${index + 1} empty`}
            >
              {frameUrls[index] ? <img src={frameUrls[index]} alt={`Remote frame ${index + 1}`} className="h-full w-full object-cover" /> : <span className="text-xs text-[#aaa]">{index + 1}</span>}
              {frameUrls[index] && <RefreshCw className="absolute right-1 top-1 h-3 w-3 rounded bg-black/60 p-0.5 text-white" />}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCapture}
            disabled={!ready || running}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF6B6B] px-4 py-2 text-sm font-black text-white disabled:opacity-40 lg:px-5 lg:py-3"
          >
            <Camera className="h-4 w-4" />
            {running
              ? `Taking photo ${Math.min(frameUrls.length + 1, TOTAL_FRAMES)} of ${TOTAL_FRAMES}…`
              : frameUrls.length > 0
                ? `Resume — ${frameUrls.length}/${TOTAL_FRAMES} taken`
                : `Start photo booth — ${TOTAL_FRAMES} shots`}
          </button>
        </div>
        <p className="hidden text-center text-[10px] text-[#777] lg:block">
          {running
            ? 'Hold still. The booth takes all four on its own.'
            : `One tap takes ${TOTAL_FRAMES} photos with a countdown before each, then opens the editor.`}
        </p>
      </div>
    </div>
  );
};

export const RemoteBooth = React.forwardRef<RemoteBoothHandle, RemoteBoothProps>(({ onComplete, entryMode }, ref) => {
  const session = useRoomSession();
  React.useImperativeHandle(ref, () => ({ leaveRoom: session.leaveRoom }), [session.leaveRoom]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const completedRevisionRef = useRef<number | null>(null);

  const subscribeSignal = useCallback((listener: Parameters<RoomSession['subscribeSignal']>[0]) => session.subscribeSignal(listener), [session.subscribeSignal]);
  const sendSignal = useCallback((payload: Parameters<RoomSession['sendSignal']>[0]) => session.sendSignal(payload), [session.sendSignal]);
  const peer = usePeerVideo({
    role: session.self?.participant.role,
    localStream,
    enabled: Boolean(session.snapshot?.participants.length === 2),
    phase: session.snapshot?.phase ?? 'lobby',
    sendSignal,
    subscribeSignal
  });

  // Tell the room this device can receive an offer. The server flips the room to
  // 'ready' once both participants have said so, and only then does the creator
  // negotiate -- so an offer can no longer land on a guest that is still waiting
  // on its camera permission prompt.
  const announcedReadyRef = useRef(false);
  useEffect(() => {
    if (
      !shouldAnnounceReady({
        hasLocalStream: Boolean(localStream),
        isListeningForSignals: peer.isListeningForSignals,
        alreadyAnnounced: announcedReadyRef.current
      })
    ) return;
    announcedReadyRef.current = true;
    void session.setReady(true);
  }, [localStream, peer.isListeningForSignals, session.setReady]);

  useEffect(() => {
    if (session.status !== 'joined') return;
    let acquired: MediaStream | null = null;
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        acquired = stream;
        setLocalStream(stream);
      })
      .catch(() => setCameraError('Camera access is required for a remote booth.'));
    return () => acquired?.getTracks().forEach((track) => track.stop());
  }, [session.status]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = peer.remoteStream;
  }, [peer.remoteStream]);
  useEffect(() => session.subscribeFrames(({ index, dataUrl }) => {
    setFrameUrls((current) => {
      // Slot positions are meaningful, so a frame is written at its own index and
      // holes are closed by splice. The previous filter(Boolean) compacted holes
      // on every update, which silently shifted frames into the wrong slots when
      // one arrived out of order.
      const next = [...current];
      if (dataUrl) next[index] = dataUrl;
      else next.splice(index, 1);
      return next.slice(0, TOTAL_FRAMES);
    });
  }), [session.subscribeFrames]);

  useEffect(() => {
    const snapshot = session.snapshot;
    if (
      snapshot?.phase !== 'countdown' ||
      snapshot.captureControllerId !== session.self?.participant.id ||
      !snapshot.captureTargetAt
    ) return;
    const delay = Math.max(0, snapshot.captureTargetAt - Date.now());
    const timer = window.setTimeout(async () => {
      // HAVE_CURRENT_DATA. Compositing a frame from a video with nothing decoded
      // yet would produce a blank half, so skip the shot -- but say so, because a
      // silent return used to leave the booth stuck behind a frozen countdown.
      if (!localVideoRef.current || !remoteVideoRef.current || remoteVideoRef.current.readyState < 2) {
        setCaptureError("Your partner's video has not arrived yet, so that shot was skipped. Try again.");
        return;
      }
      setCaptureError(null);
      const index = snapshot.acceptedFrameIds.length;
      const background = snapshot.shared.background;
      const dataUrl = await composeRemoteFrame({
        localSource: localVideoRef.current,
        remoteSource: remoteVideoRef.current,
        backgroundUrl: background.mode === 'preset' || background.mode === 'uploaded' ? background.value : undefined,
        removeSourceBackgrounds: background.mode !== 'original',
        localOnLeft: session.self?.participant.role === 'creator'
      });
      setFrameUrls((current) => [...current.slice(0, index), dataUrl, ...current.slice(index + 1)].slice(0, 4));
      if (dataUrl.length > MAX_FRAME_CHARS) {
        // Checked here because an outsized message is dropped in transit in
        // production, so waiting for the server to object means never hearing
        // anything at all and the partner simply missing the photo.
        setCaptureError('That photo was too large to send to your partner, so they will not see it.');
      } else {
        session.publishFrame(index, dataUrl);
      }
      await session.acceptFrame(`frame-${index}-${Date.now()}`);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [session.snapshot?.phase, session.snapshot?.captureTargetAt, session.snapshot?.captureControllerId]);

  const handoff = useCallback((snapshot: NonNullable<RoomSession['snapshot']>) => {
    if (completedRevisionRef.current === snapshot.revision || frameUrls.length !== 4) return;
    completedRevisionRef.current = snapshot.revision;
    const template = TEMPLATE_DEFINITIONS.find((item) => item.id === snapshot.shared.templateId) ?? TEMPLATE_DEFINITIONS[0];
    const photos: PhotoItem[] = frameUrls.map((url, index) => ({
      id: `remote-${Date.now()}-${index}`,
      url,
      originalUrl: url,
      cropX: 50,
      cropY: 50,
      zoom: 1,
      caption: `Together frame ${index + 1}`
    }));
    onComplete(photos, {
      ...template.config,
      photoCount: 4,
      photoLayout: snapshot.shared.layout,
      filter: { ...template.config.filter, preset: snapshot.shared.filterPreset }
    });
  }, [frameUrls, onComplete]);

  useEffect(() => {
    if (session.snapshot?.phase === 'complete') handoff(session.snapshot);
  }, [handoff, session.snapshot]);

  if (session.status !== 'joined' || !session.snapshot || !session.self) {
    return (
      <>
        <RoomEntry
          busy={session.status === 'connecting'}
          initialCode={new URLSearchParams(location.search).get('room') ?? ''}
          initialMode={entryMode}
          onCreate={session.createRoom}
          onJoin={session.joinRoom}
        />
        {session.error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{session.error}</p>}
      </>
    );
  }

  return (
    <>
      {cameraError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{cameraError}</p>}
      {captureError && <p role="alert" className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{captureError}</p>}
      {/* Room errors were only ever rendered on the entry screen, so a rejected
          change inside the booth -- a background the server would not take, say --
          looked like the tap simply did nothing. */}
      {session.error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{session.error}</p>
      )}
      <RemoteBoothView
        code={session.snapshot.code}
        participants={session.snapshot.participants}
        selfId={session.self.participant.id}
        shared={session.snapshot.shared}
        phase={session.snapshot.phase}
        targetAt={session.snapshot.captureTargetAt}
        frameUrls={frameUrls}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        connectionState={peer.connectionState}
        onCapture={() => void session.startCountdown()}
        onRetake={(index) => {
          setFrameUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
          session.publishFrameRemoval(index);
          void session.retakeFrame(index);
        }}
        onFinish={() => void session.finishRoom()}
        onBackgroundChange={(background) => void session.updateSharedConfig({ background })}
        onBackgroundUpload={(file) => {
          void optimiseSharedBackground(file)
            .then((value) => session.updateSharedConfig({ background: { mode: 'uploaded', value } }))
            .catch((error) => console.error('Unable to upload shared background:', error));
        }}
      />
    </>
  );
});

RemoteBooth.displayName = 'RemoteBooth';
