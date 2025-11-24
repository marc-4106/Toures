// src/features/notifications/useNotificationsBadge.js
import { useEffect, useState, useCallback, useRef } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_KEY = "toures.noti.log.v1"; // [{id,title,body,timestamp,read}]

async function loadLog() {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveLog(list) {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {}
}

export default function useNotificationsBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const listenersSet = useRef(false);

  const recompute = useCallback(async () => {
    const list = await loadLog();
    setUnreadCount(list.filter((x) => !x.read).length);
  }, []);

  const appendIfNew = useCallback(async (n, markRead = false) => {
    if (!n) return;
    const id = n.request?.identifier || n.identifier || String(Date.now());
    const title = n.request?.content?.title ?? n.content?.title ?? "Notification";
    const body = n.request?.content?.body ?? n.content?.body ?? "";
    const ts =
      n.date?.getTime?.() ??
      n.request?.trigger?.timestamp ??
      Date.now();

    const list = await loadLog();
    const exists = list.some((x) => x.id === id);
    if (!exists) {
      list.unshift({
        id,
        title,
        body,
        timestamp: ts,
        read: !!markRead,
      });
      await saveLog(list);
      setUnreadCount(list.filter((x) => !x.read).length);
    } else if (markRead) {
      const next = list.map((x) => (x.id === id ? { ...x, read: true } : x));
      await saveLog(next);
      setUnreadCount(next.filter((x) => !x.read).length);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const list = await loadLog();
    const next = list.map((x) => ({ ...x, read: true }));
    await saveLog(next);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    // initial compute on mount
    recompute();

    if (listenersSet.current) return;
    listenersSet.current = true;

    // Foreground receipt
    const sub1 = Notifications.addNotificationReceivedListener(async (n) => {
      await appendIfNew(n, false);
    });

    // Tapped/opened from tray
    const sub2 = Notifications.addNotificationResponseReceivedListener(
      async (resp) => {
        const n = resp?.notification;
        await appendIfNew(n, true);
      }
    );

    return () => {
      try { sub1.remove(); } catch {}
      try { sub2.remove(); } catch {}
      listenersSet.current = false;
    };
  }, [appendIfNew, recompute]);

  return { unreadCount, markAllRead, refresh: recompute };
}
