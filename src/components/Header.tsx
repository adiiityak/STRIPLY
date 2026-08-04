import React from 'react';
import { Camera, Sparkles, Shuffle, Download, Image as ImageIcon, Video, RefreshCw, Share2, Coffee, Compass, Heart } from 'lucide-react';
import { SAMPLE_PHOTO_SETS, SampleSet } from '../data/samplePhotos';

const SAMPLE_SET_ICONS: Record<string, React.ReactNode> = {
  korean_cafe: <Coffee className="w-3.5 h-3.5 text-pink-500" />,
  summer_roadtrip: <Compass className="w-3.5 h-3.5 text-amber-500" />,
  wedding_day: <Heart className="w-3.5 h-3.5 text-rose-500" />,
  vintage_polaroid: <Camera className="w-3.5 h-3.5 text-sky-500" />
};

interface HeaderProps {
  onLoadSampleSet: (set: SampleSet) => void;
  onOpenWebcam: () => void;
  onShuffleLayout: () => void;
  onQuickExportPNG: () => void;
  onOpenShareModal: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSampleSet,
  onOpenWebcam,
  onShuffleLayout,
  onQuickExportPNG,
  onOpenShareModal,
  isExporting
}) => {
  const [showSamplesMenu, setShowSamplesMenu] = React.useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#E8E6DF] text-[#2D2D2D] sticky top-0 z-40 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center shadow-md transform -rotate-6">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tighter text-[#FF6B6B]">
                STRIPLY
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-[#FFF5F5] text-[#FF6B6B] border border-[#FF6B6B]/20 px-2.5 py-0.5 rounded-full">
                Photo Booth
              </span>
            </div>
            <p className="text-xs text-[#666666] hidden sm:block">
              Vintage & modern photo booth strips in seconds
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Sample Preset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSamplesMenu(!showSamplesMenu)}
              className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE9] text-[#2D2D2D] text-xs font-semibold border border-[#E8E6DF] transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              title="Load demo photo sets"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#FF6B6B]" />
              <span>Sample Photos</span>
            </button>

            {showSamplesMenu && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white border border-[#E8E6DF] rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setShowSamplesMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#AAAAAA]">
                  Load Preset Photos
                </div>
                {SAMPLE_PHOTO_SETS.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => onLoadSampleSet(set)}
                    className="w-full px-3 py-2 text-left text-[#2D2D2D] hover:bg-[#FFF5F5] hover:text-[#FF6B6B] flex items-center gap-2 transition-colors font-medium cursor-pointer"
                  >
                    <span>{SAMPLE_SET_ICONS[set.id] || <Sparkles className="w-3.5 h-3.5 text-amber-500" />}</span>
                    <span>{set.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Web Cam Photobooth Button */}
          <button
            onClick={onOpenWebcam}
            className="px-3.5 py-2 rounded-xl bg-[#FFF5F5] hover:bg-[#FFE8E8] text-[#FF6B6B] text-xs font-semibold border border-[#FF6B6B]/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Snap photos with live webcam"
          >
            <Video className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span>Web Booth</span>
          </button>

          {/* Shuffle Layout Button */}
          <button
            onClick={onShuffleLayout}
            className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE9] text-[#2D2D2D] text-xs font-semibold border border-[#E8E6DF] transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Shuffle layout & stickers"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#4ECDC4]" />
            <span className="hidden md:inline">Shuffle</span>
          </button>

          {/* Direct Social Share Button */}
          <button
            onClick={onOpenShareModal}
            className="px-3.5 py-2 rounded-xl bg-[#FFF5F5] hover:bg-[#FFE8E8] text-[#FF6B6B] text-xs font-bold border border-[#FF6B6B]/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Share strip directly to social media"
          >
            <Share2 className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span>Share</span>
          </button>

          {/* Quick Export Button */}
          <button
            onClick={onQuickExportPNG}
            disabled={isExporting}
            className="px-5 py-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
