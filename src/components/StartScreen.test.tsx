import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StartScreen } from './StartScreen';

describe('StartScreen remote room actions', () => {
  it('opens the create-room flow directly from the homepage', () => {
    const onCreateRoom = vi.fn();
    render(
      <StartScreen
        onTakeLivePicture={vi.fn()}
        onUploadPhotos={vi.fn()}
        onExploreApp={vi.fn()}
        onCreateRoom={onCreateRoom}
        onJoinRoom={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));

    expect(onCreateRoom).toHaveBeenCalledOnce();
  });

  it('opens the join-room flow directly from the homepage', () => {
    const onJoinRoom = vi.fn();
    render(
      <StartScreen
        onTakeLivePicture={vi.fn()}
        onUploadPhotos={vi.fn()}
        onExploreApp={vi.fn()}
        onCreateRoom={vi.fn()}
        onJoinRoom={onJoinRoom}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));

    expect(onJoinRoom).toHaveBeenCalledOnce();
  });
});
