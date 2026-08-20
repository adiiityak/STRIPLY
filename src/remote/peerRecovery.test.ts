import { describe, expect, it } from 'vitest';
import { choosePeerRecovery } from './peerRecovery';

describe('WebRTC peer recovery', () => {
  it('lets the creator try an ICE restart before rebuilding the connection', () => {
    expect(
      choosePeerRecovery({ role: 'creator', unhealthyChecks: 1, signalingState: 'stable' })
    ).toBe('restart-ice');
    expect(
      choosePeerRecovery({ role: 'creator', unhealthyChecks: 2, signalingState: 'stable' })
    ).toBe('rebuild');
  });

  it('asks the creator for a fresh offer when the guest detects a failure', () => {
    expect(
      choosePeerRecovery({ role: 'guest', unhealthyChecks: 1, signalingState: 'stable' })
    ).toBe('request-restart');
    expect(
      choosePeerRecovery({ role: 'guest', unhealthyChecks: 2, signalingState: 'stable' })
    ).toBe('rebuild-and-request');
  });

  it('rebuilds immediately when the creator signaling state is wedged', () => {
    expect(
      choosePeerRecovery({ role: 'creator', unhealthyChecks: 1, signalingState: 'have-local-offer' })
    ).toBe('rebuild');
  });
});
