import { describe, expect, it } from 'vitest';
import { shouldAcceptRoomSnapshot } from './roomClient';
import type { RoomSnapshot } from './types';

const snapshot = (revision: number): RoomSnapshot => ({
  code: 'ABC234',
  revision,
  phase: 'lobby',
  participants: [],
  shared: {
    layout: 'vertical-1x4',
    templateId: 'airmail',
    filterPreset: 'normal',
    background: { mode: 'original' }
  },
  acceptedFrameIds: [],
  expiresAt: Date.now() + 10_000
});

describe('room client state', () => {
  it('accepts the same or a newer authoritative revision', () => {
    expect(shouldAcceptRoomSnapshot(snapshot(2), snapshot(2))).toBe(true);
    expect(shouldAcceptRoomSnapshot(snapshot(2), snapshot(3))).toBe(true);
  });

  it('rejects older authoritative revisions', () => {
    expect(shouldAcceptRoomSnapshot(snapshot(3), snapshot(2))).toBe(false);
  });
});
