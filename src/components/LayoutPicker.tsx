import type { PhotoLayout } from '../types';
import { GUIDED_LAYOUTS, getGuidedSlotCount, isLayoutSupported } from '../utils/photoLayout';

interface LayoutPickerProps {
  value: PhotoLayout;
  supportedLayouts: readonly PhotoLayout[];
  onChange: (layout: PhotoLayout) => void;
}

const LAYOUT_DETAILS: Record<PhotoLayout, { label: string; name: string }> = {
  'vertical-1x2': {
    label: '1 × 2',
    name: '1 by 2 vertical strip'
  },
  'vertical-1x3': {
    label: '1 × 3',
    name: '1 by 3 vertical strip'
  },
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GUIDED_LAYOUTS.map((layout) => {
          const supported = isLayoutSupported(layout, supportedLayouts);
          const slots = getGuidedSlotCount(layout);
          // Written out rather than interpolated: Tailwind only emits classes it
          // can see in the source, so `grid-rows-${slots}` would produce nothing.
          const cells =
            layout === 'grid-2x2'
              ? 'grid grid-cols-2 grid-rows-2'
              : slots === 2
                ? 'grid grid-cols-1 grid-rows-2'
                : slots === 3
                  ? 'grid grid-cols-1 grid-rows-3'
                  : 'grid grid-cols-1 grid-rows-4';

          return (
            <button
              key={layout}
              type="button"
              data-testid={`layout-${layout}`}
              aria-label={LAYOUT_DETAILS[layout].name}
              aria-pressed={value === layout}
              disabled={!supported}
              onClick={() => onChange(layout)}
              className={`min-h-24 rounded-xl border p-2.5 sm:min-h-28 sm:p-3 transition-all flex flex-col items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                value === layout
                  ? 'border-2 border-[#FF6B6B] bg-[#FFF5F5] text-[#FF6B6B]'
                  : 'border-[#E8E6DF] bg-white text-[#666666] hover:bg-[#FAF9F6]'
              }`}
            >
              <span aria-hidden className={`${cells} h-16 w-12 gap-1 rounded-md bg-[#2D2D2D] p-1`}>
                {Array.from({ length: slots }, (_, index) => (
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
