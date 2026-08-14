import { beforeEach, describe, expect, it } from 'vitest';
import {
  nextSegmentationTimestamp,
  resetLiveBackgroundForTests,
  selectNextSource
} from './liveBackground';

beforeEach(() => {
  resetLiveBackgroundForTests();
});

describe('nextSegmentationTimestamp', () => {
  // The room segments two feeds through one MediaPipe instance, which rejects a
  // timestamp that does not advance. Per-feed counters made the two collide, so
  // most frames were dropped and the background only appeared intermittently.
  it('never repeats a timestamp across interleaved feeds', () => {
    const local = [nextSegmentationTimestamp(), nextSegmentationTimestamp()];
    const remote = [nextSegmentationTimestamp(), nextSegmentationTimestamp()];
    const interleaved = [local[0], remote[0], local[1], remote[1]];

    expect(new Set(interleaved).size).toBe(interleaved.length);
  });

  it('advances strictly, whoever asks', () => {
    const seen = Array.from({ length: 20 }, () => nextSegmentationTimestamp());
    seen.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThan(seen[index - 1]);
    });
  });
});

describe('selectNextSource', () => {
  it('alternates between two feeds rather than starving one', () => {
    const feeds = ['local', 'remote'];
    let cursor = 0;
    const served: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const picked = selectNextSource(feeds, cursor);
      cursor = picked.nextCursor;
      served.push(picked.source as string);
    }
    expect(served).toEqual(['local', 'remote', 'local', 'remote', 'local', 'remote']);
  });

  it('keeps serving a single feed', () => {
    const picked = selectNextSource(['solo'], 0);
    expect(picked.source).toBe('solo');
    expect(selectNextSource(['solo'], picked.nextCursor).source).toBe('solo');
  });

  it('copes with no feeds at all', () => {
    expect(selectNextSource([], 3).source).toBeUndefined();
  });

  it('survives a cursor left over from a larger set', () => {
    // A feed leaving mid-run shrinks the list under a stale cursor.
    expect(selectNextSource(['only'], 7).source).toBe('only');
  });
});
