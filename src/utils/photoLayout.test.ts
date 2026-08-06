import { describe, expect, it } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import {
  applyPhotoLayout,
  getGuidedSlotCount,
  isLayoutSupported,
  normalizePhotoLayout
} from './photoLayout';

describe('photo layout domain', () => {
  it('falls back to the vertical layout for unknown stored values', () => {
    expect(normalizePhotoLayout('diagonal')).toBe('vertical-1x4');
  });

  it('uses four slots for both guided layouts', () => {
    expect(getGuidedSlotCount('vertical-1x4')).toBe(4);
    expect(getGuidedSlotCount('grid-2x2')).toBe(4);
  });

  it('sets grid layout, four photos, and the 4×6 export format together', () => {
    const next = applyPhotoLayout(TEMPLATE_DEFINITIONS[0].config, 'grid-2x2');
    expect(next.photoLayout).toBe('grid-2x2');
    expect(next.photoCount).toBe(4);
    expect(next.exportFormat).toBe('strip4x6');
  });

  it('reports unsupported grid layouts', () => {
    expect(isLayoutSupported('grid-2x2', ['vertical-1x4'])).toBe(false);
  });

  it('declares layout support for every template', () => {
    expect(TEMPLATE_DEFINITIONS.every((template) => template.supportedLayouts.length > 0)).toBe(true);
  });
});
