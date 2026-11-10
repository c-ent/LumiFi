// One import surface for the session, task and progress actions the provider
// needs, so `logic.tsx` does not reach into a dozen `src/core` modules itself.
// Every name is a straight re-export; this file holds no logic, and the pure
// implementations and their tests stay in `src/core` (see architecture.md).

export { timerProgress } from '@/src/core/deadline';
export { rollToToday } from '@/src/core/history';
export { modeAfterSkip, modeDurationMs } from '@/src/core/phase';
export { addSubtask, completeSession, removeTask, toggleTask } from '@/src/core/session';
export { addTask, focusTask, renameTask, setTaskDate, setTaskOpen } from '@/src/core/tasks';
export type { CompletedSession, SessionStep } from '@/src/core/session';
