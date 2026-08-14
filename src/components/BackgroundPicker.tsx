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
  <div className="space-y-2">
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        aria-pressed={value.mode === 'original'}
        onClick={() => onChange({ mode: 'original' })}
        className="shrink-0 rounded-xl border px-3 py-2 text-[11px] font-bold aria-pressed:border-[#FF6B6B] aria-pressed:bg-[#FFF5F5]"
      >
        Original
      </button>
      <button
        aria-pressed={value.mode === 'removed'}
        onClick={() => onChange({ mode: 'removed' })}
        className="shrink-0 rounded-xl border px-3 py-2 text-[11px] font-bold aria-pressed:border-[#FF6B6B] aria-pressed:bg-[#FFF5F5]"
      >
        Remove background
      </button>
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          aria-label={preset.name}
          aria-pressed={value.mode === 'preset' && value.value === preset.value}
          onClick={() => onChange({ mode: 'preset', value: preset.value })}
          className="h-10 w-14 shrink-0 overflow-hidden rounded-xl border-2 aria-pressed:border-[#FF6B6B]"
          style={{ backgroundImage: `url(${preset.value})`, backgroundSize: 'cover' }}
        />
      ))}
      <label className="shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-[11px] font-bold">
        Upload
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => event.target.files?.[0] && onUpload?.(event.target.files[0])}
        />
      </label>
    </div>
    <p className="text-[10px] text-[#777]">One shared background. Changes from either person sync instantly.</p>
  </div>
);
