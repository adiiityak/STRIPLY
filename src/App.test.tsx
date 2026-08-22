import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const exportMocks = vi.hoisted(() => ({
  exportSocialShareToDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,QQ=='),
  shareSocialImageDataUrl: vi.fn().mockResolvedValue('shared')
}));

vi.mock('./utils/exportUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/exportUtils')>();
  return { ...actual, ...exportMocks };
});

vi.mock('@vercel/speed-insights/react', () => ({ SpeedInsights: () => null }));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

const accountStatus = vi.hoisted(() => ({ value: 'unconfigured' as string }));

vi.mock('./accounts/useAccount', () => ({
  useAccount: () => ({
    status: accountStatus.value,
    config: { apiBaseUrl: 'https://api.example.com', googleClientId: 'client-id' },
    user: null,
    api: {},
    busy: false,
    error: null,
    clearError: vi.fn(),
    signInWithCredential: vi.fn(),
    signOut: vi.fn()
  })
}));

// The landing page renders Google's real button, which would fetch their script.
vi.mock('./accounts/googleIdentity', () => ({
  renderGoogleSignIn: vi.fn(async () => undefined),
  forgetGoogleSelection: vi.fn(async () => undefined),
  describeSignInError: () => 'blocked'
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// Account state is stated per test rather than inherited from the environment.
// vitest loads .env.local, and Vite inlines import.meta.env at transform time, so
// these tests would otherwise pass or fail depending on whether the developer
// happened to have accounts configured locally -- and vi.stubEnv cannot reach an
// inlined value.
function withAccounts(configured: boolean) {
  accountStatus.value = configured ? 'signed-out' : 'unconfigured';
}

describe('App sign-up gate', () => {
  it('shows the landing page instead of the booth when signed out', () => {
    withAccounts(true);
    render(<App />);

    expect(screen.getByRole('heading', { name: /striply/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /explore the app first/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  // A deployment with no client id could never get anyone through the gate, so
  // gating it would be a wall with no door.
  it('leaves the booth open when accounts are not configured', async () => {
    withAccounts(false);
    render(<App />);

    // Awaited because the start screen is withheld until the saved-draft check
    // finishes, so a restored draft never flashes it on the way past.
    expect(await screen.findByRole('button', { name: /explore the app first/i })).toBeInTheDocument();
  });
});

describe('App landing chrome', () => {
  beforeEach(() => withAccounts(false));

  it('keeps editor actions off the first screen and reveals them after entering the editor', async () => {
    render(<App />);

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /explore the app first/i }));

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /web booth/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shares directly from the header without opening an intermediate social dialog', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /explore the app first/i }));
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => expect(exportMocks.shareSocialImageDataUrl).toHaveBeenCalledOnce());
    expect(screen.queryByText(/share photo strip/i)).not.toBeInTheDocument();
  });
});
