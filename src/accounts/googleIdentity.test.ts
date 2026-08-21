import { describe, expect, it } from 'vitest';
import { describeSignInError } from './googleIdentity';

describe('describeSignInError', () => {
  // Google reports these through error_callback and shows nothing itself, so
  // without translating them a blocked sign-in is an apparently dead button --
  // which is exactly how the FedCM-suppressed case presented.
  it('explains a browser-blocked sign-in and offers a way forward', () => {
    const message = describeSignInError(undefined);
    expect(message).toMatch(/blocked/i);
    expect(message).toMatch(/incognito|third-party/i);
  });

  it('distinguishes a blocked pop-up from a blocked provider', () => {
    expect(describeSignInError('popup_failed_to_open')).toMatch(/pop-?ups/i);
  });

  it('treats a closed window as retryable rather than broken', () => {
    expect(describeSignInError('popup_closed')).toMatch(/try again/i);
  });

  it('never returns an empty message', () => {
    for (const type of [undefined, '', 'unknown', 'something_new']) {
      expect(describeSignInError(type).length).toBeGreaterThan(10);
    }
  });
});
