import React from 'react';
import { Camera, Shuffle, Download, Video, RefreshCw, Share2 } from 'lucide-react';

interface HeaderProps {
  onOpenWebcam: () => void;
  onShuffleLayout: () => void;
  onQuickExportPNG: () => void;
  onOpenShareModal: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWebcam,
  onShuffleLayout,
  onQuickExportPNG,
  onOpenShareModal,
  isExporting
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#E8E6DF] text-[#2D2D2D] sticky top-0 z-40 px-4 py-3 shadow-xs shrink-0">
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
          {/* Web Cam Photobooth Button */}
          <button
            onClick={onOpenWebcam}
            className="px-3.5 py-2.5 lg:py-2 rounded-xl bg-[#FFF5F5] hover:bg-[#FFE8E8] text-[#FF6B6B] text-xs font-semibold border border-[#FF6B6B]/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Snap photos with live webcam"
            aria-label="Web Booth"
          >
            <Video className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span className="hidden sm:inline">Web Booth</span>
          </button>

          {/* Shuffle Layout Button */}
          <button
            onClick={onShuffleLayout}
            className="px-3.5 py-2.5 lg:py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE9] text-[#2D2D2D] text-xs font-semibold border border-[#E8E6DF] transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Shuffle layout & stickers"
            aria-label="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#4ECDC4]" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>

          {/* Direct Social Share Button */}
          <button
            onClick={onOpenShareModal}
            className="px-3.5 py-2.5 lg:py-2 rounded-xl bg-[#FFF5F5] hover:bg-[#FFE8E8] text-[#FF6B6B] text-xs font-bold border border-[#FF6B6B]/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Share strip directly to social media"
            aria-label="Share"
          >
            <Share2 className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Quick Export Button */}
          <button
            onClick={onQuickExportPNG}
            disabled={isExporting}
            className="px-5 py-2.5 lg:py-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
            aria-label="Export"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
