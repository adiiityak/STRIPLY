import React from 'react';
import { Camera, Shuffle, Download, Video, RefreshCw, Share2, BookmarkPlus } from 'lucide-react';

interface HeaderProps {
  onOpenWebcam: () => void;
  onShuffleLayout: () => void;
  onQuickExportPNG: () => void;
  onOpenShareModal: () => void;
  isExporting: boolean;
  /** Omitted entirely when accounts are not configured for this deployment. */
  onOpenSavedStrips?: () => void;
  accountPicture?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWebcam,
  onShuffleLayout,
  onQuickExportPNG,
  onOpenShareModal,
  isExporting,
  onOpenSavedStrips,
  accountPicture
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#E8E6DF] text-[#2D2D2D] sticky top-0 z-40 px-3 py-2 lg:px-4 lg:py-3 shadow-xs shrink-0">
      <div className="max-w-7xl mx-auto flex flex-nowrap lg:flex-wrap items-center justify-between gap-2 lg:gap-3">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <div className="w-8 h-8 lg:w-10 lg:h-10 shrink-0 bg-[#FF6B6B] rounded-xl flex items-center justify-center shadow-md transform -rotate-6">
            <Camera className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-black tracking-tighter text-[#FF6B6B]">
                STRIPLY
              </h1>
              <span className="hidden lg:inline-flex text-[10px] font-bold tracking-wider uppercase bg-[#FFF5F5] text-[#FF6B6B] border border-[#FF6B6B]/20 px-2.5 py-0.5 rounded-full">
                Photo Booth
              </span>
            </div>
            <p className="text-xs text-[#666666] hidden sm:block">
              Vintage & modern photo booth strips in seconds
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-1.5 lg:gap-2 flex-nowrap lg:flex-wrap ml-auto shrink-0">
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

          {/* Saved strips. Absent unless this deployment has accounts configured. */}
          {onOpenSavedStrips && (
            <button
              onClick={onOpenSavedStrips}
              className="px-3.5 py-2.5 lg:py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE9] text-[#2D2D2D] text-xs font-semibold border border-[#E8E6DF] transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              title="My saved strips"
              aria-label="My strips"
            >
              {accountPicture ? (
                <img src={accountPicture} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5 text-[#FF6B6B]" />
              )}
              <span className="hidden sm:inline">My strips</span>
            </button>
          )}

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
