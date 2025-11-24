// src/services/notifications.js
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotiReady() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default",
      enableVibrate: true,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") throw new Error("Notification permission not granted");
  }
}

// Cancel by Expo’s identifier (kept for convenience)
export async function cancelScheduled(identifier) {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {}
}

// 🔑 Cancel every scheduled notification that belongs to a specific itinerary
export async function cancelAllForItinerary(itinId) {
  if (!itinId) return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const mine = all.filter((n) => n?.content?.data?.itinId === itinId);
    await Promise.all(
      mine.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}

// Schedule a “day-before at hour:minute” local notif.
// Returns the Expo notification identifier or null if the time is past.
export async function scheduleDayBefore(itineraryLike, hour = 9, minute = 0) {
  await ensureNotiReady();

  const itinId = itineraryLike?.id;
  const start = itineraryLike?.preferences?.startDate || itineraryLike?.startDate;
  if (!itinId || !start) throw new Error("Invalid itinerary arg passed to scheduleDayBefore");

  const d = new Date(start);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid startDate in scheduleDayBefore");

  // Compute “day-before at hour:minute”
  const fireAt = new Date(d);
  fireAt.setDate(fireAt.getDate() - 1);
  fireAt.setHours(hour, minute, 0, 0);

  // If that moment is already in the past, skip scheduling
  if (fireAt.getTime() <= Date.now()) {
    return null;
  }

  // embed itinId so we can cancel by scanning later
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your trip is tomorrow",
      body: "Your Toures itinerary starts soon. Ready to go?",
      sound: "default",
      data: { itinId, kind: "day_before" },
    },
    trigger: fireAt, // absolute time
  });

  return identifier;
}
