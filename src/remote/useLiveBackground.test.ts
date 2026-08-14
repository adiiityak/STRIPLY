import { describe, expect, it } from 'vitest';
import { backgroundImageUrl } from './useLiveBackground';

describe('backgroundImageUrl', () => {
  it('uses the chosen preset image', () => {
    expect(backgroundImageUrl({ mode: 'preset', value: '/pattern-backgrounds/blue-waves.png' })).toBe(
      '/pattern-backgrounds/blue-waves.png'
    );
  });

  it('uses an uploaded image', () => {
    expect(backgroundImageUrl({ mode: 'uploaded', value: 'data:image/jpeg;base64,AAA' })).toBe(
      'data:image/jpeg;base64,AAA'
    );
  });

  // 'removed' still needs the segmentation pass, just onto a plain backdrop
  // rather than an image, so a null URL is meaningful rather than "off".
  it('has no image for a plain cut-out', () => {
    expect(backgroundImageUrl({ mode: 'removed' })).toBeNull();
  });

  it('has no image for an untouched feed', () => {
    expect(backgroundImageUrl({ mode: 'original' })).toBeNull();
  });
});
