import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_WIDTH,
  MIN_WIDTH,
  WIDTH_KEY,
  COLLAPSED_KEY,
  computeMaxWidth,
  clampWidth,
  readPanelState,
  writePanelState,
  type StorageLike
} from './panelWidth';

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; }
  };
}

describe('computeMaxWidth', () => {
  it('caps at 720 on a wide viewport', () => {
    expect(computeMaxWidth(1440)).toBe(720);
  });

  it('leaves 380px for the canvas on a mid viewport', () => {
    expect(computeMaxWidth(900)).toBe(520);
  });

  it('never returns less than the minimum width', () => {
    expect(computeMaxWidth(400)).toBe(MIN_WIDTH);
  });
});

describe('clampWidth', () => {
  it('raises a too-small width to the minimum', () => {
    expect(clampWidth(100, 1440)).toBe(MIN_WIDTH);
  });

  it('lowers a too-large width to the viewport-derived maximum', () => {
    expect(clampWidth(9999, 1440)).toBe(720);
  });

  it('keeps an in-range width, rounded to whole pixels', () => {
    expect(clampWidth(432.6, 1440)).toBe(433);
  });

  it('falls back to the default when given a non-finite value', () => {
    expect(clampWidth(Number.NaN, 1440)).toBe(DEFAULT_WIDTH);
  });
});

describe('readPanelState', () => {
  it('returns defaults when there is no storage', () => {
    expect(readPanelState(null, 1440)).toEqual({ width: DEFAULT_WIDTH, isCollapsed: false });
  });

  it('returns defaults when the keys are absent', () => {
    expect(readPanelState(fakeStorage(), 1440)).toEqual({ width: DEFAULT_WIDTH, isCollapsed: false });
  });

  it('restores a stored width and collapsed flag', () => {
    const storage = fakeStorage({ [WIDTH_KEY]: '500', [COLLAPSED_KEY]: 'true' });
    expect(readPanelState(storage, 1440)).toEqual({ width: 500, isCollapsed: true });
  });

  it('re-clamps a stored width that no longer fits the viewport', () => {
    const storage = fakeStorage({ [WIDTH_KEY]: '700' });
    expect(readPanelState(storage, 900).width).toBe(520);
  });

  it('falls back to the default for a corrupt width', () => {
    expect(readPanelState(fakeStorage({ [WIDTH_KEY]: 'abc' }), 1440).width).toBe(DEFAULT_WIDTH);
  });

  it('falls back to the default for an empty width string', () => {
    expect(readPanelState(fakeStorage({ [WIDTH_KEY]: '' }), 1440).width).toBe(DEFAULT_WIDTH);
  });

  it('falls back to the default for a whitespace-only width string', () => {
    // Number('  ') is 0, which would otherwise clamp silently up to MIN_WIDTH.
    expect(readPanelState(fakeStorage({ [WIDTH_KEY]: '   ' }), 1440).width).toBe(DEFAULT_WIDTH);
  });

  it('treats any non-"true" collapsed value as expanded', () => {
    expect(readPanelState(fakeStorage({ [COLLAPSED_KEY]: 'nope' }), 1440).isCollapsed).toBe(false);
  });

  it('returns defaults when storage access throws', () => {
    const hostile: StorageLike = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); }
    };
    expect(readPanelState(hostile, 1440)).toEqual({ width: DEFAULT_WIDTH, isCollapsed: false });
  });
});

describe('writePanelState', () => {
  it('writes both keys as strings', () => {
    const storage = fakeStorage();
    writePanelState(storage, { width: 512, isCollapsed: true });
    expect(storage.data[WIDTH_KEY]).toBe('512');
    expect(storage.data[COLLAPSED_KEY]).toBe('true');
  });

  it('does nothing when there is no storage', () => {
    expect(() => writePanelState(null, { width: 400, isCollapsed: false })).not.toThrow();
  });

  it('swallows storage errors so the panel still renders', () => {
    const hostile: StorageLike = {
      getItem: () => null,
      setItem: vi.fn(() => { throw new Error('QuotaExceededError'); })
    };
    expect(() => writePanelState(hostile, { width: 400, isCollapsed: false })).not.toThrow();
  });
});
