// The session-end alarm. This is the only module that schedules or cancels the
// session-end notification, and the only one that creates its Android channel
// and asks for the permission to post it. AGENTS.md keeps exactly one scheduled
// notification alive at `endAt`, so every pause, resume, reset, skip and mode
// change cancels and reschedules through here. There is no foreground service
// for the countdown; the media playback service expo-audio owns is the only one.

import { TimerMode } from '@/src/core/types';
import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationVisibility,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  deleteNotificationChannelAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'session-end-alarm';
const PREVIOUS_CHANNEL_IDS = ['session-end', 'session-end-chime'];
export const SESSION_NOTIFICATION_ID = 'wickglow-session-end';
const SOUND = 'chime.mp3';

if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // The in-app chime already plays from the notification listener and the
      // finish handler. Letting the OS sound play too overlaps two chimes, so
      // only the background delivery, which never reaches the listener, sounds.
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Every schedule and cancel runs in order. Without this a newer cancel can run
 * while an older schedule is still awaiting its own cancel, and that schedule
 * then writes the stale deadline back as a fresh alarm.
 */
let mutationChain: Promise<void> = Promise.resolve();

function enqueueMutation(operation: () => Promise<void>): Promise<void> {
  const next = mutationChain.then(operation);
  mutationChain = next.catch(() => {});
  return next;
}

// True once the channel has been set up in this run of the app. The set-up is
// three native calls, and repeating them on every Start only delayed the alarm.
let channelReady = false;

/**
 * Sets up the session-end channel, once per run of the app. Android freezes
 * the sound of a channel the first time it is created. Two older channels
 * shipped silent, so they are deleted and replaced by one that plays the chime
 * on the alarm stream, which stays audible while music and ambient hold audio
 * focus. A failure leaves `channelReady` false, so the next Start tries again.
 */
async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  for (const id of PREVIOUS_CHANNEL_IDS) {
    try {
      await deleteNotificationChannelAsync(id);
    } catch (error) {
      reportNotificationError(`Could not remove notification channel ${id}.`, error, true);
    }
  }
  await setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Session end',
    importance: AndroidImportance.HIGH,
    sound: SOUND,
    audioAttributes: {
      usage: AndroidAudioUsage.ALARM,
      contentType: AndroidAudioContentType.SONIFICATION,
      flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
    },
    vibrationPattern: [0],
    enableVibrate: false,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  channelReady = true;
}

/**
 * Creates the Android channel and gets the permission, returning early on web
 * where there is nothing to schedule. `alreadyAsked` stops a second prompt: the
 * caller persists that flag, so a user who declined is not asked on the next
 * session. This runs when a session starts, not on launch.
 */
export async function prepareNotificationPermission(alreadyAsked: boolean): Promise<{ granted: boolean; asked: boolean }> {
  if (Platform.OS === 'web') return { granted: false, asked: alreadyAsked };
  try {
    await ensureChannel();
    const current = await getPermissionsAsync();
    if (current.granted) return { granted: true, asked: true };
    if (alreadyAsked) return { granted: false, asked: true };
    const next = await requestPermissionsAsync();
    return { granted: next.granted, asked: true };
  } catch (error) {
    reportNotificationError('Could not prepare session-end notifications.', error);
    return { granted: false, asked: alreadyAsked };
  }
}

/**
 * Moves the single session-end alarm to `endAt`. The cancel runs first so an
 * alarm still pending from the previous deadline cannot fire as well, and the
 * pair is serialised through `enqueueMutation` so two quick changes cannot
 * interleave. `alarmClock` delivery is deliberate: `bestEffort` can be deferred
 * by minutes on some Android builds, which is fine for a chat message but not
 * for a timer.
 */
export function scheduleSessionEnd(endAt: number, mode: TimerMode): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return enqueueMutation(async () => {
    try {
      await cancelScheduledNotificationAsync(SESSION_NOTIFICATION_ID);
    } catch (error) {
      reportNotificationError('Could not cancel the previous session-end notification.', error, true);
    }
    try {
      await scheduleNotificationAsync({
        identifier: SESSION_NOTIFICATION_ID,
        content: {
          title: 'Wickglow',
          body: mode === 'focus' ? 'Your focus session is complete.' : 'Your break is complete.',
          sound: SOUND,
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: new Date(endAt),
          channelId: CHANNEL_ID,
          delivery: 'alarmClock',
        },
      });
    } catch (error) {
      console.warn('Could not schedule the session-end notification.', error);
    }
  });
}

/** Drops the pending alarm, for a pause, reset, skip or mode change. */
export function cancelSessionEnd(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return enqueueMutation(async () => {
    try {
      await cancelScheduledNotificationAsync(SESSION_NOTIFICATION_ID);
    } catch (error) {
      reportNotificationError('Could not cancel the session-end notification.', error, true);
    }
  });
}

/**
 * Cancelling an alarm that was never scheduled, or deleting a channel that is
 * already gone, throws a "not found" error on the platform and is not a
 * problem. `expectedMissing` swallows those so a real failure is not buried
 * under the noise of the routine ones.
 */
function reportNotificationError(message: string, error: unknown, expectedMissing = false) {
  if (expectedMissing && isMissingNotificationError(error)) return;
  console.warn(message, error);
}

function isMissingNotificationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|does not exist|no notification|no channel/i.test(message);
}
