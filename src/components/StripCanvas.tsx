import React from 'react';
import { PhotoItem, StripConfiguration, PlacedSticker } from '../types';
import { getFilterCSS, getFadeOpacity } from '../utils/filterUtils';
import {
  Trash2,
  RotateCw,
  ZoomIn,
  MapPin,
  Music,
  Sun,
  Sparkles,
  QrCode,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Camera,
  MessageCircle,
  Share2,
  Lock,
  Scissors,
  Plane
} from 'lucide-react';

interface StripCanvasProps {
  photos: PhotoItem[];
  config: StripConfiguration;
  onUpdateSticker?: (id: string, updates: Partial<PlacedSticker>) => void;
  onDeleteSticker?: (id: string) => void;
  onEditPhoto?: (photo: PhotoItem) => void;
  zoomLevel: number;
}

// Helper Typewriter / Animated Caption component
const TypewriterText: React.FC<{
  text: string;
  mode?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ text, mode = 'typewriter', className, style }) => {
  const [displayedText, setDisplayedText] = React.useState(mode === 'typewriter' ? '' : text);

  React.useEffect(() => {
    if (mode !== 'typewriter') {
      setDisplayedText(text);
      return;
    }

    setDisplayedText('');
    let idx = 0;
    const timer = setInterval(() => {
      if (idx < text.length) {
        setDisplayedText(text.slice(0, idx + 1));
        idx++;
      } else {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [text, mode]);

  if (mode === 'fadeSlide') {
    return (
      <span className={`inline-block animate-caption-fade ${className || ''}`} style={style}>
        {text}
      </span>
    );
  }

  if (mode === 'pulse') {
    return (
      <span className={`inline-block animate-pulse ${className || ''}`} style={style}>
        {text}
      </span>
    );
  }

  if (mode === 'typewriter') {
    return (
      <span className={className} style={style}>
        {displayedText}
        {displayedText.length < text.length && <span className="typing-cursor" />}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
};

export const StripCanvas = React.forwardRef<HTMLDivElement, StripCanvasProps>(
  ({ photos, config, onUpdateSticker, onDeleteSticker, onEditPhoto, zoomLevel }, ref) => {
    const [selectedStickerId, setSelectedStickerId] = React.useState<string | null>(null);

    // Sticker animation class
    const getStickerAnimClass = (animMode?: string) => {
      switch (animMode) {
        case 'bounce':
          return 'animate-sticker-bounce';
        case 'sway':
          return 'animate-sticker-sway';
        case 'none':
          return '';
        case 'float':
        default:
          return 'animate-sticker-float';
      }
    };

    // Font family mapping
    const getFontFamily = (fontType: string) => {
      switch (fontType) {
        case 'handwritten':
          return "'Caveat', 'Comic Sans MS', cursive";
        case 'serif':
          return "'Playfair Display', 'Georgia', serif";
        case 'typewriter':
          return "'Courier New', Courier, monospace";
        case 'retro':
          return "'VT323', 'Press Start 2P', monospace";
        case 'cute':
          return "'Fredoka', 'Quicksand', sans-serif";
        case 'sans':
        default:
          return "'Plus Jakarta Sans', system-ui, sans-serif";
      }
    };

    // Filter CSS
    const filterCSS = getFilterCSS(config.filter);
    const fadeOverlayOpacity = getFadeOpacity(config.filter);

    // Frame style classes
    const getFrameContainerClass = () => {
      switch (config.frameType) {
        case 'rounded':
          return 'rounded-xl overflow-hidden';
        case 'square':
          return 'rounded-none border border-zinc-200/50';
        case 'film':
          return 'rounded-sm border-y-2 border-zinc-900 bg-zinc-950 p-1';
        case 'torn':
          return 'rounded-sm border-2 border-dashed border-rose-300';
        case 'vintage':
          return 'rounded-none border-4 border-double border-amber-900/30';
        case 'shadow':
          return 'rounded-md shadow-lg shadow-zinc-900/20';
        case 'scalloped':
          return 'rounded-2xl border-4 border-pink-300 shadow-md';
        case 'ticket':
          return 'rounded-lg border-2 border-dashed border-zinc-200';
        case 'borderless':
        default:
          return 'rounded-none';
      }
    };

    const isDarkCanvas =
      config.background.color === '#121212' ||
      config.background.color === '#111113' ||
      config.background.color === '#27272a' ||
      config.background.color === '#1c1917' ||
      config.background.color === '#1d4ed8' ||
      config.background.color === '#7f1d1d';

    return (
      <div
        className="relative transition-transform duration-200 select-none flex justify-center items-center"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
      >
        {/* Main Canvas Container for Export */}
        <div
          ref={ref}
          id="striply-canvas"
          className="relative shadow-2xl transition-all overflow-hidden flex flex-col items-center"
          style={{
            backgroundColor: config.background.color,
            backgroundImage:
              config.background.type === 'gradient' && config.background.gradientTo
                ? `linear-gradient(to bottom, ${config.background.color}, ${config.background.gradientTo})`
                : config.background.type === 'pattern'
                ? getPatternBackground(config.background.patternName, config.background.color)
                : undefined,
            width: getCanvasWidth(config.exportFormat),
            padding: `${config.outerPadding}px`,
            fontFamily: getFontFamily(config.fontType)
          }}
        >
          {/* Film & Selene Sprocket Holes */}
          {(config.style === 'film' || config.style === 'selene') && (
            <>
              {/* Left Sprocket Column */}
              <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-between py-3 z-10 pointer-events-none">
                {Array.from({ length: Math.max(14, photos.length * 4) }).map((_, i) => (
                  <div key={i} className="w-2.5 h-3.5 bg-zinc-950 rounded-sm border border-zinc-700/60 my-1" />
                ))}
              </div>
              {/* Right Sprocket Column */}
              <div className="absolute right-1.5 top-0 bottom-0 flex flex-col justify-between py-3 z-10 pointer-events-none">
                {Array.from({ length: Math.max(14, photos.length * 4) }).map((_, i) => (
                  <div key={i} className="w-2.5 h-3.5 bg-zinc-950 rounded-sm border border-zinc-700/60 my-1" />
                ))}
              </div>
            </>
          )}

          {/* Ticket Stub Side Notch Cutouts */}
          {config.style === 'ticketstub' && (
            <>
              <div className="absolute -left-3 top-1/4 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 z-20" />
              <div className="absolute -right-3 top-1/4 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 z-20" />
              <div className="absolute -left-3 top-3/4 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 z-20" />
              <div className="absolute -right-3 top-3/4 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 z-20" />
            </>
          )}

          {/* Film Burn / Light Leak Effect Overlay */}
          {config.filter.lightLeak && (
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/15 via-amber-400/10 to-transparent pointer-events-none z-20 mix-blend-screen" />
          )}

          {/* Film Dust Effect Overlay */}
          {config.filter.dustOverlay && (
            <div
              className="absolute inset-0 pointer-events-none z-20 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), radial-gradient(rgba(0, 0, 0, 0.5) 1px, transparent 1px)`,
                backgroundSize: '24px 24px, 18px 18px',
                backgroundPosition: '0 0, 9px 9px'
              }}
            />
          )}

          {/* --- SPECIAL HEADER OVERLAYS --- */}

          {/* Boarding Pass Header */}
          {config.style === 'boardingpass' && (
            <div className="w-full bg-red-600 text-white rounded-t-xl overflow-hidden mb-3 shadow-sm z-10 border border-red-700">
              <div className="bg-red-700 px-3 py-1 flex justify-between items-center text-[10px] font-mono tracking-wider">
                <span className="font-bold flex items-center gap-1">
                  <Plane className="w-3 h-3 text-white" />
                  <span>{config.boardingPass?.airlineName || config.captionText || 'URARCHIVE AIRLINES'}</span>
                </span>
                <span className="bg-red-800 text-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {config.boardingPass?.classType || 'FIRST CLASS'}
                </span>
              </div>
              <div className="p-3 bg-red-600 text-white flex items-center justify-between">
                <div>
                  <div className="text-xl font-black font-mono tracking-widest leading-none">
                    {config.boardingPass?.departureCode || 'JKT'}
                  </div>
                  <div className="text-[9px] font-sans opacity-90 tracking-wide mt-0.5">
                    {config.boardingPass?.departureCity || 'JAKARTA'}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <Plane className="w-3.5 h-3.5 text-white" />
                  <span className="text-[9px] font-mono opacity-80 border-t border-dashed border-white/50 px-2 pt-0.5">
                    {config.boardingPass?.flightNo || 'URC08'}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black font-mono tracking-widest leading-none">
                    {config.boardingPass?.arrivalCode || 'BJM'}
                  </div>
                  <div className="text-[9px] font-sans opacity-90 tracking-wide mt-0.5">
                    {config.boardingPass?.arrivalCity || 'BANJARMASIN'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Air Mail Envelope Header */}
          {config.style === 'airmail' && (
            <div className="w-full text-zinc-900 pb-2 mb-2 border-b-2 border-dashed border-red-400 z-10 flex items-center justify-between">
              <div>
                <div className="inline-block bg-blue-700 text-white font-mono text-[9px] font-black tracking-widest px-2 py-0.5 rounded-sm uppercase shadow-xs">
                  {config.airMail?.airMailBadge || 'PAR AVION / BY AIR MAIL'}
                </div>
                <div className="text-xs font-handwriting font-bold text-red-700 mt-1">
                  {config.airMail?.postcardTitle || config.captionText || 'Air Mail Postcard'}
                </div>
              </div>

              {/* Stamp Seal */}
              <div className="w-10 h-11 border-2 border-dashed border-amber-800/60 bg-amber-100/90 rounded p-1 flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-[10px]">📮</span>
                <span className="text-[7px] font-mono font-bold text-amber-900 leading-tight text-center">
                  {config.airMail?.stampText || 'AIR MAIL'}
                </span>
              </div>
            </div>
          )}

          {/* Boothy Call Circles Header */}
          {config.style === 'boothycall' && (
            <div className="w-full text-center pt-1 pb-3 text-white z-10 flex items-center justify-between bg-emerald-900/90 border border-emerald-500/40 px-3 py-1.5 rounded-full mb-3 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="text-base">📞</span>
                <span className="font-handwriting font-bold text-sm text-emerald-200">
                  {config.captionText || 'Boothy Call'}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                CONNECT 24/7
              </span>
            </div>
          )}

          {/* Wedding Ribbon & Bows Header */}
          {config.style === 'weddingribbon' && (
            <div className="w-full text-center pt-2 pb-3 text-slate-100 z-10 flex flex-col items-center">
              <div className="text-xs font-serif tracking-widest uppercase text-slate-300 mb-0.5 flex items-center gap-2">
                <span>🎀</span>
                <span>FOTOROOM WEDDING</span>
                <span>🎀</span>
              </div>
              <div className="text-xl font-handwriting text-rose-200 font-bold">
                {config.captionText || 'The Wedding of'}
              </div>
            </div>
          )}

          {/* Memories Archive Header */}
          {config.style === 'memoriesarchive' && (
            <div className="w-full text-zinc-900 pb-3 z-10 border-b border-zinc-300 mb-2 flex items-center justify-between">
              <div>
                <div className="text-base font-serif font-bold text-zinc-900 tracking-tight leading-none">
                  {config.captionText || 'MEMORIES archive'}
                </div>
                <div className="text-[9px] font-mono text-zinc-500 tracking-widest mt-0.5">
                  THE BEST MEMORIES ARE MADE TOGETHER
                </div>
              </div>
              {/* GOOD VIBES Oval Badge */}
              <div className="border border-emerald-700 bg-emerald-50 text-emerald-800 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider shadow-xs">
                GOOD VIBES
              </div>
            </div>
          )}

          {/* Film Style Header */}
          {config.style === 'film' && (
            <div className="w-full text-center pb-2 text-[10px] font-mono tracking-widest text-amber-500/80 uppercase font-bold flex justify-between px-6 z-10">
              <span>SAFETY FILM 35MM</span>
              <span>KODAK 400</span>
            </div>
          )}

          {/* iOS Lockscreen Header */}
          {config.style === 'ioslockscreen' && (
            <div className="w-full text-center pt-1 pb-3 text-white z-10 flex flex-col items-center">
              <div className="flex items-center gap-1 opacity-70 text-[10px] font-sans tracking-wide mb-1">
                <Lock className="w-3 h-3" />
                <span>iPhone</span>
              </div>
              <div className="text-3xl font-extrabold tracking-tight font-sans drop-shadow-md">
                {config.lockscreen?.time || config.customDateText || '11:26'}
              </div>
              <div className="text-[11px] font-medium opacity-80 mt-0.5">
                {config.lockscreen?.date || 'Saturday, November 30'}
              </div>
            </div>
          )}

          {/* Ticket Stub Barcode Header */}
          {config.style === 'ticketstub' && (
            <div className="w-full text-center pt-1 pb-3 text-zinc-800 z-10 flex flex-col items-center bg-white/95 rounded-t-xl p-3 border-b-2 border-dashed border-zinc-300">
              <div className="font-mono text-xs font-bold tracking-widest text-zinc-900 uppercase">
                {config.ticket?.studioName || 'PIXELBOOTH'}
              </div>
              {/* Simulated Barcode */}
              <div className="my-1.5 h-7 w-full flex items-center justify-center gap-0.5 overflow-hidden">
                {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1].map((w, idx) => (
                  <div key={idx} className="bg-zinc-900 h-full" style={{ width: `${w * 2}px` }} />
                ))}
              </div>
              <div className="text-[14px] font-handwriting font-bold text-rose-800">
                {config.ticket?.eventTitle || 'Special Day'}
              </div>
            </div>
          )}

          {/* Y2K Cobalt Header */}
          {config.style === 'y2kblue' && (
            <div className="w-full text-center pb-3 text-white z-10 flex flex-col items-center border-b border-blue-400/40 mb-2">
              <div className="flex items-center gap-2 text-xs font-mono font-black tracking-wider text-cyan-300">
                <span>✦</span>
                <span>{config.captionText || 'EVERY MOMENT 1.0'}</span>
                <span>✦</span>
              </div>
              <div className="text-[10px] font-mono text-blue-200 opacity-80 tracking-widest">
                DIGITAL ARCHIVE • 2000s
              </div>
            </div>
          )}

          {/* I ❤ YOU Header */}
          {config.style === 'iloveyou' && (
            <div className="w-full text-center pt-2 pb-4 text-zinc-900 z-10 flex flex-col items-center">
              <div className="text-3xl font-extrabold font-serif tracking-tight flex items-center gap-1.5 leading-none">
                <span>I</span>
                <Heart className="w-7 h-7 text-red-600 fill-red-600 inline-block animate-pulse" />
                <span>YOU</span>
              </div>
            </div>
          )}

          {/* EXCLUSIVE Editorial Header */}
          {config.style === 'editorial' && (
            <div className="w-full text-center pb-2 text-zinc-900 z-10 border-b-2 border-zinc-900 mb-2">
              <h1 className="text-2xl font-black font-serif tracking-widest uppercase">
                {config.captionText || 'EXCLUSIVE'}
              </h1>
              <div className="text-[9px] font-mono tracking-widest text-zinc-600 border-t border-zinc-300 mt-1 pt-0.5">
                {config.subCaptionText || '08/08 • POSE, CLICK, REPEAT • 2026'}
              </div>
            </div>
          )}

          {/* MAIN PHOTO COLUMN */}
          <div
            className="w-full flex flex-col items-center"
            style={{
              gap: `${config.photoGap}px`,
              paddingLeft: config.style === 'film' || config.style === 'selene' ? '20px' : '0px',
              paddingRight: config.style === 'film' || config.style === 'selene' ? '20px' : '0px'
            }}
          >
            {photos.length === 0 ? (
              <div className="w-full h-64 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No photos added yet</p>
                <p className="text-xs">Upload 3-8 photos to render strip</p>
              </div>
            ) : (
              photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => onEditPhoto?.(photo)}
                  className={`group relative w-full cursor-pointer transition-transform hover:scale-[1.01] ${getFrameContainerClass()}`}
                  style={{
                    backgroundColor:
                      config.style === 'polaroid'
                        ? '#ffffff'
                        : config.style === 'callmebyname'
                        ? '#dfd5cc'
                        : config.style === 'blackframe' || config.style === 'selene'
                        ? '#000000'
                        : 'transparent',
                    padding: config.style === 'polaroid' ? '10px 10px 28px 10px' : `${config.framePadding}px`,
                    boxShadow: config.style === 'polaroid' ? '0 4px 12px rgba(0,0,0,0.08)' : undefined
                  }}
                >
                  {/* Tape strip overlay for Memories Archive */}
                  {config.style === 'memoriesarchive' && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-emerald-600/80 backdrop-blur-xs rounded-xs transform -rotate-1 z-20 shadow-xs border border-emerald-500/50" />
                  )}

                  {/* Corner Ribbon Bows for Wedding Ribbon */}
                  {config.style === 'weddingribbon' && (
                    <>
                      <div className="absolute -top-2 -left-2 text-lg z-20 transform -rotate-12 drop-shadow-sm select-none">
                        🎀
                      </div>
                      <div className="absolute -top-2 -right-2 text-lg z-20 transform rotate-12 drop-shadow-sm select-none">
                        🎀
                      </div>
                    </>
                  )}

                  {/* Outer Photo Container with Aspect Ratio */}
                  <div
                    className="relative w-full overflow-hidden bg-zinc-100"
                    style={{
                      aspectRatio: config.style === 'boothycall' ? '1 / 1' : '4 / 3',
                      borderRadius: config.style === 'boothycall' ? '9999px' : `${config.photoBorderRadius}px`
                    }}
                  >
                    {/* Image with Filter */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300"
                      style={{
                        filter: filterCSS,
                        transform: `scale(${photo.zoom || 1}) rotate(${photo.rotation || 0}deg)`,
                        objectPosition: `${photo.cropX ?? 50}% ${photo.cropY ?? 50}%`
                      }}
                    />

                    {/* Fade overlay */}
                    {config.filter.fade > 0 && (
                      <div
                        className="absolute inset-0 bg-white pointer-events-none"
                        style={{ opacity: fadeOverlayOpacity }}
                      />
                    )}

                    {/* Vignette */}
                    {config.filter.vignette && (
                      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_24px_rgba(0,0,0,0.5)]" />
                    )}

                    {/* Retro 90s Timestamp */}
                    {config.style === 'retro90s' && (
                      <div className="absolute bottom-2 right-2 text-amber-500 font-mono font-bold text-xs tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {config.customDateText || "'98 08 04"}
                      </div>
                    )}

                    {/* iMessage Reaction Emojis Over Photos */}
                    {config.style === 'imessage' && (
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md rounded-full px-2 py-0.5 text-xs shadow-md border border-zinc-200 flex items-center gap-1">
                        <span>{index === 0 ? '❤️' : index === 1 ? '👍' : index === 2 ? '😮' : '🔥'}</span>
                      </div>
                    )}

                    {/* Timeline Label Pill */}
                    {config.showTimelineLabels && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/20 shadow-sm">
                        {photo.yearLabel || `Frame ${index + 1}`}
                      </div>
                    )}

                    {/* Hover Crop Hint */}
                    <div className="no-export absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <ZoomIn className="w-4 h-4" />
                      <span>Adjust Crop / Zoom</span>
                    </div>
                  </div>

                  {/* Individual Polaroid Caption */}
                  {config.style === 'polaroid' && (
                    <div className="text-center mt-2 font-handwriting text-zinc-800 text-sm font-semibold truncate px-1">
                      {photo.caption || photo.yearLabel || `Memory #${index + 1}`}
                    </div>
                  )}

                  {/* Film / Selene Frame Numbering */}
                  {(config.style === 'film' || config.style === 'selene') && (
                    <div className="flex justify-between items-center text-[9px] font-mono text-amber-500/90 pt-1 px-1">
                      <span>0{index + 1}A</span>
                      <span>{config.style === 'selene' ? 'SELENE 35MM' : `EASTMAN ${index * 3 + 12}`}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* --- SPECIAL FOOTER OVERLAYS --- */}

          {/* Boarding Pass Barcode & Pass Info Footer */}
          {config.style === 'boardingpass' && (
            <div className="w-full mt-3 p-3 bg-red-600 text-white rounded-b-xl border border-red-700 z-10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-red-500/60 pb-1">
                <span>
                  TERMINAL {config.boardingPass?.terminal || '8'} • GATE {config.boardingPass?.gate || '08'}
                </span>
                <span className="font-bold bg-white text-red-700 px-1.5 rounded">
                  SEAT {config.boardingPass?.seat || '08U'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {/* Barcode representation */}
                <div className="h-7 flex-1 bg-white p-1 rounded flex items-center justify-center gap-0.5 overflow-hidden">
                  {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3].map((w, idx) => (
                    <div key={idx} className="bg-zinc-950 h-full" style={{ width: `${w * 1.5}px` }} />
                  ))}
                </div>
                <div className="text-[9px] font-mono text-right shrink-0 opacity-90">
                  <div>PASS NO.</div>
                  <div className="font-bold">{config.ticket?.barcodeText || `#${config.boardingPass?.flightNo || '98402'}-URC`}</div>
                </div>
              </div>
            </div>
          )}

          {/* Air Mail Envelope Postmark & Note Footer */}
          {config.style === 'airmail' && (
            <div className="w-full mt-3 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-lg text-zinc-800 z-10 shadow-xs relative">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-handwriting font-bold text-red-800">
                  {config.airMail?.senderNote || config.subCaptionText || 'Sincerely, With love xoxo'}
                </div>
                {/* Circular Postmark Seal Stamp */}
                <div className="w-9 h-9 rounded-full border-2 border-rose-700/80 flex flex-col items-center justify-center text-[7px] font-mono font-bold text-rose-800 transform rotate-12 bg-white/60 shrink-0">
                  <span className="text-[7px] font-mono font-bold text-rose-800 leading-tight text-center">
                    {config.airMail?.postmarkText || 'WITH LOVE'}
                  </span>
                </div>
              </div>
              <div className="mt-1 border-t border-dashed border-amber-300 pt-1 text-[9px] font-mono text-zinc-500 flex justify-between">
                <span>{config.airMail?.parcelNo || 'PARCEL NO. 8840-02'}</span>
                <span>{config.airMail?.postDate || config.customDateText || '08.04.2026'}</span>
              </div>
            </div>
          )}

          {/* Wedding Ribbon Footer */}
          {config.style === 'weddingribbon' && (
            <div className="w-full text-center pt-3 pb-2 text-slate-100 z-10 flex flex-col items-center">
              <div className="text-lg font-handwriting text-rose-200 font-bold">
                {config.subCaptionText || 'Najla & Ridwan'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {config.customDateText || '06 Juni 2026'}
              </div>
            </div>
          )}

          {/* Memories Archive Stamp Footer */}
          {config.style === 'memoriesarchive' && (
            <div className="w-full mt-3 p-3 bg-white/90 border border-zinc-300 rounded-lg text-zinc-900 z-10 relative space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-serif font-bold text-zinc-900">
                    MADE OF MOMENTS
                  </div>
                  <div className="text-[9px] font-mono text-zinc-500">
                    {config.customDateText || 'PASS NO. 0724 0608 2024'}
                  </div>
                </div>

                {/* Circular Stamp Badge */}
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-red-600 flex flex-col items-center justify-center text-[7px] font-mono font-bold text-red-600 transform -rotate-6">
                  <span>SPECIAL</span>
                  <span>SEAL</span>
                </div>
              </div>

              {/* Barcode line */}
              <div className="h-6 w-full bg-zinc-100 p-0.5 rounded flex items-center justify-center gap-0.5 overflow-hidden border border-zinc-200">
                {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1].map((w, idx) => (
                  <div key={idx} className="bg-zinc-900 h-full" style={{ width: `${w * 1.5}px` }} />
                ))}
              </div>
            </div>
          )}

          {/* Selene Logo & Care Symbols Footer */}
          {config.style === 'selene' && (
            <div className="w-full text-center pt-4 pb-2 text-white z-10 flex flex-col items-center">
              <div className="text-2xl font-serif italic tracking-wide font-normal drop-shadow-sm flex items-center gap-1.5">
                <span>Selene</span>
                <span className="text-xs italic font-sans not-italic border border-white/40 px-1 py-0.2 rounded text-zinc-300">
                  📼
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs opacity-60 mt-1 text-zinc-400">
                <span title="Washable">🧼</span>
                <span title="Careful Cut">✂️</span>
                <span title="Do Not Bleach">❎</span>
              </div>
            </div>
          )}

          {/* Wedding Minimalist Footer */}
          {config.style === 'wedding' && (
            <div className="w-full text-center pt-4 pb-2 text-zinc-900 z-10 flex flex-col items-center">
              <div className="text-xl font-bold tracking-tight font-sans text-zinc-900">
                {config.captionText || '08.07.26'}
              </div>
              <div className="text-xs font-medium text-zinc-500 mt-0.5">
                {config.subCaptionText || 'Brooklyn & Cory'}
              </div>
            </div>
          )}

          {/* Music Player (Lavender Spotify) Footer */}
          {config.style === 'musicplayer' && (
            <div className="w-full mt-3 p-3 rounded-2xl bg-white/80 backdrop-blur-md text-zinc-900 z-10 shadow-sm border border-purple-200/60">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-xs font-bold text-zinc-900">
                    {config.musicTrack?.title || config.captionText || 'Fix You'}
                  </div>
                  <div className="text-[10px] text-zinc-600 font-medium">
                    {config.musicTrack?.artist || config.subCaptionText || 'Coldplay'}
                  </div>
                </div>
                <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
              </div>
              {/* Timeline Scrub Bar */}
              <div className="w-full bg-zinc-300 h-1 rounded-full my-2 relative">
                <div className="bg-purple-600 h-full w-2/5 rounded-full relative">
                  <div className="absolute -right-1 -top-0.5 w-2 h-2 rounded-full bg-purple-700 shadow" />
                </div>
              </div>
              {/* Playback Controls */}
              <div className="flex items-center justify-between text-zinc-700 pt-1 px-2">
                <Shuffle className="w-3 h-3 text-zinc-500" />
                <SkipBack className="w-3.5 h-3.5" />
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Pause className="w-3.5 h-3.5 fill-white" />
                </div>
                <SkipForward className="w-3.5 h-3.5" />
                <Repeat className="w-3 h-3 text-zinc-500" />
              </div>
            </div>
          )}

          {/* iOS Lockscreen Music Widget Footer */}
          {config.style === 'ioslockscreen' && (
            <div className="w-full mt-3 p-3 rounded-2xl bg-zinc-800/90 text-white z-10 border border-zinc-700/60 shadow-lg text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs">
                    {config.lockscreen?.songTitle || config.captionText || 'I Wanna Be Yours'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {config.lockscreen?.artistName || config.subCaptionText || 'Arctic Monkeys — AM'}
                  </div>
                </div>
                <div className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                  2:44
                </div>
              </div>
              {/* Scrub Bar */}
              <div className="w-full bg-zinc-700 h-1 rounded-full my-2 relative">
                <div className="bg-white h-full w-3/5 rounded-full" />
              </div>
              <div className="flex items-center justify-center gap-4 pt-1">
                <SkipBack className="w-3.5 h-3.5 fill-white" />
                <Pause className="w-4 h-4 fill-white" />
                <SkipForward className="w-3.5 h-3.5 fill-white" />
              </div>
            </div>
          )}

          {/* Spotify Dark Footer */}
          {config.style === 'spotifydark' && (
            <div className="w-full mt-3 p-3 rounded-xl bg-zinc-900 text-white z-10 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="font-bold text-xs text-white">
                    {config.musicTrack?.title || config.captionText || 'SNOOZE'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {config.musicTrack?.artist || config.subCaptionText || 'SZA'}
                  </div>
                </div>
                <Heart className="w-4 h-4 text-[#1DB954] fill-[#1DB954]" />
              </div>
              <div className="w-full bg-zinc-700 h-1 rounded-full my-2">
                <div className="bg-[#1DB954] h-full w-1/2 rounded-full" />
              </div>
              <div className="flex items-center justify-between text-zinc-400 px-1">
                <Shuffle className="w-3 h-3" />
                <SkipBack className="w-3.5 h-3.5 text-white" />
                <Pause className="w-4 h-4 text-white fill-white" />
                <SkipForward className="w-3.5 h-3.5 text-white" />
                <Repeat className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* iMessage Chat Bar Footer */}
          {config.style === 'imessage' && (
            <div className="w-full mt-3 p-2.5 rounded-2xl bg-white border border-zinc-200 text-zinc-800 z-10 shadow-sm text-xs space-y-1.5">
              <div className="text-[10px] text-zinc-400 text-center font-medium">
                1:22 AM
              </div>
              <div className="flex justify-between text-[11px] font-medium text-blue-600 px-2 py-1 border-t border-zinc-100">
                <button className="hover:underline">Reply</button>
                <button className="hover:underline">Save</button>
                <button className="text-zinc-400 hover:underline">Unsend</button>
              </div>
            </div>
          )}

          {/* Ticket Stub Barcode Footer */}
          {config.style === 'ticketstub' && (
            <div className="w-full text-center mt-3 pt-2 pb-1 text-zinc-800 z-10 bg-white/95 rounded-b-xl p-3 border-t-2 border-dashed border-zinc-300">
              <div className="text-[11px] font-mono text-zinc-600 font-bold">
                {config.customDateText || 'ROW 02 • SEAT 66'}
              </div>
              <div className="my-1.5 h-6 w-full flex items-center justify-center gap-0.5 overflow-hidden opacity-90">
                {[3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3].map((w, idx) => (
                  <div key={idx} className="bg-zinc-900 h-full" style={{ width: `${w * 2}px` }} />
                ))}
              </div>
            </div>
          )}

          {/* Snapobox Logo Footer */}
          {config.style === 'polkadot' && (
            <div className="w-full text-center pt-3 pb-1 text-white z-10">
              <div className="text-xl font-handwriting font-bold tracking-wider text-white">
                {config.captionText || 'SNAPOBOX'}
              </div>
            </div>
          )}

          {/* Editorial Footer */}
          {config.style === 'editorial' && (
            <div className="w-full text-center pt-2 text-zinc-900 font-mono text-[10px] tracking-widest z-10 border-t border-zinc-200 mt-2">
              yeppo 👧 yeppo 👧 yeppo
            </div>
          )}

          {/* Default Caption & Date Stamp (if not handled by custom overlay) */}
          {!['ioslockscreen', 'wedding', 'selene', 'editorial', 'iloveyou', 'musicplayer', 'spotifydark', 'ticketstub', 'airmail', 'boardingpass', 'weddingribbon', 'memoriesarchive', 'boothycall'].includes(config.style) && (
            <div className="w-full text-center pt-3 pb-1 z-10 flex flex-col items-center gap-0.5">
              {config.captionText && (
                <h2
                  className="text-lg sm:text-xl font-bold tracking-tight px-2"
                  style={{
                    color: getTextColorForBackground(config.background.color)
                  }}
                >
                  <TypewriterText
                    text={config.captionText}
                    mode={config.captionAnimation || 'typewriter'}
                  />
                </h2>
              )}

              {config.subCaptionText && (
                <p
                  className="text-xs font-medium opacity-80 px-2"
                  style={{
                    color: getTextColorForBackground(config.background.color)
                  }}
                >
                  <TypewriterText
                    text={config.subCaptionText}
                    mode={config.captionAnimation || 'typewriter'}
                  />
                </p>
              )}

              {config.showDateStamp && config.customDateText && (
                <div
                  className="text-[11px] font-mono tracking-widest mt-1 opacity-70"
                  style={{
                    color: getTextColorForBackground(config.background.color)
                  }}
                >
                  — {config.customDateText} —
                </div>
              )}
            </div>
          )}

          {/* Memory Card */}
          {config.memoryCard.enabled && (
            <div className="w-full mt-3 p-3.5 rounded-xl bg-white/80 backdrop-blur-md border border-zinc-200/60 text-zinc-800 shadow-sm text-xs z-10 space-y-2">
              <div className="flex items-center justify-between font-semibold border-b border-zinc-200/60 pb-1.5 text-zinc-900">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Memory Log</span>
                </span>
                {config.memoryCard.date && (
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {config.memoryCard.date}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600">
                {config.memoryCard.location && (
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">{config.memoryCard.location}</span>
                  </div>
                )}
                {config.memoryCard.song && (
                  <div className="flex items-center gap-1 truncate">
                    <Music className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{config.memoryCard.song}</span>
                  </div>
                )}
                {config.memoryCard.weather && (
                  <div className="flex items-center gap-1 truncate col-span-2">
                    <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{config.memoryCard.weather}</span>
                  </div>
                )}
              </div>

              {config.memoryCard.shortNote && (
                <p className="text-[11px] text-zinc-700 italic border-t border-zinc-200/50 pt-1.5 leading-relaxed">
                  "{config.memoryCard.shortNote}"
                </p>
              )}

              {config.memoryCard.qrEnabled && (
                <div className="flex items-center justify-between bg-zinc-100/90 rounded-lg p-2 border border-zinc-200/60">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-6 h-6 text-zinc-800" />
                    <div>
                      <div className="text-[10px] font-bold text-zinc-900">Scan for Album</div>
                      <div className="text-[9px] text-zinc-500 truncate max-w-[120px]">
                        {config.memoryCard.qrUrl || 'striply.app/share'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] font-semibold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                    QR Memory
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Placed Stickers Layer */}
          {config.stickerList.map((stk) => {
            const animClass = getStickerAnimClass(config.stickerAnimation);
            return (
              <div
                key={stk.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStickerId(stk.id);
                }}
                className={`absolute cursor-grab active:cursor-grabbing z-30 transition-shadow ${animClass} ${
                  selectedStickerId === stk.id ? 'ring-2 ring-[#FF6B6B] rounded-lg p-1 bg-white/40' : ''
                }`}
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  '--stk-scale': stk.scale,
                  '--stk-rot': `${stk.rotation}deg`,
                  transform: `translate(-50%, -50%) scale(${stk.scale}) rotate(${stk.rotation}deg)`
                } as React.CSSProperties}
              >
                <span className="text-2xl drop-shadow-md select-none">{stk.symbol}</span>

                {selectedStickerId === stk.id && (
                  <div className="no-export absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#2D2D2D] text-white rounded-full px-2 py-0.5 text-[10px] shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSticker?.(stk.id, { rotation: (stk.rotation + 45) % 360 });
                      }}
                      className="hover:text-[#FF6B6B] p-0.5"
                      title="Rotate sticker"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSticker?.(stk.id);
                      }}
                      className="hover:text-rose-400 p-0.5"
                      title="Remove sticker"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

StripCanvas.displayName = 'StripCanvas';

// Helper: Determine high contrast text color based on background hex
function getTextColorForBackground(hexColor: string): string {
  if (!hexColor || hexColor.startsWith('linear-gradient')) return '#18181b';
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#18181b';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128 ? '#f4f4f5' : '#18181b';
}

// Helper: Canvas Width based on Export Format
function getCanvasWidth(format: string): string {
  switch (format) {
    case 'strip4x6':
      return '420px';
    case 'igStory':
      return '340px';
    case 'igPost':
      return '360px';
    case 'a4Print':
      return '300px';
    case 'strip2x6':
    default:
      return '280px';
  }
}

// Helper: Pattern Background CSS
function getPatternBackground(patternName?: string, bgColor: string = '#121212'): string {
  switch (patternName) {
    case 'polka':
      return 'radial-gradient(#ffffff 2px, transparent 2px)';
    case 'bowling':
      return 'repeating-linear-gradient(90deg, #8b263e, #8b263e 20px, #38bdf8 20px, #38bdf8 28px, #1e3a8a 28px, #1e3a8a 40px)';
    case 'dots':
      return 'radial-gradient(#f472b6 1.5px, transparent 1.5px)';
    case 'hearts':
      return 'radial-gradient(#fda4af 1.5px, transparent 1.5px)';
    case 'grid':
    default:
      return 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)';
  }
}
