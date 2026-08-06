import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutPicker } from './LayoutPicker';

describe('LayoutPicker', () => {
  it('selects the 2×2 layout', () => {
    const onChange = vi.fn();
    render(
      <LayoutPicker
        value="vertical-1x4"
        supportedLayouts={['vertical-1x4', 'grid-2x2']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '2 by 2 grid' }));
    expect(onChange).toHaveBeenCalledWith('grid-2x2');
    expect(screen.getByRole('group', { name: 'Photo Layout' })).toBeVisible();
  });

  it('explains when the selected template cannot use a grid', () => {
    render(
      <LayoutPicker
        value="vertical-1x4"
        supportedLayouts={['vertical-1x4']}
        onChange={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: '2 by 2 grid' })).toBeDisabled();
    expect(screen.getByText('This template supports the vertical strip only.')).toBeVisible();
  });
});
