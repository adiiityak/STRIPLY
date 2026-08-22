import { describe, expect, it } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import { shouldRestoreDraft, type StripDraft } from './draftStore';

const draft = (photoCount: number): StripDraft => ({
  photos: Array.from({ length: photoCount }, (_, index) => ({
    id: `p${index}`,
    url: 'data:image/jpeg;base64,AAA',
    cropX: 50,
    cropY: 50,
    zoom: 1
  })),
  config: TEMPLATE_DEFINITIONS[0].config,
  savedAt: 1
});

describe('shouldRestoreDraft', () => {
  it('restores a draft that has photos in it', () => {
    expect(shouldRestoreDraft(draft(3), { invited: false })).toBe(true);
  });

  // Reopening an empty editor is a dead end: nothing to edit and no next step,
  // whereas the start screen offers four ways forward.
  it('ignores a draft with no photos', () => {
    expect(shouldRestoreDraft(draft(0), { invited: false })).toBe(false);
  });

  it('ignores a missing draft', () => {
    expect(shouldRestoreDraft(null, { invited: false })).toBe(false);
  });

  // Joining someone's room is a more specific intention than picking up an old
  // draft, so the invite wins.
  it('yields to an invite link', () => {
    expect(shouldRestoreDraft(draft(4), { invited: true })).toBe(false);
  });
});
