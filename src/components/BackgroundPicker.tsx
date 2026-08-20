import React from 'react';
import type { SharedBackground } from '../remote/types';

/**
 * Backgrounds for the live booth.
 *
 * These point at /pattern-backgrounds/, the raw repeating tiles. The previous
 * three pointed at /template-previews/, which holds four-photo strip mockups --
 * so the "background" behind two people carried photo-strip frames, and the
 * swatches in the picker showed little framed cards instead of the pattern.
 */
export const PRESETS = [
  { name: 'Pink hearts', value: '/pattern-backgrounds/pink-heart-tunnel.png' },
  { name: 'Blue hearts', value: '/pattern-backgrounds/blue-heart-tunnel.png' },
  { name: 'Teal swirl', value: '/pattern-backgrounds/teal-contours.png' },
  { name: 'Blue waves', value: '/pattern-backgrounds/blue-waves.png' },
  { name: 'Burgundy swirl', value: '/pattern-backgrounds/burgundy-waves.png' },
  { name: 'Wavy checker', value: '/pattern-backgrounds/wavy-checker.png' },
  { name: 'Sunflowers', value: '/pattern-backgrounds/sunflowers.png' }
];

interface BackgroundPickerProps {
  value: SharedBackground;
  onChange: (value: SharedBackground) => void;
  onUpload?: (file: File) => void;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({ value, onChange, onUpload }) => (
  <div className="min-w-0 space-y-1.5 lg:space-y-2">
    <div
      data-testid="background-primary-actions"
      className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.55fr)_minmax(0,.8fr)] gap-1.5 lg:gap-2"
    >
      <button
        aria-pressed={value.mode === 'original'}
        onClick={() => onChange({ mode: 'original' })}
        className="min-h-11 min-w-0 rounded-xl border px-1.5 py-2 text-[10px] font-bold aria-pressed:border-[#FF6B6B] aria-pressed:bg-[#FFF5F5] sm:text-[11px]"
      >
        Original
      </button>
      <button
        aria-pressed={value.mode === 'removed'}
        onClick={() => onChange({ mode: 'removed' })}
        className="min-h-11 min-w-0 rounded-xl border px-1.5 py-2 text-[10px] font-bold leading-tight aria-pressed:border-[#FF6B6B] aria-pressed:bg-[#FFF5F5] sm:text-[11px]"
      >
        Remove background
      </button>
      <label className="flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-xl border px-1.5 py-2 text-[10px] font-bold sm:text-[11px]">
        Upload
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => event.target.files?.[0] && onUpload?.(event.target.files[0])}
        />
      </label>
    </div>

    <div data-testid="background-preset-grid" className="grid grid-cols-5 gap-1.5 lg:gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          aria-label={preset.name}
          aria-pressed={value.mode === 'preset' && value.value === preset.value}
          onClick={() => onChange({ mode: 'preset', value: preset.value })}
          className="h-11 min-w-0 overflow-hidden rounded-xl border-2 bg-[#FAF9F6] aria-pressed:border-[#FF6B6B]"
          style={{ backgroundImage: `url(${preset.value})`, backgroundSize: 'cover' }}
        />
      ))}
    </div>
    <p className="hidden text-[10px] text-[#777] lg:block">One shared background. Changes from either person sync instantly.</p>
  </div>
);
