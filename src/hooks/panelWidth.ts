export const RAIL_WIDTH = 68;
export const MIN_WIDTH = 320;
export const DEFAULT_WIDTH = 384;
export const COLLAPSED_WIDTH = RAIL_WIDTH;

/** Never let the sidebar squeeze the canvas below this. */
export const MIN_CANVAS_WIDTH = 380;
/** Absolute ceiling regardless of how wide the display is. */
export const MAX_WIDTH_CAP = 720;

export const WIDTH_KEY = 'striply:panelWidth';
export const COLLAPSED_KEY = 'striply:panelCollapsed';

export interface PanelState {
  width: number;
  isCollapsed: boolean;
}

/** The subset of the Storage API used here, so tests can inject a fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function computeMaxWidth(viewportWidth: number): number {
  const room = viewportWidth - MIN_CANVAS_WIDTH;
  // Math.max guards narrow viewports, where `room` could otherwise fall below
  // MIN_WIDTH and invert the clamp range.
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH_CAP, room));
}

export function clampWidth(width: number, viewportWidth: number): number {
  if (!Number.isFinite(width)) return DEFAULT_WIDTH;
  const max = computeMaxWidth(viewportWidth);
  return Math.round(Math.min(max, Math.max(MIN_WIDTH, width)));
}

export function readPanelState(storage: StorageLike | null, viewportWidth: number): PanelState {
  const fallback: PanelState = { width: DEFAULT_WIDTH, isCollapsed: false };
  if (!storage) return fallback;
  try {
    const rawWidth = storage.getItem(WIDTH_KEY);
    const rawCollapsed = storage.getItem(COLLAPSED_KEY);
    // Number('') is 0, which would silently clamp to MIN_WIDTH, so reject blanks.
    const parsed = rawWidth === null || rawWidth.trim() === '' ? Number.NaN : Number(rawWidth);
    return {
      width: Number.isFinite(parsed) ? clampWidth(parsed, viewportWidth) : DEFAULT_WIDTH,
      isCollapsed: rawCollapsed === 'true'
    };
  } catch {
    return fallback;
  }
}

export function writePanelState(storage: StorageLike | null, state: PanelState): void {
  if (!storage) return;
  try {
    storage.setItem(WIDTH_KEY, String(state.width));
    storage.setItem(COLLAPSED_KEY, String(state.isCollapsed));
  } catch {
    // Private-mode browsers throw on write; in-memory state is a fine degradation.
  }
}
