import { describe, expect, it } from 'vitest';
import { isForegroundCategory } from './backgroundRemoval';

describe('isForegroundCategory', () => {
  it('treats the selfie model background class as transparent', () => {
    expect(isForegroundCategory(0)).toBe(false);
  });

  it('keeps every person class', () => {
    expect([1, 2, 3, 4, 5].every(isForegroundCategory)).toBe(true);
  });
});
