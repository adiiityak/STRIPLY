import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileMenu } from './ProfileMenu';

const setup = () => {
  const onOpenSavedStrips = vi.fn();
  const onSignOut = vi.fn();
  render(
    <ProfileMenu
      name="Aditya Kanojiya"
      email="aditya@example.com"
      onOpenSavedStrips={onOpenSavedStrips}
      onSignOut={onSignOut}
    />
  );
  return { onOpenSavedStrips, onSignOut, trigger: screen.getByRole('button', { name: /account/i }) };
};

describe('ProfileMenu', () => {
  it('keeps the menu closed until asked', () => {
    setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  // Sign out used to live inside the saved-strips dialog, which is not where
  // anyone looks for an account action.
  it('offers sign out and the strip gallery from the avatar', () => {
    const { onOpenSavedStrips, onSignOut, trigger } = setup();
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /my strips/i }));
    expect(onOpenSavedStrips).toHaveBeenCalledTimes(1);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('identifies who is signed in', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    expect(screen.getByText('Aditya Kanojiya')).toBeInTheDocument();
    expect(screen.getByText('aditya@example.com')).toBeInTheDocument();
  });

  it('reports its open state to assistive tech', () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when something outside is pressed', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('selecting an item closes the menu', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /my strips/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
