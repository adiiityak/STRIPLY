import type { PhotoLayout, StripConfiguration } from '../types';

export const GUIDED_LAYOUTS: readonly PhotoLayout[] = ['vertical-1x4', 'grid-2x2'];

export function normalizePhotoLayout(value: unknown): PhotoLayout {
  return value === 'grid-2x2' ? 'grid-2x2' : 'vertical-1x4';
}

export function getGuidedSlotCount(_layout: PhotoLayout): 4 {
  return 4;
}

export function isLayoutSupported(
  layout: PhotoLayout,
  supportedLayouts: readonly PhotoLayout[]
): boolean {
  return supportedLayouts.includes(layout);
}

export function applyPhotoLayout(
  config: StripConfiguration,
  layout: PhotoLayout
): StripConfiguration {
  return {
    ...config,
    photoLayout: layout,
    photoCount: 4,
    exportFormat: layout === 'grid-2x2' ? 'strip4x6' : 'strip2x6'
  };
}
