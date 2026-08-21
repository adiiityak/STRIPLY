import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Sparkles, Play, Link2 } from 'lucide-react';
import { constrainImageDimensions } from '../utils/exportUtils';
import type { PhotoItem, StripConfiguration } from '../types';
import { RemoteBooth, type RemoteBoothHandle } from './RemoteBooth';
import { CountdownOverlay } from './CountdownOverlay';
import { BackgroundPicker } from './BackgroundPicker';
import { useLiveBackground } from '../remote/useLiveBackground';
import type { SharedBackground } from '../remote/types';
import { getPoseSuggestion } from '../utils/poseSuggestions';

const MAX_CAPTURE_DIMENSION = 1280;

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosCaptured: (capturedDataUrls: string[]) => void;
  onRemoteSessionComplete: (photos: PhotoItem[], config: StripConfiguration) => void;
  initialRemoteAction?: 'create' | 'join';
}

export const WebcamModal: React.FC<WebcamModalProps> = ({
  isOpen,
  onClose,
  onPhotosCaptured,
  onRemoteSessionComplete,
  initialRemoteAction
}) => {
  const [boothMode, setBoothMode] = useState<'choose' | 'solo' | 'remote'>(() =>
    new URLSearchParams(location.search).has('room') ? 'remote' : 'choose'
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturingSeries, setIsCapturingSeries] = useState(false);
  const [targetCount, setTargetCount] = useState<number>(4);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [background, setBackground] = useState<SharedBackground>({ mode: 'original' });
  const liveBackground = useLiveBackground(videoRef, background, boothMode === 'solo');
  const remoteBoothRef = useRef<RemoteBoothHandle | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialRemoteAction || new URLSearchParams(location.search).has('room')) {
      setBoothMode('remote');
    } else {
      setBoothMode('choose');
    }
  }, [initialRemoteAction, isOpen]);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (isOpen && boothMode === 'solo') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, boothMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMsg('Unable to access camera. Please allow camera permissions in your browser.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const closeRemoteBooth = () => {
    // A deliberate close is different from a refresh: free the server seat and
    // forget the reconnect token so reopening starts at Create / Join.
    remoteBoothRef.current?.leaveRoom();
    const url = new URL(location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    onClose();
  };

  // Capture single frame
  const snapFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    const sourceWidth = videoRef.current.videoWidth || 640;
    const sourceHeight = videoRef.current.videoHeight || 480;
    const captureSize = constrainImageDimensions(
      sourceWidth,
      sourceHeight,
      MAX_CAPTURE_DIMENSION
    );
    canvas.width = captureSize.width;
    canvas.height = captureSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip horizontally for natural mirror feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    // When a background is previewing live, shoot the composite that is actually
    // on screen so the saved photo matches what was framed.
    const source = liveBackground.active && liveBackground.canvasRef.current
      ? liveBackground.canvasRef.current
      : videoRef.current;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    // A bounded JPEG keeps a multi-shot strip below mobile Safari's SVG/data-URL limits when
    // html-to-image embeds every frame into the exported PNG, PDF, or share attachment.
    return canvas.toDataURL('image/jpeg', 0.88);
  };

  // Start automatic series capture (3... 2... 1... SNAP!)
  const startSeriesCapture = async () => {
    setIsCapturingSeries(true);
    setCapturedPhotos([]);

    const photos: string[] = [];

    for (let i = 0; i < targetCount; i++) {
      // Countdown 3, 2, 1
      for (let sec = 3; sec > 0; sec--) {
        setCountdown(sec);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setCountdown(0); // SNAP!
      setFlash(true);
      setTimeout(() => setFlash(false), 200);

      const dataUrl = snapFrame();
      if (dataUrl) {
        photos.push(dataUrl);
        setCapturedPhotos([...photos]);
      }

      await new Promise((r) => setTimeout(r, 800));
    }

    setCountdown(null);
    setIsCapturingSeries(false);
  };

  if (!isOpen) return null;

  if (boothMode === 'choose') {
    return (
      <div className="fixed inset-0 z-50 bg-[#2D2D2D]/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-3xl border border-[#E8E6DF] bg-white p-6 shadow-2xl">
          <button onClick={onClose} aria-label="Close web booth" className="absolute right-4 top-4 rounded-full p-2 hover:bg-[#FAF9F6]"><X className="h-4 w-4" /></button>
          <h3 className="text-xl font-black">Choose your Web Booth</h3>
          <p className="mt-1 text-sm text-[#666]">Take photos here or connect with someone far away.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => setBoothMode('solo')} className="rounded-2xl border p-5 text-left hover:border-[#FF6B6B] hover:bg-[#FFF7F7]">
              <Camera className="h-6 w-6 text-[#FF6B6B]" />
              <span className="mt-3 block font-black">Solo Booth</span>
              <span className="mt-1 block text-xs text-[#777]">Use this device’s camera</span>
            </button>
            <button onClick={() => setBoothMode('remote')} className="rounded-2xl border p-5 text-left hover:border-[#4ECDC4] hover:bg-[#F4FFFD]">
              <Link2 className="h-6 w-6 text-[#25AFA5]" />
              <span className="mt-3 block font-black">Long-Distance Booth</span>
              <span className="mt-1 block text-xs text-[#777]">Join together with a room code</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (boothMode === 'remote') {
    return (
      <div
        data-testid="remote-booth-backdrop"
        className="fixed inset-0 z-50 flex h-[100dvh] items-start justify-center overflow-hidden bg-[#2D2D2D]/60 backdrop-blur-xs lg:items-center lg:p-4"
      >
        <div
          data-testid="remote-booth-dialog"
          className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl lg:h-auto lg:max-h-[calc(100dvh-2rem)] lg:max-w-6xl lg:rounded-3xl lg:border lg:border-[#E8E6DF] lg:p-6"
        >
          <div className="mb-2 flex shrink-0 items-center justify-between border-b pb-2 lg:mb-4 lg:pb-3">
            <div><h3 className="font-black">Long-Distance Booth</h3><p className="text-xs text-[#666]">Side-by-side photos with one shared background</p></div>
            <button onClick={closeRemoteBooth} aria-label="Close remote booth" className="rounded-full p-2 hover:bg-[#FAF9F6]"><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-hidden">
            <RemoteBooth
              ref={remoteBoothRef}
              entryMode={initialRemoteAction}
              onComplete={(photos, config) => { onRemoteSessionComplete(photos, config); closeRemoteBooth(); }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2D]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E6DF] rounded-3xl max-w-2xl w-full p-5 text-[#2D2D2D] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E6DF]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFF5F5] text-[#FF6B6B] flex items-center justify-center border border-[#FF6B6B]/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2D2D2D]">Live Web Booth</h3>
              <p className="text-xs text-[#666666]">Snap a sequence of real photobooth shots</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6DF] text-[#666666] hover:text-[#2D2D2D] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Feed & Flash Container */}
        <div className="relative mt-4 bg-[#2D2D2D] rounded-2xl overflow-hidden aspect-[4/3] border border-[#E8E6DF] flex items-center justify-center">
          {errorMsg ? (
            <div className="text-center p-6 text-rose-400 text-sm max-w-sm">
              <p>{errorMsg}</p>
              {/* The booth opens automatically, so a denied camera must not be a dead end:
                  offer a way straight into the editor alongside the retry. */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-[#FF6B6B] text-white rounded-xl text-xs font-semibold hover:bg-[#ff5252] transition-colors"
                >
                  Retry Camera
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 text-white border border-white/25 rounded-xl text-xs font-semibold hover:bg-white/20 transition-colors"
                >
                  Upload photos instead
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* The video stays mounted as the segmentation source; the canvas
                  covers it while a background is applied. */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover -scale-x-100 ${liveBackground.active ? 'invisible' : ''}`}
              />
              {/* Always mounted: the effect that activates it needs the element
                  to already exist. Visibility, not mounting, is what toggles. */}
              <canvas
                ref={liveBackground.canvasRef}
                className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${liveBackground.active ? '' : 'hidden'}`}
              />
            </>
          )}

          {/* Flash Effect */}
          {flash && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300" />}

          {/* Countdown Overlay */}
          <CountdownOverlay value={countdown} />

          <div className="absolute bottom-3 left-1/2 z-20 max-w-[80%] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">
            <span className="mr-1 text-[10px] uppercase tracking-widest text-white/70">Try</span>
            {getPoseSuggestion(capturedPhotos.length)}
          </div>

          {/* Target Count Indicator Badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#2D2D2D] border border-[#E8E6DF] flex items-center gap-1.5 z-20 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span>Target: {targetCount} photos</span>
          </div>
        </div>

        {/* Background */}
        {stream && (
          <div className="mt-4">
            <BackgroundPicker value={background} onChange={setBackground} />
            {liveBackground.fallbackReason && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
                {liveBackground.fallbackReason === 'too-slow'
                  ? 'This device cannot preview the background smoothly, so the live view stays as-is.'
                  : 'Live background preview is unavailable on this browser.'}
              </p>
            )}
          </div>
        )}

        {/* Target Count Selectors & Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666666] font-semibold">Shots to take:</span>
            {[2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => setTargetCount(num)}
                disabled={isCapturingSeries}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  targetCount === num
                    ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                    : 'bg-[#FAF9F6] text-[#666666] border-[#E8E6DF] hover:bg-[#E8E6DF]'
                }`}
              >
                {num} Shots
              </button>
            ))}
          </div>

          <button
            onClick={startSeriesCapture}
            disabled={isCapturingSeries || !stream}
            className="px-5 py-2.5 rounded-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isCapturingSeries ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Taking Shots...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Photobooth Timer</span>
              </>
            )}
          </button>
        </div>

        {/* Captured Thumbnails Preview */}
        {capturedPhotos.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#E8E6DF]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#2D2D2D]">
                Captured ({capturedPhotos.length} / {targetCount})
              </span>
              <button
                onClick={() => {
                  onPhotosCaptured(capturedPhotos);
                  onClose();
                }}
                className="px-3 py-1 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Use All Captured Photos</span>
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {capturedPhotos.map((url, idx) => (
                <div key={idx} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#E8E6DF] bg-[#FAF9F6]">
                  <img src={url} alt={`Snap ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-[#FF6B6B] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
