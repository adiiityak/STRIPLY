import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import { StripCanvas } from './StripCanvas';

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

describe('StripCanvas photo slots', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all four grid placeholders when there are no photos', () => {
    const template = TEMPLATE_DEFINITIONS.find(({ id }) => id === 'airmail')!;
    const { container } = render(
      <StripCanvas
        photos={[]}
        config={{
          ...template.config,
          photoLayout: 'grid-2x2',
          photoCount: 4,
          exportFormat: 'strip4x6'
        }}
        zoomLevel={1}
      />
    );

    const slots = container.querySelectorAll('[data-photo-slot]');
    expect(slots).toHaveLength(4);
    for (const slot of slots) {
      // The height must be a definite pixel value, not a percentage or a flex basis.
      // html-to-image rasterises the strip through an SVG foreignObject clone, and WebKit
      // does not resolve percentage/flex heights there, which collapsed every photo slot to
      // zero and exported blank photos on iPhone. Asserting "some px value" rather than an
      // exact number keeps this pinned to the property that matters without re-pinning the
      // arithmetic that stripLayout already covers.
      const { minWidth, minHeight, height } = (slot as HTMLElement).style;
      expect(minWidth).toBe('0px');
      expect(minHeight).toBe('0px');
      expect(height).toMatch(/^\d+(\.\d+)?px$/);
      expect(parseFloat(height)).toBeGreaterThan(0);
    }
  });
});
