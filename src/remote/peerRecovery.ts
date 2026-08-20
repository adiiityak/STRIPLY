import type { ParticipantRole } from './types';

export type PeerRecoveryAction =
  | 'restart-ice'
  | 'request-restart'
  | 'rebuild'
  | 'rebuild-and-request';

interface PeerRecoveryInputs {
  role: ParticipantRole;
  unhealthyChecks: number;
  signalingState: RTCSignalingState;
}

export function choosePeerRecovery({
  role,
  unhealthyChecks,
  signalingState
}: PeerRecoveryInputs): PeerRecoveryAction {
  if (role === 'guest') {
    return unhealthyChecks <= 1 ? 'request-restart' : 'rebuild-and-request';
  }
  return unhealthyChecks <= 1 && signalingState === 'stable' ? 'restart-ice' : 'rebuild';
}
