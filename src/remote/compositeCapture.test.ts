import { describe, expect, it } from 'vitest';
import { computeCoverCrop } from './compositeCapture';

describe('remote frame composition geometry', () => {
  it('center-crops a landscape camera into one portrait half', () => {
    expect(computeCoverCrop(1280, 720, 600, 900)).toEqual({ sx: 400, sy: 0, sw: 480, sh: 720 });
  });

  it('center-crops a portrait camera into a landscape half', () => {
    expect(computeCoverCrop(720, 1280, 600, 450)).toEqual({ sx: 0, sy: 370, sw: 720, sh: 540 });
  });
});
