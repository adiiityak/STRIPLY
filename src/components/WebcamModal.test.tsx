import { render, screen } from '@testing-library/react';
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
});
