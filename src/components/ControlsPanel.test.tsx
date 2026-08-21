import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import type { StripConfiguration } from '../types';
import { ControlsPanel } from './ControlsPanel';

const airmail = TEMPLATE_DEFINITIONS.find((template) => template.id === 'airmail')!;

describe('ControlsPanel template selection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retains the photo count when switching from a grid template to a vertical-only template', () => {
    const onChangeConfig = vi.fn();
    const config: StripConfiguration = {
      ...airmail.config,
      photoLayout: 'grid-2x2',
      photoCount: 6,
      exportFormat: 'strip4x6',
      captionText: 'Our shared caption'
    };

    render(
      <ControlsPanel
        photos={[]}
        config={config}
        onChangeConfig={onChangeConfig}
        onUploadPhotos={vi.fn()}
        onReorderPhotos={vi.fn()}
        onRemovePhoto={vi.fn()}
        onOpenWebcam={vi.fn()}
        onAutoCropFaces={vi.fn()}
        onAutoArrange={vi.fn()}
        onAddSticker={vi.fn()}
        onExportPNG={vi.fn()}
        onExportPDF={vi.fn()}
        isExporting={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Airline Boarding Pass' }));

    expect(onChangeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        photoLayout: 'vertical-1x4',
        photoCount: 6,
        exportFormat: 'strip2x6',
        captionText: 'Our shared caption'
      })
    );
  });

  it('retains grid layout settings when switching to another grid-compatible template', () => {
    const onChangeConfig = vi.fn();
    const config: StripConfiguration = {
      ...airmail.config,
      photoLayout: 'grid-2x2',
      photoCount: 6,
      exportFormat: 'strip4x6'
    };

    render(
      <ControlsPanel
        photos={[]}
        config={config}
        onChangeConfig={onChangeConfig}
        onUploadPhotos={vi.fn()}
        onReorderPhotos={vi.fn()}
        onRemovePhoto={vi.fn()}
        onOpenWebcam={vi.fn()}
        onAutoCropFaces={vi.fn()}
        onAutoArrange={vi.fn()}
        onAddSticker={vi.fn()}
        onExportPNG={vi.fn()}
        onExportPDF={vi.fn()}
        isExporting={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Classic Photobooth' }));

    expect(onChangeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        photoLayout: 'grid-2x2',
        photoCount: 4,
        exportFormat: 'strip4x6'
      })
    );
  });

  it('uses a shorter mobile sheet and exposes one direct social share action', () => {
    const onOpenShareModal = vi.fn();
    const { container } = render(
      <ControlsPanel
        photos={[]}
        config={airmail.config}
        onChangeConfig={vi.fn()}
        onUploadPhotos={vi.fn()}
        onReorderPhotos={vi.fn()}
        onRemovePhoto={vi.fn()}
        onOpenWebcam={vi.fn()}
        onAutoCropFaces={vi.fn()}
        onAutoArrange={vi.fn()}
        onAddSticker={vi.fn()}
        onExportPNG={vi.fn()}
        onExportPDF={vi.fn()}
        onOpenShareModal={onOpenShareModal}
        isExporting={false}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /export/i }));
    fireEvent.click(screen.getByRole('button', { name: /share on social media/i }));

    expect(onOpenShareModal).toHaveBeenCalledOnce();
    expect(container.querySelector('#controls-panel')).toHaveClass('h-[46dvh]');
    expect(screen.queryByText(/direct social media/i)).not.toBeInTheDocument();
  });
});
