/**
 * Poses the booth suggests, one per shot.
 *
 * Kept short: the hint sits in a pill over the feed on a laptop and in a single
 * row above the background buttons on a phone, and a long line wraps to two.
 *
 * Almost all of these read the same whether one person or two are in frame, so
 * the solo booth and the room can share the list.
 */
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
  'Wink at the camera',
  'Both hands on your cheeks',
  'Stick your tongue out',
  'Puff up your cheeks',
  'Look up and smile',
  'Hide behind your hands',
  'Peek through your fingers',
  'Finger heart by your eye',
  'Double peace signs',
  'Point at the camera',
  'Shrug and grin',
  'Hands in your hair',
  'Chin up, eyes down',
  'Your most serious face',
  'Laugh at nothing',
  'Cover your mouth and gasp',
  'Thumbs up, big smile',
  'Head tipped to one side',
  'Look over your shoulder',
  'Fake a yawn',
  'Squish your own cheeks',
  'Hands like a camera',
  'One eyebrow up',
  'Scrunch your nose',
  'Hands over your heart',
  'Cheesy open-mouth smile',
  'Close your eyes and smile',
  'Finger on your lips, shh',
  'Salute the camera',
  'Peace sign over one eye',
  'Look down, soft smile',
  'Big wave hello',
  'Puppy eyes',
  'Toothy grin',
  'Slow blink',
  'Cover half your face',
  'Your best smirk',
  'Heart hands overhead',
  'Chin tucked, eyes up',
  'Pretend to be shocked',
  'Cheek on your palm',
  'Hands behind your head',
  'Arms crossed, chin up',
  'Freeze mid-laugh',
  'Side-eye the camera',
  'Pretend to whisper',
  'Mouth open, no sound',
  'Pout at the lens',
  'Peekaboo hands'
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
