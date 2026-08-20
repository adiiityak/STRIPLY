import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundPicker, PRESETS } from './BackgroundPicker';

describe('BackgroundPicker', () => {
  it('keeps the three primary actions separate from the wrapping preset grid', () => {
    render(
      <BackgroundPicker
        value={{ mode: 'original' }}
        onChange={vi.fn()}
        onUpload={vi.fn()}
      />
    );

    const actions = screen.getByTestId('background-primary-actions');
    const presets = screen.getByTestId('background-preset-grid');

    expect(actions).toHaveClass('grid');
    expect(actions).not.toHaveClass('overflow-x-auto');
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Original' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Remove background' }));
    expect(actions).toContainElement(screen.getByText('Upload'));

    expect(presets).toHaveClass('grid-cols-5');
    expect(presets).not.toHaveClass('overflow-x-auto');
    expect(presets.querySelectorAll('button')).toHaveLength(PRESETS.length);
  });

  it('keeps background selection and upload controls working', () => {
    const onChange = vi.fn();
    const onUpload = vi.fn();
    const { container } = render(
      <BackgroundPicker value={{ mode: 'original' }} onChange={onChange} onUpload={onUpload} />
    );

    fireEvent.click(screen.getByRole('button', { name: PRESETS[0].name }));
    expect(onChange).toHaveBeenCalledWith({ mode: 'preset', value: PRESETS[0].value });

    const file = new File(['image'], 'background.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  // These must stay raw background tiles. Template previews include photo-slot
  // artwork and would put fake strip frames behind both participants.
  it('draws every background from the raw pattern tiles', () => {
    expect(PRESETS).toHaveLength(7);
    PRESETS.forEach((preset) => {
      expect(preset.value).toMatch(/^\/pattern-backgrounds\/[a-z0-9-]+\.png$/);
    });
  });
});
