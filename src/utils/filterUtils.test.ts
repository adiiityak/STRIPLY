import { describe, expect, it } from 'vitest';
import type { FilterSettings } from '../types';
import { getFadeOpacity, getFilterCSS, getGrainOpacity } from './filterUtils';

const settings = (overrides: Partial<FilterSettings> = {}): FilterSettings =>
  ({
    preset: 'normal',
    contrast: 100,
    brightness: 100,
    warmth: 0,
    grain: 0,
    fade: 0,
    vignette: false,
    dustOverlay: false,
    lightLeak: false,
    ...overrides
  }) as FilterSettings;

describe('getGrainOpacity', () => {
  it('shows no grain at zero', () => {
    expect(getGrainOpacity(settings({ grain: 0 }))).toBe(0);
  });

  // A strength dial, not an alpha value: grain at full opacity would bury the photo.
  it('caps grain well below opaque', () => {
    expect(getGrainOpacity(settings({ grain: 100 }))).toBe(0.45);
  });

  it('scales in proportion to the slider', () => {
    expect(getGrainOpacity(settings({ grain: 20 }))).toBeCloseTo(0.09, 6);
  });
});

describe('getFilterCSS', () => {
  it('drains all colour for black and white', () => {
    expect(getFilterCSS(settings({ preset: 'bwNoir' }))).toContain('saturate(0)');
  });

  // Warmth rides on sepia going up and hue-rotate going down, so the two
  // directions are not symmetrical.
  it('warms through sepia and cools through hue', () => {
    expect(getFilterCSS(settings({ warmth: 100 }))).toContain('sepia(0.3)');
    expect(getFilterCSS(settings({ warmth: -100 }))).toContain('hue-rotate(-20deg)');
  });
});

describe('getFadeOpacity', () => {
  it('scales the wash to a quarter at most', () => {
    expect(getFadeOpacity(settings({ fade: 100 }))).toBe(0.25);
    expect(getFadeOpacity(settings({ fade: 10 }))).toBeCloseTo(0.025, 6);
  });
});
