import { describe, expect, it } from 'vitest';
import { buildIceServers } from './usePeerVideo';

describe('WebRTC ICE configuration', () => {
  it('always includes a STUN server and adds TURN when fully configured', () => {
    expect(buildIceServers({})).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
    expect(
      buildIceServers({
        VITE_WEBRTC_TURN_URL: 'turn:turn.example.com:3478',
        VITE_WEBRTC_TURN_USERNAME: 'striply',
        VITE_WEBRTC_TURN_CREDENTIAL: 'secret'
      })
    ).toHaveLength(2);
  });
});
