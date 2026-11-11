import { CYCLE_LENGTH } from './phase';
import type { TimerMode } from './types';
import type { ClockStatus } from './clock';

// What the timer shows around the time itself: the start button's label, the
// "Focus · 2 of 4" line, how many of the cycle's pips are lit, and the focus
// chip under the time. The three screen shells only arrange these.
//
// Two styles, because the layouts word things differently on purpose:
// `candle` is the phone and tablet (the candle is the button), `plain` is the
// desktop scene.

export type FaceStyle = 'candle' | 'plain';

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
};

const BREAK_LINE: Record<FaceStyle, string> = {
  candle: 'Stretch, sip some water, look away',
  plain: 'Stretch, drink some water, look away from the screen',
};

export interface FaceInput {
  mode: TimerMode;
  status: ClockStatus;
  /** Focus sessions completed. */
  cycle: number;
  /** The title of the task being focused on, or null for none. */
  activeTask: string | null;
}

export interface SessionFace {
  startLabel: string;
  /** "Focus · 2 of 4" in focus, the mode's name in a break. */
  cycleLine: string;
  /** How many of the `CYCLE_LENGTH` pips are lit. */
  pipsLit: number;
  /** The chip under the time: the task, an empty prompt, or the break line. */
  chip: { kind: 'task' | 'empty' | 'break'; text: string };
}

export function sessionFace({ mode, status, cycle, activeTask }: FaceInput, style: FaceStyle): SessionFace {
  const position = cycle % CYCLE_LENGTH;
  return {
    startLabel: startLabel(mode, status, style),
    cycleLine: mode === 'focus' ? `Focus · ${position + 1} of ${CYCLE_LENGTH}` : MODE_LABEL[mode],
    // A long break follows a full cycle, so every pip is lit through it.
    pipsLit: mode === 'long' ? CYCLE_LENGTH : position,
    chip: mode !== 'focus'
      ? { kind: 'break', text: BREAK_LINE[style] }
      : activeTask != null
        ? { kind: 'task', text: activeTask }
        : { kind: 'empty', text: 'Pick a task to focus on' },
  };
}

function startLabel(mode: TimerMode, status: ClockStatus, style: FaceStyle): string {
  if (status === 'running') return 'Pause';
  if (status === 'paused') return 'Resume';
  if (style === 'plain') return 'Start';
  return mode === 'focus' ? 'Light the candle' : 'Start break';
}
