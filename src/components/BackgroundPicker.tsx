import React from 'react';
import type { SharedBackground } from '../remote/types';

const PRESETS = [
  { name: 'Love notes', value: '/template-previews/pattern-love-notes.png' },
  { name: 'Blue hearts', value: '/template-previews/pattern-blue-heart-tunnel.png' },
  { name: 'Sunflowers', value: '/template-previews/pattern-sunflowers.png' }
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
