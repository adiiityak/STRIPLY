export const POSE_SUGGESTIONS = [
  'Hands under your chin',
  'Make half a heart',
  'Peace sign by your cheek',
  'Lean in toward the middle',
  'Look away and laugh',
  'Blow a kiss',
  'Cover one eye',
  'Big surprised face',
  'Chin on your hand',
  'Hands framing your face',
  'Tilt your head and smile',
  'Wink at the camera'
] as const;

/**
 * A pose to try for the given shot.
 *
 * `offset` rotates the starting point so a booth does not open on the same
 * suggestion every single time. Callers hold it steady for the length of a
 * session: the prompt has to sit still long enough to be read, so it can move on
 * from one shot to the next but must not reshuffle on every render.
 */
export function getPoseSuggestion(photoIndex: number, offset = 0): string {
  const safeIndex = Math.max(0, Math.floor(photoIndex));
  const safeOffset = Math.max(0, Math.floor(offset));
  return POSE_SUGGESTIONS[(safeIndex + safeOffset) % POSE_SUGGESTIONS.length];
}

export function getRandomPoseOffset(): number {
  return Math.floor(Math.random() * POSE_SUGGESTIONS.length);
}

/**
 * A starting point derived from a string, for booths that must agree on one.
 *
 * The room passes its code, so both people are told the same pose. Rolling
 * independently on each device would leave one person making half a heart while
 * the other winks -- worse in a shared photo than repeating a prompt.
 */
export function getPoseOffsetForKey(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100_003;
  }
  return hash % POSE_SUGGESTIONS.length;
}
