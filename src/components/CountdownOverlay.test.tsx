import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountdownOverlay } from './CountdownOverlay';

describe('CountdownOverlay', () => {
  it('shows nothing when there is no countdown', () => {
    render(<CountdownOverlay value={null} />);
    expect(screen.queryByTestId('countdown-overlay')).not.toBeInTheDocument();
  });

  it('counts the seconds down', () => {
    render(<CountdownOverlay value={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('marks the shutter moment', () => {
    render(<CountdownOverlay value={0} />);
    expect(screen.getByText(/snap/i)).toBeInTheDocument();
  });

  // The room used to draw a flat white numeral of its own. Both booths now share
  // this component, so the animation cannot drift apart again.
  it('uses the animated booth treatment', () => {
    render(<CountdownOverlay value={3} />);
    const numeral = screen.getByText('3');
    expect(numeral.className).toContain('animate-ping');
    expect(numeral.className).toContain('text-[#FF6B6B]');
    expect(screen.getByTestId('countdown-overlay').className).toContain('backdrop-blur-xs');
  });
});
