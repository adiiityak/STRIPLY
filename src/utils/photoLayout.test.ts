import { describe, expect, it } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import {
  GUIDED_LAYOUTS,
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

describe('shorter vertical strips', () => {
  it('offers 1x2 and 1x3 alongside the originals', () => {
    expect(GUIDED_LAYOUTS).toEqual(['vertical-1x2', 'vertical-1x3', 'vertical-1x4', 'grid-2x2']);
  });

  it('counts slots per layout rather than always four', () => {
    expect(getGuidedSlotCount('vertical-1x2')).toBe(2);
    expect(getGuidedSlotCount('vertical-1x3')).toBe(3);
    expect(getGuidedSlotCount('vertical-1x4')).toBe(4);
    expect(getGuidedSlotCount('grid-2x2')).toBe(4);
  });

  it('sets photoCount to match the chosen layout', () => {
    const base = TEMPLATE_DEFINITIONS[0].config;
    expect(applyPhotoLayout(base, 'vertical-1x2').photoCount).toBe(2);
    expect(applyPhotoLayout(base, 'vertical-1x3').photoCount).toBe(3);
    expect(applyPhotoLayout(base, 'vertical-1x4').photoCount).toBe(4);
  });

  it('keeps the tall export format for every vertical strip', () => {
    const base = TEMPLATE_DEFINITIONS[0].config;
    expect(applyPhotoLayout(base, 'vertical-1x2').exportFormat).toBe('strip2x6');
    expect(applyPhotoLayout(base, 'vertical-1x3').exportFormat).toBe('strip2x6');
    expect(applyPhotoLayout(base, 'grid-2x2').exportFormat).toBe('strip4x6');
  });

  // A template that takes the 1x4 strip takes the shorter ones: same shape, fewer
  // slots. Only the grid rearranges the artwork, so only it is a real opt-in.
  it('treats a 1x4 template as supporting the shorter strips', () => {
    expect(isLayoutSupported('vertical-1x2', ['vertical-1x4'])).toBe(true);
    expect(isLayoutSupported('vertical-1x3', ['vertical-1x4'])).toBe(true);
    expect(isLayoutSupported('grid-2x2', ['vertical-1x4'])).toBe(false);
  });

  it('normalises the new values and rejects nonsense', () => {
    expect(normalizePhotoLayout('vertical-1x2')).toBe('vertical-1x2');
    expect(normalizePhotoLayout('vertical-1x3')).toBe('vertical-1x3');
    expect(normalizePhotoLayout('vertical-1x9')).toBe('vertical-1x4');
    expect(normalizePhotoLayout(undefined)).toBe('vertical-1x4');
  });
});
