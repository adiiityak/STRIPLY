import { describe, expect, it } from 'vitest';
import { judgeFrame } from './liveBackground';

type Verdict = ReturnType<typeof judgeFrame>;
const base: Verdict = { tier: 0, slowFrames: 0, hopelessFrames: 0, giveUp: false };

describe('judgeFrame', () => {
  it('holds the top cadence while frames are quick', () => {
    const verdict = judgeFrame({ ...base, elapsed: 30 });
    expect(verdict.tier).toBe(0);
    expect(verdict.giveUp).toBe(false);
  });

  it('forgives an occasional slow frame', () => {
    let state: Verdict = { ...base };
    for (let i = 0; i < 5; i += 1) state = judgeFrame({ ...state, elapsed: 250 });
    expect(state.tier).toBe(0);
    // A quick frame clears the run of slow ones.
    state = judgeFrame({ ...state, elapsed: 40 });
    expect(state.slowFrames).toBe(0);
  });

  it('steps down a tier after a sustained run of slow frames', () => {
    let state: Verdict = { ...base };
    for (let i = 0; i < 8; i += 1) state = judgeFrame({ ...state, elapsed: 250 });
    expect(state.tier).toBe(1);
    expect(state.giveUp).toBe(false);
  });

  // The previous guard quit outright, which is why a laptop running the model on
  // its CPU showed the "cannot preview smoothly" notice and no background at all.
  it('slows all the way down rather than giving up', () => {
    let state: Verdict = { ...base };
    for (let i = 0; i < 40; i += 1) state = judgeFrame({ ...state, elapsed: 250 });
    expect(state.tier).toBe(2);
    expect(state.giveUp).toBe(false);
  });

  it('does not give up on hopeless frames while a slower tier remains', () => {
    let state: Verdict = { ...base };
    for (let i = 0; i < 10; i += 1) state = judgeFrame({ ...state, elapsed: 1_500 });
    expect(state.giveUp).toBe(false);
  });

  it('gives up only when even the slowest tier cannot cope', () => {
    let state: Verdict = { tier: 2, slowFrames: 0, hopelessFrames: 0, giveUp: false };
    let gaveUp = false;
    for (let i = 0; i < 6; i += 1) {
      state = judgeFrame({ ...state, elapsed: 1_500 });
      gaveUp = gaveUp || state.giveUp;
    }
    expect(gaveUp).toBe(true);
  });
});
