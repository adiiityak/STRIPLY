import type { PhotoLayout, StripConfiguration } from '../types';

export const GUIDED_LAYOUTS: readonly PhotoLayout[] = [
  'vertical-1x2',
  'vertical-1x3',
  'vertical-1x4',
  'grid-2x2'
];

/** Slots in each guided layout. */
const SLOT_COUNTS: Record<PhotoLayout, 2 | 3 | 4> = {
  'vertical-1x2': 2,
  'vertical-1x3': 3,
  'vertical-1x4': 4,
  'grid-2x2': 4
};

export function normalizePhotoLayout(value: unknown): PhotoLayout {
  return typeof value === 'string' && value in SLOT_COUNTS ? (value as PhotoLayout) : 'vertical-1x4';
}

export function getGuidedSlotCount(layout: PhotoLayout): 2 | 3 | 4 {
  return SLOT_COUNTS[layout] ?? 4;
}

export function isLayoutSupported(
  layout: PhotoLayout,
  supportedLayouts: readonly PhotoLayout[]
): boolean {
  if (supportedLayouts.includes(layout)) return true;
  // The vertical strips are one shape with fewer slots, so a template that takes
  // 1x4 takes the shorter ones too. Only the grid is a genuine opt-in, because it
  // rearranges the artwork.
  return layout.startsWith('vertical-') && supportedLayouts.includes('vertical-1x4');
}

export function applyPhotoLayout(
  config: StripConfiguration,
  layout: PhotoLayout
): StripConfiguration {
  return {
    ...config,
    photoLayout: layout,
    photoCount: getGuidedSlotCount(layout),
    exportFormat: layout === 'grid-2x2' ? 'strip4x6' : 'strip2x6'
  };
}
