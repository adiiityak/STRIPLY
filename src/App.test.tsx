import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

describe('App landing chrome', () => {
  it('keeps editor actions off the first screen and reveals them after entering the editor', () => {
    render(<App />);

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /explore the app first/i }));

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /web booth/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shares directly from the header without opening an intermediate social dialog', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /explore the app first/i }));
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => expect(exportMocks.shareSocialImageDataUrl).toHaveBeenCalledOnce());
    expect(screen.queryByText(/share photo strip/i)).not.toBeInTheDocument();
  });
});
