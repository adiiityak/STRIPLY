import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundPicker, PRESETS } from './BackgroundPicker';

describe('BackgroundPicker', () => {
  it('lets either participant choose one shared preset', () => {
    const onChange = vi.fn();
    render(<BackgroundPicker value={{ mode: 'original' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /pink hearts/i }));
    expect(onChange).toHaveBeenCalledWith({
      mode: 'preset',
      value: '/pattern-backgrounds/pink-heart-tunnel.png'
    });
  });

  it('offers seven backgrounds alongside original, removal and upload', () => {
    render(<BackgroundPicker value={{ mode: 'original' }} onChange={vi.fn()} />);
    PRESETS.forEach((preset) => {
      expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument();
    });
    expect(PRESETS).toHaveLength(7);
  });

  // The presets once pointed at /template-previews/, which holds four-photo strip
  // mockups rather than tiles, putting photo-strip frames behind both people.
  it('draws every background from the raw pattern tiles', () => {
    PRESETS.forEach((preset) => {
      expect(preset.value).toMatch(/^\/pattern-backgrounds\/[a-z0-9-]+\.png$/);
    });
  });
});
