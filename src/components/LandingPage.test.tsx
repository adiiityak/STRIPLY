import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';
import { renderGoogleSignIn } from '../accounts/googleIdentity';
import type { Account } from '../accounts/useAccount';

vi.mock('../accounts/googleIdentity', () => ({
  renderGoogleSignIn: vi.fn(async () => undefined)
}));

const account = (overrides: Partial<Account> = {}) =>
  ({
    status: 'signed-out',
    config: { apiBaseUrl: 'https://api.example.com', googleClientId: 'client-id' },
    user: null,
    api: {} as Account['api'],
    busy: false,
    error: null,
    clearError: vi.fn(),
    signInWithCredential: vi.fn(),
    signOut: vi.fn(),
    ...overrides
  }) as Account;

beforeEach(() => vi.clearAllMocks());

describe('LandingPage', () => {
  it('offers Google sign-in as the only way in', async () => {
    render(<LandingPage account={account()} />);
    expect(renderGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: /striply/i })).toBeInTheDocument();
  });

  // Someone arriving from an invite is a first-time visitor by definition, so the
  // copy should explain why they are being asked to sign up.
  it('tells an invited visitor that someone is waiting', () => {
    render(<LandingPage account={account()} invited />);
    expect(screen.getByText(/waiting for you/i)).toBeInTheDocument();
  });

  it('leads with the product, not the invite, for a cold visitor', () => {
    render(<LandingPage account={account()} />);
    expect(screen.queryByText(/waiting for you/i)).not.toBeInTheDocument();
    expect(screen.getByText(/someone you miss/i)).toBeInTheDocument();
  });

  it('shows real template previews rather than placeholders', () => {
    render(<LandingPage account={account()} />);
    const strips = screen.getAllByRole('img');
    expect(strips.length).toBeGreaterThanOrEqual(3);
    strips.forEach((img) => expect(img.getAttribute('src')).toMatch(/^\/template-previews\//));
  });

  it('reorders the strips when they are activated', () => {
    render(<LandingPage account={account()} />);
    const stack = screen.getByRole('button', { name: /shuffle the photo strip previews/i });
    const before = screen.getAllByRole('img').map((img) => (img as HTMLImageElement).style.zIndex);
    fireEvent.click(stack);
    const after = screen.getAllByRole('img').map((img) => (img as HTMLImageElement).style.zIndex);
    expect(after).not.toEqual(before);
  });

  // A gate with an unexplained failure is a wall with no door, so a blocked
  // sign-in has to say so here more than anywhere else in the app.
  it('surfaces a sign-in failure', () => {
    render(<LandingPage account={account({ error: 'Your browser blocked Google sign-in.' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/blocked/i);
  });
});
