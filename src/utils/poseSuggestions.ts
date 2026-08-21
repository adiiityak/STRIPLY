export const POSE_SUGGESTIONS = [
  'Hands under your chin',
  'Make half a heart',
  'Peace sign by your cheek',
  'Lean in toward the middle'
] as const;

export function getPoseSuggestion(photoIndex: number): string {
  const safeIndex = Math.max(0, Math.floor(photoIndex));
  return POSE_SUGGESTIONS[safeIndex % POSE_SUGGESTIONS.length];
}
