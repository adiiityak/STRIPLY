import { describe, expect, it, vi } from 'vitest';
import {
  POSE_SUGGESTIONS,
  getPoseOffsetForKey,
  getPoseSuggestion,
  getRandomPoseOffset
} from './poseSuggestions';

describe('getPoseSuggestion', () => {
  it('moves on from one shot to the next', () => {
    expect(getPoseSuggestion(0)).not.toBe(getPoseSuggestion(1));
  });

  // The booth used to open on the same suggestion every time, because the shot
  // count alone decided it and the first shot is always shot zero.
  it('starts somewhere else when the offset moves', () => {
    const opens = new Set(
      POSE_SUGGESTIONS.map((_, offset) => getPoseSuggestion(0, offset))
    );
    expect(opens.size).toBe(POSE_SUGGESTIONS.length);
  });

  it('wraps around rather than running out', () => {
    expect(getPoseSuggestion(POSE_SUGGESTIONS.length)).toBe(getPoseSuggestion(0));
    expect(getPoseSuggestion(0, POSE_SUGGESTIONS.length * 3)).toBe(getPoseSuggestion(0));
  });

  it('survives nonsense indices', () => {
    expect(POSE_SUGGESTIONS).toContain(getPoseSuggestion(-5, -9));
    expect(POSE_SUGGESTIONS).toContain(getPoseSuggestion(2.7, 1.3));
  });
});

describe('getRandomPoseOffset', () => {
  it('stays inside the list', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(getRandomPoseOffset()).toBe(POSE_SUGGESTIONS.length - 1);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomPoseOffset()).toBe(0);
    vi.restoreAllMocks();
  });
});

describe('getPoseOffsetForKey', () => {
  // Both people in a room must be told the same pose: one making half a heart
  // while the other winks is worse in a shared photo than a repeated prompt.
  it('gives the same offset for the same room code', () => {
    expect(getPoseOffsetForKey('WZ6EFV')).toBe(getPoseOffsetForKey('WZ6EFV'));
  });

  it('gives different rooms different starting poses', () => {
    const offsets = new Set(
      ['WZ6EFV', 'AB12CD', 'QQ99ZZ', 'HELLO1', 'MNBVCX', 'PLOKIJ'].map(getPoseOffsetForKey)
    );
    expect(offsets.size).toBeGreaterThan(1);
  });

  it('stays inside the list', () => {
    for (const code of ['', 'A', 'WZ6EFV', 'a-very-long-room-code-indeed']) {
      const offset = getPoseOffsetForKey(code);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(POSE_SUGGESTIONS.length);
    }
  });
});
