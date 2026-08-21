import { fireEvent, render, screen } from '@testing-library/react';
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

describe('StripCanvas sticker controls', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    // jsdom has no pointer capture; the real implementation is what broke the
    // controls, so the stub records rather than ignores.
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderWithSticker = () => {
    const template = TEMPLATE_DEFINITIONS.find(({ id }) => id === 'airmail')!;
    const onDeleteSticker = vi.fn();
    const onUpdateSticker = vi.fn();
    const view = render(
      <StripCanvas
        photos={[]}
        config={{
          ...template.config,
          stickerList: [{ id: 'stk-1', symbol: '❤️', x: 50, y: 50, scale: 1, rotation: 0 }]
        }}
        onDeleteSticker={onDeleteSticker}
        onUpdateSticker={onUpdateSticker}
        zoomLevel={1}
      />
    );
    return { ...view, onDeleteSticker, onUpdateSticker };
  };

  const selectSticker = (container: HTMLElement) => {
    const sticker = container.querySelector('[data-sticker-id]') ?? container.querySelector('.cursor-grab');
    fireEvent.pointerDown(sticker as Element, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(sticker as Element, { pointerId: 1 });
  };

  // Pointer capture on the sticker retargets the click to the container, so a
  // press starting on a control button never reached the button and both icons
  // did nothing.
  it('deletes a sticker when its bin icon is clicked', () => {
    const { container, onDeleteSticker } = renderWithSticker();
    selectSticker(container);

    const remove = screen.getByTitle('Remove sticker');
    fireEvent.pointerDown(remove, { button: 0, pointerId: 2 });
    fireEvent.click(remove);

    expect(onDeleteSticker).toHaveBeenCalledWith('stk-1');
  });

  it('rotates a sticker when its rotate icon is clicked', () => {
    const { container, onUpdateSticker } = renderWithSticker();
    selectSticker(container);

    const rotate = screen.getByTitle('Rotate sticker');
    fireEvent.pointerDown(rotate, { button: 0, pointerId: 3 });
    fireEvent.click(rotate);

    expect(onUpdateSticker).toHaveBeenCalledWith('stk-1', { rotation: 45 });
  });

  it('does not capture the pointer when the press starts on a control', () => {
    const { container } = renderWithSticker();
    selectSticker(container);
    (Element.prototype.setPointerCapture as unknown as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.pointerDown(screen.getByTitle('Remove sticker'), { button: 0, pointerId: 4 });

    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
  });
});
