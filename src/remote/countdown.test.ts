import { describe, expect, it } from 'vitest';
import { isCountdownStale } from './countdown';

const NOW = 1_800_000_000_000;

describe('isCountdownStale', () => {
  it('is not stale while the countdown is still running', () => {
    expect(isCountdownStale({ phase: 'countdown', captureTargetAt: NOW + 2_000, now: NOW })).toBe(false);
  });

  it('is not stale immediately after the shutter moment', () => {
    // Compositing a frame takes a beat; do not offer an escape hatch mid-capture.
    expect(isCountdownStale({ phase: 'countdown', captureTargetAt: NOW - 500, now: NOW })).toBe(false);
  });

  // The deadlock: capture bailed because the remote video never arrived, so the
  // room stayed in 'countdown' and the take-photo button was disabled forever.
  it('is stale once the shutter moment is well past and nothing was captured', () => {
    expect(isCountdownStale({ phase: 'countdown', captureTargetAt: NOW - 9_000, now: NOW })).toBe(true);
  });

  it('is never stale outside the countdown phase', () => {
    expect(isCountdownStale({ phase: 'ready', captureTargetAt: NOW - 9_000, now: NOW })).toBe(false);
    expect(isCountdownStale({ phase: 'review', captureTargetAt: NOW - 9_000, now: NOW })).toBe(false);
  });

  it('is not stale when there is no scheduled shutter moment', () => {
    expect(isCountdownStale({ phase: 'countdown', captureTargetAt: undefined, now: NOW })).toBe(false);
  });
});
