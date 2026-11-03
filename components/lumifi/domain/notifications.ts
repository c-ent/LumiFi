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
export const SESSION_NOTIFICATION_ID = 'lumifi-session-end';
const SOUND = 'chime.mp3';

if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function prepareNotificationPermission(alreadyAsked: boolean): Promise<{ granted: boolean; asked: boolean }> {
  if (Platform.OS === 'web') return { granted: false, asked: alreadyAsked };
  try {
    // Android keeps the sound from the first time a channel is created. The earlier
    // channels were silent, so they are replaced by one that plays the chime on the
    // alarm stream, which is still audible while music and ambient hold audio focus.
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

export async function scheduleSessionEnd(endAt: number, mode: TimerMode): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelScheduledNotificationAsync(SESSION_NOTIFICATION_ID);
  } catch (error) {
    reportNotificationError('Could not cancel the previous session-end notification.', error, true);
  }
  try {
    await scheduleNotificationAsync({
      identifier: SESSION_NOTIFICATION_ID,
      content: {
        title: 'LumiFi',
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
}

export async function cancelSessionEnd(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelScheduledNotificationAsync(SESSION_NOTIFICATION_ID);
  } catch (error) {
    reportNotificationError('Could not cancel the session-end notification.', error, true);
  }
}

function reportNotificationError(message: string, error: unknown, expectedMissing = false) {
  if (expectedMissing && isMissingNotificationError(error)) return;
  console.warn(message, error);
}

function isMissingNotificationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|does not exist|no notification|no channel/i.test(message);
}
