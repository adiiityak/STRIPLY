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
import { BackgroundPicker } from './BackgroundPicker';
import { RoomEntry } from './RoomEntry';
import { optimiseSharedBackground } from '../utils/photoImport';

interface RemoteBoothProps {
  onComplete: (photos: PhotoItem[], config: StripConfiguration) => void;
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
    if (!targetAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [targetAt]);
  const remaining = targetAt ? Math.max(0, Math.ceil((targetAt - now) / 1000)) : null;
  const partner = participants.find((participant) => participant.id !== selfId);
  const ready = participants.length === 2 && participants.every((participant) => participant.connection === 'connected');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8E6DF] bg-[#FAF9F6] p-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Room code</div>
          <div className="font-mono text-xl font-black tracking-[.22em]">{code}</div>
        </div>
        <button
          onClick={() => navigator.clipboard?.writeText(`${location.origin}${location.pathname}?room=${code}`)}
          className="flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold"
        >
          <Copy className="h-3.5 w-3.5" /> Copy invite
        </button>
      </div>

      <div data-testid="remote-feed-grid" className="relative grid grid-cols-2 overflow-hidden rounded-2xl bg-[#222] aspect-[4/3]">
        <div className="relative min-w-0 overflow-hidden border-r border-white/30">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">You</span>
        </div>
        <div className="relative min-w-0 overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
            {partner?.name ?? 'Waiting…'}
          </span>
        </div>
        {remaining !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-7xl font-black text-white">
            {remaining || '📸'}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#666]">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {participants.length}/2 joined</span>
        <span className="flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> {connectionState}</span>
      </div>

      <BackgroundPicker value={shared.background} onChange={onBackgroundChange} onUpload={onBackgroundUpload} />
      {shared.background.mode !== 'original' && (
        <p className="rounded-xl bg-[#F4FFFD] px-3 py-2 text-[10px] font-semibold text-[#187E77]">
          Background removal is applied to the saved side-by-side photo on both devices.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <button
            key={index}
            onClick={() => frameUrls[index] && onRetake(index)}
            className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-[#FAF9F6]"
            aria-label={frameUrls[index] ? `Retake photo ${index + 1}` : `Photo ${index + 1} empty`}
          >
            {frameUrls[index] ? <img src={frameUrls[index]} alt={`Remote frame ${index + 1}`} className="h-full w-full object-cover" /> : <span className="text-xs text-[#aaa]">{index + 1}</span>}
            {frameUrls[index] && <RefreshCw className="absolute right-1 top-1 h-3 w-3 rounded bg-black/60 p-0.5 text-white" />}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {frameUrls.length < 4 ? (
          <button
            onClick={onCapture}
            disabled={!ready || phase === 'countdown'}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF6B6B] px-5 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            <Camera className="h-4 w-4" /> Take photo {frameUrls.length + 1}/4
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2D2D2D] px-5 py-3 text-sm font-black text-white"
          >
            <Check className="h-4 w-4" /> Finish together
          </button>
        )}
      </div>
    </div>
  );
};

export const RemoteBooth: React.FC<RemoteBoothProps> = ({ onComplete }) => {
  const session = useRoomSession();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
    sendSignal,
    subscribeSignal
  });

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
      const next = [...current];
      if (dataUrl) next[index] = dataUrl;
      else next.splice(index, 1);
      return next.filter(Boolean).slice(0, 4);
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
      if (!localVideoRef.current || !remoteVideoRef.current || remoteVideoRef.current.readyState < 2) return;
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
      session.publishFrame(index, dataUrl);
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
};
