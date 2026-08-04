import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Sparkles, Play, StopCircle } from 'lucide-react';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosCaptured: (capturedDataUrls: string[]) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({
  isOpen,
  onClose,
  onPhotosCaptured
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturingSeries, setIsCapturingSeries] = useState(false);
  const [targetCount, setTargetCount] = useState<number>(4);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

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

  // Capture single frame
  const snapFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip horizontally for natural mirror feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.92);
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
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-[#FF6B6B] text-white rounded-xl text-xs font-semibold hover:bg-[#ff5252] transition-colors"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          )}

          {/* Flash Effect */}
          {flash && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300" />}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center">
              <div className="text-7xl font-black text-[#FF6B6B] animate-ping drop-shadow-md">
                {countdown === 0 ? '📸 SNAP!' : countdown}
              </div>
            </div>
          )}

          {/* Target Count Indicator Badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#2D2D2D] border border-[#E8E6DF] flex items-center gap-1.5 z-20 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span>Target: {targetCount} photos</span>
          </div>
        </div>

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
