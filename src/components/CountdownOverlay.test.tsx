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
    expect(numeral.className).toContain('text-[#FF6B6B]');
    // The pulse rides on a ring, not the digit: animate-ping ends at opacity 0,
    // which left the count invisible for part of every second.
    expect(numeral.className).not.toContain('animate-ping');
    expect(
      screen.getByTestId('countdown-overlay').querySelector('.animate-ping')
    ).toBeInTheDocument();
  });

  // A countdown is for posing, and you pose by watching your own face. Dimming or
  // blurring the frame hides the one thing the overlay is counting in.
  it('leaves the camera feed unobscured', () => {
    render(<CountdownOverlay value={3} />);
    const overlay = screen.getByTestId('countdown-overlay');
    expect(overlay.className).not.toContain('backdrop-blur');
    expect(overlay.className).not.toContain('bg-black');
    expect(overlay.querySelectorAll('[class*="backdrop-blur"]')).toHaveLength(0);
    // Nothing may stretch across the feed behind the numeral either.
    expect(overlay.querySelectorAll('.inset-0')).toHaveLength(0);
  });

  // The overlay covers the whole preview while it is up, so it must not swallow
  // taps meant for the controls underneath.
  it('does not intercept pointer events', () => {
    render(<CountdownOverlay value={3} />);
    expect(screen.getByTestId('countdown-overlay').className).toContain('pointer-events-none');
  });
});
