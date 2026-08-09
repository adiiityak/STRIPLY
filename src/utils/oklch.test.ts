import { describe, it, expect } from 'vitest';
import { oklabToRgbString, oklchToRgbString, replaceOklchInValue } from './oklch';

describe('oklchToRgbString', () => {
  it('matches Tailwind zinc-900, whose hex equivalent is #18181b', () => {
    expect(oklchToRgbString(0.21, 0.006, 285.885)).toBe('rgb(24, 24, 27)');
  });

  it('matches Tailwind red-400, whose hex equivalent is #ff6467', () => {
    expect(oklchToRgbString(0.704, 0.191, 22.216)).toBe('rgb(255, 100, 103)');
  });

  it('converts pure white and pure black exactly', () => {
    expect(oklchToRgbString(1, 0, 0)).toBe('rgb(255, 255, 255)');
    expect(oklchToRgbString(0, 0, 0)).toBe('rgb(0, 0, 0)');
  });

  it('emits rgba when an alpha below 1 is supplied', () => {
    expect(oklchToRgbString(0.704, 0.191, 22.216, 0.6)).toBe('rgba(255, 100, 103, 0.6)');
  });

  it('clamps channels that fall outside the sRGB gamut', () => {
    const rgb = oklchToRgbString(0.9, 0.4, 140);
    const channels = rgb.match(/\d+/g)!.map(Number);
    for (const channel of channels) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe('replaceOklchInValue', () => {
  it('replaces a bare colour', () => {
    expect(replaceOklchInValue('oklch(0.21 0.006 285.885)')).toBe('rgb(24, 24, 27)');
  });

  it('replaces the slash-alpha form', () => {
    expect(replaceOklchInValue('oklch(0.704 0.191 22.216 / 0.6)')).toBe('rgba(255, 100, 103, 0.6)');
  });

  it('accepts a percentage lightness', () => {
    expect(replaceOklchInValue('oklch(21% 0.006 285.885)')).toBe('rgb(24, 24, 27)');
  });

  it('replaces every occurrence inside a gradient, keeping the rest of the value', () => {
    const out = replaceOklchInValue(
      'linear-gradient(to bottom, oklch(0.21 0.006 285.885), oklch(1 0 0))'
    );
    expect(out).toBe('linear-gradient(to bottom, rgb(24, 24, 27), rgb(255, 255, 255))');
  });

  it('leaves values without oklch untouched', () => {
    expect(replaceOklchInValue('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
    expect(replaceOklchInValue('none')).toBe('none');
  });

  it('leaves a malformed oklch alone rather than emitting NaN', () => {
    expect(replaceOklchInValue('oklch(garbage)')).toBe('oklch(garbage)');
  });

  // Tailwind compiles opacity modifiers such as `bg-amber-50/90` to oklab, so both functions
  // have to be handled or html2canvas still throws on the first one it meets.
  it('replaces oklab, including its slash-alpha form', () => {
    expect(replaceOklchInValue('oklab(0.962 -0.00577481 0.0587167 / 0.9)')).toMatch(
      /^rgba\(\d+, \d+, \d+, 0\.9\)$/
    );
  });

  it('replaces a value containing both functions', () => {
    const out = replaceOklchInValue('oklch(0.21 0.006 285.885) oklab(1 0 0)');
    expect(out).toBe('rgb(24, 24, 27) rgb(255, 255, 255)');
  });
});

describe('oklabToRgbString', () => {
  it('agrees with oklch for the same colour expressed either way', () => {
    const viaLch = oklchToRgbString(0.704, 0.191, 22.216);
    const hue = (22.216 * Math.PI) / 180;
    const viaLab = oklabToRgbString(0.704, 0.191 * Math.cos(hue), 0.191 * Math.sin(hue));
    expect(viaLab).toBe(viaLch);
  });
});
