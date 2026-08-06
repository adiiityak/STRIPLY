import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATEGORIES, TEMPLATE_DEFINITIONS } from './templates';

describe('pattern templates', () => {
  it('provides a dedicated Patterns category with text-free designs', () => {
    const patterns = TEMPLATE_DEFINITIONS.filter((template) => template.category === 'patterns');

    expect(TEMPLATE_CATEGORIES.some((category) => category.id === 'patterns')).toBe(true);
    expect(patterns).toHaveLength(6);
    patterns.forEach((template) => {
      expect(template.config.background.type).toBe('pattern');
      expect(template.config.captionText).toBe('');
      expect(template.config.subCaptionText).toBe('');
      expect(template.config.showDateStamp).toBe(false);
      expect(template.config.stickerList).toEqual([]);
      expect(template.config.memoryCard.enabled).toBe(false);
    });
  });
});
