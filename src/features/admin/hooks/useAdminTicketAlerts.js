// src/features/admin/hooks/useAdminTicketAlerts.js
import { useEffect } from "react";
import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { appendNoti } from "../../../services/notificationLogs";

export default function useAdminTicketAlerts(user) {
  useEffect(() => {
    // ✅ Run only if:
    // 1. user exists
    // 2. platform is web
    // 3. role is admin or superadmin
    if (
      !user ||
      Platform.OS !== "web" ||
      (user.role !== "admin" && user.role !== "superadmin")
    ) {
      return;
    }

    // Firestore listener only for this admin’s notifications
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      where("read", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const n = change.doc.data();
          const title = n.title || "New Support Ticket";
          const body = n.body || "A new user ticket has been submitted.";

          // ✅ Web only — show alert popup instead of push
          Alert.alert(title, body);
          console.log("🧭 Web admin notification:", title, body);

          // ✅ Log locally so the badge + log screen update
          await appendNoti({
            title,
            body,
            data: { ticketId: n.ticketId },
          });

          // Mark it read so it won't resend
          await updateDoc(change.doc.ref, { read: true });
        }
      });
    });

    return () => unsub();
  }, [user]);
}
