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
      expect(slot).toHaveStyle({ minWidth: 0, minHeight: 0, height: '100%' });
    }
  });
});
