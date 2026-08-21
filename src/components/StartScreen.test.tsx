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

describe('StartScreen entry copy', () => {
  const props = {
    onTakeLivePicture: vi.fn(),
    onUploadPhotos: vi.fn(),
    onExploreApp: vi.fn(),
    onCreateRoom: vi.fn(),
    onJoinRoom: vi.fn()
  };

  it('invites a first-time visitor to explore', () => {
    render(<StartScreen {...props} />);
    expect(screen.getByRole('button', { name: /explore the app first/i })).toBeInTheDocument();
  });

  // Someone who has signed in before does not need inviting to explore what they
  // already know.
  it('offers a returning visitor a way straight in', () => {
    render(<StartScreen {...props} isReturningUser />);
    expect(screen.getByRole('button', { name: /^go to app$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /explore the app first/i })).not.toBeInTheDocument();
  });

  it('leads with the booth', () => {
    render(<StartScreen {...props} />);
    expect(screen.getByRole('button', { name: /start the photobooth cam/i })).toBeInTheDocument();
  });
});
