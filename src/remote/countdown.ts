import type { RoomPhase } from './types';

/**
 * How long after the scheduled shutter moment the room is still considered to be
 * mid-capture. Compositing and publishing a frame takes a moment, so this has to
 * be generous enough not to interrupt a capture that is genuinely in progress.
 */
const CAPTURE_GRACE_MS = 6_000;

export interface CountdownStalenessInputs {
  phase: RoomPhase;
  captureTargetAt?: number;
  now: number;
  graceMs?: number;
}

/**
 * True when a countdown was started but no frame ever landed.
 *
 * The capture step gives up if the partner's video is not playable yet, and
 * nothing moved the room out of 'countdown' when it did. Since the take-photo
 * button is disabled during 'countdown', the booth deadlocked: a stuck 📸
 * overlay, a permanently greyed button, and no way back short of a reload.
 * Treating a long-expired countdown as stale re-enables the button so the shot
 * can simply be retaken.
 */
export function isCountdownStale({
  phase,
  captureTargetAt,
  now,
  graceMs = CAPTURE_GRACE_MS
}: CountdownStalenessInputs): boolean {
  if (phase !== 'countdown' || !captureTargetAt) return false;
  return now - captureTargetAt > graceMs;
}
