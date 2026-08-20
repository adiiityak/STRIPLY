import { createElement, Fragment, useRef } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backgroundImageUrl, useLiveBackground } from './useLiveBackground';
import { startLiveBackground } from './liveBackground';
import type { SharedBackground } from './types';

const stop = vi.fn();
const updateBackground = vi.fn();

vi.mock('./liveBackground', () => ({
  startLiveBackground: vi.fn(() => ({ stop, updateBackground }))
}));

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe('useLiveBackground', () => {
  it('switches the image without restarting the segmentation pipeline', () => {
    const Harness = ({ value }: { value: SharedBackground }) => {
      const video = useRef<HTMLVideoElement>(null);
      const live = useLiveBackground(video, value);
      return createElement(
        Fragment,
        null,
        createElement('video', { ref: video }),
        createElement('canvas', { ref: live.canvasRef })
      );
    };
    const { rerender } = render(
      createElement(Harness, { value: { mode: 'preset', value: '/pattern-backgrounds/pink-heart-tunnel.png' } })
    );

    act(() => {
      rerender(createElement(Harness, { value: { mode: 'preset', value: '/pattern-backgrounds/blue-heart-tunnel.png' } }));
    });

    expect(startLiveBackground).toHaveBeenCalledTimes(1);
    expect(updateBackground).toHaveBeenLastCalledWith('/pattern-backgrounds/blue-heart-tunnel.png');
    expect(stop).not.toHaveBeenCalled();
  });
});
