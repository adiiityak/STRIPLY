import type { ParticipantRole, RoomPhase } from './types';

// Phases in which a peer connection may be negotiated. Everything from 'ready'
// onward means both participants have announced they can receive an offer.
const NEGOTIABLE_PHASES: readonly RoomPhase[] = ['ready', 'countdown', 'review', 'complete'];

export interface ReadinessInputs {
  hasLocalStream: boolean;
  isListeningForSignals: boolean;
  alreadyAnnounced: boolean;
}

/**
 * A participant announces readiness only once it holds its camera AND has a
 * signal listener attached. Readiness has to mean "an offer sent to me now will
 * be handled", otherwise the partner offers into a void.
 */
export function shouldAnnounceReady({
  hasLocalStream,
  isListeningForSignals,
  alreadyAnnounced
}: ReadinessInputs): boolean {
  return hasLocalStream && isListeningForSignals && !alreadyAnnounced;
}

export interface OfferInputs {
  role?: ParticipantRole;
  phase: RoomPhase;
  hasPeer: boolean;
  alreadyOffered: boolean;
}

/**
 * The creator drives negotiation, but only after the room reports both peers
 * ready.
 *
 * Offering on participant count instead lost the handshake: the creator fired
 * its offer the moment the guest appeared in the roster, while the guest was
 * still at the OS camera prompt with no signal listener attached. The offer was
 * delivered to the guest's socket, dropped by an empty listener set, and never
 * re-sent, leaving both sides parked at connectionState 'new' with a black
 * remote pane.
 */
export function shouldSendOffer({ role, phase, hasPeer, alreadyOffered }: OfferInputs): boolean {
  if (role !== 'creator' || !hasPeer || alreadyOffered) return false;
  return NEGOTIABLE_PHASES.includes(phase);
}
