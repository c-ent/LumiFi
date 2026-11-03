import { glowStops, ORB_PAD, orbFrame } from './soft-orb';

describe('soft orb', () => {
  it('keeps a numeric edge centered when the blur padding grows the box', () => {
    const frame = orbFrame(460, { left: -120, top: -80 });
    expect(frame.style).toEqual({ width: 460 + ORB_PAD * 2, height: 460 + ORB_PAD * 2, left: -120 - ORB_PAD, top: -80 - ORB_PAD });
    expect(frame.shiftX).toBe(0);
    expect(frame.shiftY).toBe(0);
  });

  it('keeps a right and bottom edge centered', () => {
    const frame = orbFrame(400, { right: -120, bottom: -80 });
    expect(frame.style.right).toBe(-120 - ORB_PAD);
    expect(frame.style.bottom).toBe(-80 - ORB_PAD);
    expect(frame.shiftX).toBe(0);
  });

  it('shifts a percentage edge back by the padding', () => {
    const frame = orbFrame(260, { left: '52%', top: '8%' });
    expect(frame.style.left).toBe('52%');
    expect(frame.style.top).toBe('8%');
    expect(frame.shiftX).toBe(-ORB_PAD);
    expect(frame.shiftY).toBe(-ORB_PAD);
  });

  it('fades a blurred disc from solid to clear, in order', () => {
    const stops = glowStops(460);
    const offsets = stops.map((stop) => stop.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(new Set(offsets).size).toBe(offsets.length);
    expect(stops[0]).toEqual({ offset: 0, opacity: 1 });
    expect(stops[stops.length - 1]).toEqual({ offset: 1, opacity: 0 });
    const edge = stops.find((stop) => stop.opacity === 0.5);
    expect(edge?.offset).toBeGreaterThan(0.5);
    expect(edge?.offset).toBeLessThan(0.8);
  });
});
