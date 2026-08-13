import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomEntry } from './RoomEntry';

describe('RoomEntry', () => {
  it('normalizes a pasted room code before joining', () => {
    const onJoin = vi.fn();
    render(<RoomEntry onCreate={vi.fn()} onJoin={onJoin} busy={false} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Maya' } });
    fireEvent.click(screen.getByRole('button', { name: /join a room/i }));
    fireEvent.change(screen.getByLabelText(/room code/i), { target: { value: ' ab-12cd ' } });
    fireEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    expect(onJoin).toHaveBeenCalledWith('AB12CD', 'Maya');
  });
});
