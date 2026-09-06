import { describe, expect, it } from 'vitest';
import { throttleAt } from './touch';

// A 160px track with a 44px knob: the knob's centre rides from y = 638 (down) to y = 522 (up).
const top = 500, height = 160, knob = 44;
const at = (y: number) => throttleAt(y, top, height, knob);

describe('throttleAt', () => {
  it('rests at zero with the thumb on the knob at the bottom of the track', () => {
    expect(at(top + height - knob / 2)).toBe(0);
  });

  it('is full throttle with the thumb on the knob at the top', () => {
    expect(at(top + knob / 2)).toBe(1);
  });

  it('rises in proportion to the push, halfway up the travel', () => {
    expect(at(top + height / 2)).toBeCloseTo(0.5);
    expect(at(top + height - knob / 2 - (height - knob) * 0.25)).toBeCloseTo(0.25);
  });

  it('pins at the ends when the thumb slides past the track', () => {
    expect(at(top - 400)).toBe(1);
    expect(at(top + height + 400)).toBe(0);
  });

  it('is zero for a track with no room to travel, rather than dividing by nothing', () => {
    expect(throttleAt(500, top, 40, 44)).toBe(0);
    expect(Number.isFinite(throttleAt(500, top, 44, 44))).toBe(true);
  });
});
