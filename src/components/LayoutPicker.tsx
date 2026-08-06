import type { PhotoLayout } from '../types';
import { GUIDED_LAYOUTS, isLayoutSupported } from '../utils/photoLayout';

interface LayoutPickerProps {
  value: PhotoLayout;
  supportedLayouts: readonly PhotoLayout[];
  onChange: (layout: PhotoLayout) => void;
}

const LAYOUT_DETAILS: Record<PhotoLayout, { label: string; name: string }> = {
  'vertical-1x4': {
    label: '1 × 4',
    name: '1 by 4 vertical strip'
  },
  'grid-2x2': {
    label: '2 × 2',
    name: '2 by 2 grid'
  }
};

export function LayoutPicker({ value, supportedLayouts, onChange }: LayoutPickerProps) {
  const supportsGrid = isLayoutSupported('grid-2x2', supportedLayouts);

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
        Photo Layout
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {GUIDED_LAYOUTS.map((layout) => {
          const supported = isLayoutSupported(layout, supportedLayouts);
          const cells = layout === 'vertical-1x4'
            ? 'grid grid-cols-1 grid-rows-4'
            : 'grid grid-cols-2 grid-rows-2';

          return (
            <button
              key={layout}
              type="button"
              data-testid={`layout-${layout}`}
              aria-label={LAYOUT_DETAILS[layout].name}
              aria-pressed={value === layout}
              disabled={!supported}
              onClick={() => onChange(layout)}
              className={`min-h-28 rounded-xl border p-3 transition-all flex flex-col items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                value === layout
                  ? 'border-2 border-[#FF6B6B] bg-[#FFF5F5] text-[#FF6B6B]'
                  : 'border-[#E8E6DF] bg-white text-[#666666] hover:bg-[#FAF9F6]'
              }`}
            >
              <span aria-hidden className={`${cells} h-16 w-12 gap-1 rounded-md bg-[#2D2D2D] p-1`}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index} className="rounded-[2px] bg-white" />
                ))}
              </span>
              <span className="text-xs font-black">{LAYOUT_DETAILS[layout].label}</span>
            </button>
          );
        })}
      </div>
      {!supportsGrid && (
        <p className="text-[11px] text-[#666666]">
          This template supports the vertical strip only.
        </p>
      )}
    </fieldset>
  );
}
