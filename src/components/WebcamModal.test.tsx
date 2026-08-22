import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebcamModal } from './WebcamModal';

vi.mock('./RemoteBooth', () => ({
  RemoteBooth: () => <div data-testid="remote-booth-stub" />
}));

describe('WebcamModal remote layout', () => {
  it('uses the visible mobile viewport and a wider desktop dialog', async () => {
    render(
      <WebcamModal
        isOpen
        initialRemoteAction="create"
        onClose={vi.fn()}
        onPhotosCaptured={vi.fn()}
        onRemoteSessionComplete={vi.fn()}
      />
    );

    expect(await screen.findByTestId('remote-booth-stub')).toBeInTheDocument();
    expect(screen.getByTestId('remote-booth-backdrop')).toHaveClass('h-[100dvh]', 'items-start');
    expect(screen.getByTestId('remote-booth-dialog')).toHaveClass(
      'h-[100dvh]',
      'overflow-hidden',
      'lg:max-w-6xl'
    );
  });

  it('shows a pose suggestion before a solo photo series starts', async () => {
    stubCamera();
    renderSolo();

    expect(await screen.findByTestId('solo-pose-hint')).toHaveTextContent(
      /hands under your chin/i
    );
  });
});

const stubCamera = () =>
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) }
  });

const renderSolo = () => {
  render(
    <WebcamModal
      isOpen
      onClose={vi.fn()}
      onPhotosCaptured={vi.fn()}
      onRemoteSessionComplete={vi.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /solo booth/i }));
};

describe('WebcamModal solo layout', () => {
  // The solo booth used to be a narrow single column, so on a laptop the feed
  // pushed the shot count and the start button below the fold. It now shares the
  // long-distance booth's shape: feed beside its controls in one viewport.
  it('puts the feed beside its controls on a laptop', async () => {
    stubCamera();
    renderSolo();

    expect(await screen.findByTestId('solo-booth-layout')).toHaveClass(
      'grid-cols-1',
      'lg:grid-cols-[minmax(0,1fr)_20rem]'
    );
    expect(screen.getByTestId('solo-booth-dialog')).toHaveClass('h-[100dvh]', 'lg:max-w-6xl');
    expect(screen.getByTestId('solo-booth-controls')).toBeInTheDocument();
  });

  // Five "N Shots" pills do not fit a 20rem column; wrapping them buried the
  // start button, so the counts are a compact grid with the count as the label.
  it('offers every shot count in the sidebar', async () => {
    stubCamera();
    renderSolo();

    await screen.findByTestId('solo-booth-controls');
    for (const count of [2, 3, 4, 5, 6]) {
      expect(screen.getByRole('button', { name: `${count} shots` })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: '4 shots' })).toHaveAttribute('aria-pressed', 'true');
  });

  // Over the feed the pill sat on the chin and hands it was asking for, which on
  // a phone is most of the frame.
  it('reads the pose hint under the feed on a phone and over it on a laptop', async () => {
    stubCamera();
    renderSolo();

    const hint = await screen.findByTestId('solo-pose-hint');
    expect(hint).toHaveClass('lg:hidden');
    // First in the controls column, so it lands between feed and background buttons.
    expect(screen.getByTestId('solo-booth-controls').firstElementChild).toBe(hint);
    expect(screen.getByTestId('solo-pose-hint-overlay')).toHaveClass('hidden', 'lg:block');
  });

  // "Changes from either person sync instantly" is a room promise. The solo booth
  // has nobody to sync with, and used to show it anyway.
  it('does not promise to sync a solo background with anyone', async () => {
    stubCamera();
    renderSolo();

    await screen.findByTestId('solo-booth-controls');
    expect(screen.queryByText(/either person/i)).not.toBeInTheDocument();
  });
});
