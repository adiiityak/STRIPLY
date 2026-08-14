import { describe, expect, it } from 'vitest';
import { shouldAnnounceReady, shouldSendOffer } from './negotiation';

describe('shouldAnnounceReady', () => {
  const base = { hasLocalStream: true, isListeningForSignals: true, alreadyAnnounced: false };

  it('announces once the peer can actually receive an offer', () => {
    expect(shouldAnnounceReady(base)).toBe(true);
  });

  // The whole point of the handshake: readiness must imply "I am listening".
  // Announcing before subscribing would let a partner offer into a void.
  it('stays silent while the camera is still pending', () => {
    expect(shouldAnnounceReady({ ...base, hasLocalStream: false })).toBe(false);
  });

  it('stays silent while no signal listener is attached', () => {
    expect(shouldAnnounceReady({ ...base, isListeningForSignals: false })).toBe(false);
  });

  it('does not announce twice', () => {
    expect(shouldAnnounceReady({ ...base, alreadyAnnounced: true })).toBe(false);
  });
});

describe('shouldSendOffer', () => {
  const base = { role: 'creator' as const, phase: 'ready' as const, hasPeer: true, alreadyOffered: false };

  it('offers once the room reports both peers ready', () => {
    expect(shouldSendOffer(base)).toBe(true);
  });

  // This is the regression. Offering on participant count alone dropped the
  // offer whenever the guest was still at the camera permission prompt, and
  // nothing ever re-offered, so both sides sat at connectionState 'new'.
  it('does not offer while the room is still in the lobby', () => {
    expect(shouldSendOffer({ ...base, phase: 'lobby' })).toBe(false);
  });

  it('only the creator offers', () => {
    expect(shouldSendOffer({ ...base, role: 'guest' })).toBe(false);
  });

  it('does not offer without a peer connection', () => {
    expect(shouldSendOffer({ ...base, hasPeer: false })).toBe(false);
  });

  it('does not re-offer for the same peer connection', () => {
    expect(shouldSendOffer({ ...base, alreadyOffered: true })).toBe(false);
  });

  it('still offers for a peer rebuilt later in the session', () => {
    // A retry after the booth has advanced must be able to renegotiate.
    expect(shouldSendOffer({ ...base, phase: 'countdown' })).toBe(true);
    expect(shouldSendOffer({ ...base, phase: 'review' })).toBe(true);
  });

  it('does not offer into a closed room', () => {
    expect(shouldSendOffer({ ...base, phase: 'closed' })).toBe(false);
  });
});
