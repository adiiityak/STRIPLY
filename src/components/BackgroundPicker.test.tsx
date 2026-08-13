import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundPicker } from './BackgroundPicker';

describe('BackgroundPicker', () => {
  it('lets either participant choose one shared preset', () => {
    const onChange = vi.fn();
    render(<BackgroundPicker value={{ mode: 'original' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /love notes/i }));
    expect(onChange).toHaveBeenCalledWith({
      mode: 'preset',
      value: '/template-previews/pattern-love-notes.png'
    });
  });
});
