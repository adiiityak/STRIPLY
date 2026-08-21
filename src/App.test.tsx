import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

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
});
