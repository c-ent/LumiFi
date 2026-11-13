/**
 * Helpers for the music player's progress bar. Times are in seconds, as
 * `expo-audio` reports them.
 */

/** A length the bar can use: finite and above zero, otherwise 0 (not loaded yet). */
export function trackLength(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

/** The position held inside 0..length, so a late status update never overshoots the bar. */
export function trackPosition(current: number, duration: number): number {
  const length = trackLength(duration);
  if (!Number.isFinite(current) || current <= 0) return 0;
  return Math.min(current, length);
}

/** "m:ss", or "h:mm:ss" from an hour up. Whole seconds, rounded down. */
export function formatTrackTime(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = String(whole % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secs}`;
  return `${minutes}:${secs}`;
}
