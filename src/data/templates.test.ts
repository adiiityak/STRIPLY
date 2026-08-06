import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATEGORIES, TEMPLATE_DEFINITIONS } from './templates';

describe('pattern templates', () => {
  it('provides a dedicated Patterns category with text-free designs', () => {
    const patterns = TEMPLATE_DEFINITIONS.filter((template) => template.category === 'patterns');
    const uploadedPatterns = patterns.filter((template) => template.config.background.type === 'image');

    expect(TEMPLATE_CATEGORIES.some((category) => category.id === 'patterns')).toBe(true);
    expect(patterns).toHaveLength(25);
    expect(uploadedPatterns).toHaveLength(19);
    patterns.forEach((template) => {
      expect(['pattern', 'image']).toContain(template.config.background.type);
      expect(template.config.captionText).toBe('');
      expect(template.config.subCaptionText).toBe('');
      expect(template.config.showDateStamp).toBe(false);
      expect(template.config.stickerList).toEqual([]);
      expect(template.config.memoryCard.enabled).toBe(false);
    });
    uploadedPatterns.forEach((template) => {
      expect(template.config.background.imageUrl).toMatch(/^\/pattern-backgrounds\/.+\.png$/);
    });
  });
});
