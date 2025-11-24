// src/services/notificationLogs.js
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "expo-modules-core"; // ✅ Add this

const STORAGE_KEY = "@toures/notifications_log_v1";
export const notiEmitter = new EventEmitter(); // ✅ Add this line

const nowISO = () => new Date().toISOString();
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function getAllNoti() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  } catch {
    return [];
  }
}

async function saveAllNoti(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function appendNoti({ id, title, body, data, receivedAt }) {
  const list = await getAllNoti();
  const entry = {
    id: id || genId(),
    title: title || "Notification",
    body: body || "",
    data: data || {},
    receivedAt: receivedAt || nowISO(),
    read: false,
  };
  await saveAllNoti([entry, ...list]);
  notiEmitter.emit("updated"); // ✅ Emit event for badge updates
  return entry.id;
}

export async function markRead(id) {
  if (!id) return;
  const list = await getAllNoti();
  let changed = false;
  const next = list.map((n) => {
    if (n.id === id && !n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) {
    await saveAllNoti(next);
    notiEmitter.emit("updated"); // ✅ Notify badge
  }
}

export async function markAllRead() {
  const list = await getAllNoti();
  const next = list.map((n) => ({ ...n, read: true }));
  await saveAllNoti(next);
  notiEmitter.emit("updated");
}

export async function clearAllNoti() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  notiEmitter.emit("updated");
}

export async function getUnreadCount() {
  const list = await getAllNoti();
  return list.filter((n) => !n.read).length;
}
export async function cleanupNoti() {
  console.log("cleanupNoti temporarily disabled");
  return;
}
