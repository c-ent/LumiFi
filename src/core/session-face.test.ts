import { sessionFace } from './session-face';

const idleFocus = { mode: 'focus' as const, status: 'idle' as const, cycle: 0, activeTask: null };

describe('session face', () => {
  it('labels the start button by status, in each style', () => {
    expect(sessionFace(idleFocus, 'candle').startLabel).toBe('Light the candle');
    expect(sessionFace({ ...idleFocus, mode: 'short' }, 'candle').startLabel).toBe('Start break');
    expect(sessionFace(idleFocus, 'plain').startLabel).toBe('Start');
    expect(sessionFace({ ...idleFocus, mode: 'long' }, 'plain').startLabel).toBe('Start');
    for (const style of ['candle', 'plain'] as const) {
      expect(sessionFace({ ...idleFocus, status: 'running' }, style).startLabel).toBe('Pause');
      expect(sessionFace({ ...idleFocus, status: 'paused' }, style).startLabel).toBe('Resume');
    }
  });

  it('counts the place in the cycle of four', () => {
    expect(sessionFace(idleFocus, 'candle').cycleLine).toBe('Focus · 1 of 4');
    expect(sessionFace({ ...idleFocus, cycle: 3 }, 'candle').cycleLine).toBe('Focus · 4 of 4');
    expect(sessionFace({ ...idleFocus, cycle: 4 }, 'candle').cycleLine).toBe('Focus · 1 of 4');
    expect(sessionFace({ ...idleFocus, mode: 'short', cycle: 1 }, 'candle').cycleLine).toBe('Short break');
    expect(sessionFace({ ...idleFocus, mode: 'long', cycle: 4 }, 'candle').cycleLine).toBe('Long break');
  });

  it('lights one pip per finished focus, and all four through a long break', () => {
    expect(sessionFace(idleFocus, 'candle').pipsLit).toBe(0);
    expect(sessionFace({ ...idleFocus, mode: 'short', cycle: 3 }, 'candle').pipsLit).toBe(3);
    expect(sessionFace({ ...idleFocus, mode: 'long', cycle: 4 }, 'candle').pipsLit).toBe(4);
    expect(sessionFace({ ...idleFocus, cycle: 4 }, 'candle').pipsLit).toBe(0);
    // A long break picked by hand mid-cycle shows the sessions done, not four.
    expect(sessionFace({ ...idleFocus, mode: 'long', cycle: 1 }, 'candle').pipsLit).toBe(1);
    expect(sessionFace({ ...idleFocus, mode: 'long', cycle: 0 }, 'candle').pipsLit).toBe(0);
  });

  it('shows the task, an empty prompt, or the break line in the chip', () => {
    expect(sessionFace({ ...idleFocus, activeTask: 'Read chapter 3' }, 'candle').chip).toEqual({ kind: 'task', text: 'Read chapter 3' });
    expect(sessionFace(idleFocus, 'plain').chip).toEqual({ kind: 'empty', text: 'Pick a task to focus on' });
    expect(sessionFace({ ...idleFocus, mode: 'short', activeTask: 'Read chapter 3' }, 'candle').chip)
      .toEqual({ kind: 'break', text: 'Stretch, sip some water, look away' });
    expect(sessionFace({ ...idleFocus, mode: 'long' }, 'plain').chip)
      .toEqual({ kind: 'break', text: 'Stretch, drink some water, look away from the screen' });
  });
});
