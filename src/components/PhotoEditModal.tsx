import React from 'react';
import { PhotoItem } from '../types';
import { X, RotateCw, ZoomIn, MoveHorizontal, MoveVertical, Trash2, Check, Sparkles } from 'lucide-react';

interface PhotoEditModalProps {
  photo: PhotoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPhoto: PhotoItem) => void;
  onDelete: (photoId: string) => void;
}

export const PhotoEditModal: React.FC<PhotoEditModalProps> = ({
  photo,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  if (!isOpen || !photo) return null;

  const [cropX, setCropX] = React.useState<number>(photo.cropX ?? 50);
  const [cropY, setCropY] = React.useState<number>(photo.cropY ?? 50);
  const [zoom, setZoom] = React.useState<number>(photo.zoom ?? 1);
  const [rotation, setRotation] = React.useState<number>(photo.rotation ?? 0);

  /**
   * Shape of a real photo slot in the strip.
   *
   * The preview was a fixed 4:3, the same shape as a webcam photo, so object-fit
   * had nothing to crop and the position sliders moved nothing on screen -- the
   * change only became visible after Apply, in a strip slot that is a different
   * shape. Matching the slot makes the preview crop exactly as the strip does.
   */
  const [slotAspect, setSlotAspect] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const slot = document.querySelector('[data-photo-slot]');
    const rect = slot?.getBoundingClientRect();
    setSlotAspect(rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : null);
  }, [isOpen]);
  const [caption, setCaption] = React.useState<string>(photo.caption || '');
  const [yearLabel, setYearLabel] = React.useState<string>(photo.yearLabel || '');

  const handleSave = () => {
    onSave({
      ...photo,
      cropX,
      cropY,
      zoom,
      rotation,
      caption,
      yearLabel
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2D]/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-edit-title"
        className="bg-white border border-[#E8E6DF] rounded-none sm:rounded-3xl max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] text-[#2D2D2D] shadow-2xl relative flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-[#E8E6DF] bg-white">
          <h3 id="photo-edit-title" className="font-bold text-base text-[#2D2D2D] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF6B6B]" />
            <span>Adjust Photo</span>
          </h3>
          <button
            type="button"
            aria-label="Close photo controls"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6DF] text-[#666666] hover:text-[#2D2D2D] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div data-testid="photo-edit-scroll-area" className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">

        {/* Live Preview Frame */}
        <div
          className="mt-4 bg-[#FAF9F6] rounded-2xl overflow-hidden border border-[#E8E6DF] relative flex items-center justify-center"
          style={{ aspectRatio: slotAspect ?? '4 / 3' }}
        >
          <img
            src={photo.url}
            alt="Edit target"
            className="w-full h-full object-cover transition-transform duration-150"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              objectPosition: `${cropX}% ${cropY}%`
            }}
          />
        </div>

        {/* Sliders & Controls */}
        <div className="mt-4 space-y-3 text-xs">
          {/* Zoom Slider */}
          <div>
            <div className="flex justify-between text-[#666666] font-semibold mb-1">
              <span className="flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-[#FF6B6B]" /> Zoom
              </span>
              <span className="text-[#2D2D2D]">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[#FF6B6B] bg-[#E8E6DF] rounded-lg cursor-pointer"
            />
          </div>

          {/* Focal Position X (Left - Right) */}
          <div>
            <div className="flex justify-between text-[#666666] font-semibold mb-1">
              <span className="flex items-center gap-1">
                <MoveHorizontal className="w-3.5 h-3.5 text-[#FF6B6B]" /> Move left / right
              </span>
              <span className="text-[#2D2D2D]">{cropX}%</span>
            </div>
            <input
              type="range"
              aria-label="Move left or right"
              min="0"
              max="100"
              value={cropX}
              onChange={(e) => setCropX(parseInt(e.target.value))}
              className="w-full accent-[#FF6B6B] bg-[#E8E6DF] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#999]">
              <span>Left</span>
              <span>Right</span>
            </div>
          </div>

          {/* Focal Position Y (Top - Bottom) */}
          <div>
            <div className="flex justify-between text-[#666666] font-semibold mb-1">
              <span className="flex items-center gap-1">
                <MoveVertical className="w-3.5 h-3.5 text-[#FF6B6B]" /> Move up / down
              </span>
              <span className="text-[#2D2D2D]">{cropY}%</span>
            </div>
            <input
              type="range"
              aria-label="Move up or down"
              min="0"
              max="100"
              value={cropY}
              onChange={(e) => setCropY(parseInt(e.target.value))}
              className="w-full accent-[#FF6B6B] bg-[#E8E6DF] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#999]">
              <span>Top</span>
              <span>Bottom</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCropX(50);
              setCropY(50);
            }}
            className="text-[11px] font-semibold text-[#FF6B6B] underline underline-offset-2"
          >
            Recentre photo
          </button>

          {/* Rotation Buttons */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#666666] font-semibold">Rotation:</span>
            <div className="flex items-center gap-2">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRotation(deg)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-colors ${
                    rotation === deg
                      ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                      : 'bg-[#FAF9F6] text-[#666666] border-[#E8E6DF] hover:bg-[#E8E6DF]'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Photo Caption Input */}
          <div className="pt-1">
            <label className="block text-[#666666] mb-1 font-semibold">Individual Photo Caption:</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Coffee Date ☕"
              className="w-full bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl px-3 py-2 text-[#2D2D2D] font-medium focus:outline-none focus:border-[#FF6B6B]"
            />
          </div>

          {/* Timeline Year Label Input */}
          <div>
            <label className="block text-[#666666] mb-1 font-semibold">Timeline Label / Year:</label>
            <input
              type="text"
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
              placeholder="e.g. 2024 or Day 1"
              className="w-full bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl px-3 py-2 text-[#2D2D2D] font-medium focus:outline-none focus:border-[#FF6B6B]"
            />
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="mt-5 pt-3 border-t border-[#E8E6DF] flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onDelete(photo.id);
              onClose();
            }}
            className="px-3 py-2 bg-[#FFF5F5] hover:bg-[#FFE8E8] text-[#FF6B6B] border border-[#FF6B6B]/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Photo</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-[#FAF9F6] hover:bg-[#E8E6DF] text-[#666666] rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
