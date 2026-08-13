import { describe, expect, it } from 'vitest';
import { ROOM_PHASES, normalizeRoomCode } from './types';

describe('remote booth protocol', () => {
  it('defines the complete room phase sequence', () => {
    expect(ROOM_PHASES).toEqual(['lobby', 'ready', 'countdown', 'review', 'complete', 'closed']);
  });

  it('normalizes pasted room codes to six uppercase alphanumeric characters', () => {
    expect(normalizeRoomCode(' ab-12cd ')).toBe('AB12CD');
  });
});
