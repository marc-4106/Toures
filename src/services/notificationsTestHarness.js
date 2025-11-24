// src/services/notificationsTestHarness.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureNotiReady() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableLights: true,
      enableVibrate: true,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') throw new Error('Notification permission not granted');
}

export async function scheduleTestIn5s() {
  await ensureNotiReady();
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Toures test', body: 'If you see this, local notifications work.', sound: 'default' },
    trigger: { type: 'timeInterval', seconds: 5, channelId: 'default' },
  });
  return { id, when: new Date(Date.now() + 5000) };
}

function normalizeDate(input) {
  if (!input) return null;
  if (input.seconds && typeof input.seconds === 'number') return new Date(input.seconds * 1000); // Firestore Timestamp-like
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function scheduleDayBeforeTrip(tripStartLike) {
  await ensureNotiReady();
  const start = normalizeDate(tripStartLike);
  if (!start) throw new Error('Invalid tripStart passed to scheduleDayBefore');

  const when = new Date(start);
  when.setDate(when.getDate() - 1);
  when.setHours(9, 0, 0, 0);

  if (when.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Trip is tomorrow',
      body: 'Your Toures itinerary starts soon. Ready to go?',
      sound: 'default',
    },
    trigger: { type: 'date', timestamp: when.getTime(), channelId: 'default' },
  });
  return { id, when };
}

export async function cancelById(id) {
  if (!id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}

export async function scheduleOrReschedule(prevId, tripStartLike) {
  if (prevId) await cancelById(prevId);
  return scheduleDayBeforeTrip(tripStartLike); // returns { id, when } or null
}

export async function listScheduled() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  console.log('Scheduled notifications:', all);
  return all;
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
