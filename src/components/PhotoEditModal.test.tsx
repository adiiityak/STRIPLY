import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhotoEditModal } from './PhotoEditModal';
import type { PhotoItem } from '../types';

const photo: PhotoItem = {
  id: 'photo-1',
  url: 'data:image/png;base64,AAA',
  cropX: 50,
  cropY: 50,
  zoom: 1
};

function renderModal(onSave = vi.fn()) {
  render(
    <PhotoEditModal
      photo={photo}
      isOpen
      onClose={vi.fn()}
      onSave={onSave}
      onDelete={vi.fn()}
    />
  );
  return { onSave };
}

describe('PhotoEditModal', () => {
  it('keeps the close control visible while the settings content scrolls on phones', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: /adjust photo/i });
    const controls = screen.getByTestId('photo-edit-scroll-area');

    expect(dialog).toHaveClass('h-[100dvh]', 'overflow-hidden');
    expect(controls).toHaveClass('min-h-0', 'overflow-y-auto');
    expect(screen.getByRole('button', { name: /close photo controls/i })).toBeVisible();
  });

  // The modal only ever offered vertical adjustment, so a photo framed too far
  // left or right could not be corrected at all.
  it('adjusts the photo horizontally as well as vertically', () => {
    renderModal();
    const horizontal = screen.getByRole('slider', { name: /move left or right/i });
    const vertical = screen.getByRole('slider', { name: /move up or down/i });

    fireEvent.change(horizontal, { target: { value: '15' } });
    fireEvent.change(vertical, { target: { value: '85' } });

    expect(screen.getByAltText('Edit target')).toHaveStyle({ objectPosition: '15% 85%' });
  });

  it('saves both positions', () => {
    const { onSave } = renderModal();
    fireEvent.change(screen.getByRole('slider', { name: /move left or right/i }), { target: { value: '20' } });
    fireEvent.change(screen.getByRole('slider', { name: /move up or down/i }), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ cropX: 20, cropY: 70 }));
  });

  it('recentres both axes at once', () => {
    renderModal();
    fireEvent.change(screen.getByRole('slider', { name: /move left or right/i }), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('slider', { name: /move up or down/i }), { target: { value: '90' } });

    fireEvent.click(screen.getByRole('button', { name: /recentre photo/i }));

    expect(screen.getByAltText('Edit target')).toHaveStyle({ objectPosition: '50% 50%' });
  });
});
