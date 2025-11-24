// src/features/user/screens/ItineraryDetailsScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getDoc,
  doc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { cancelAllForItinerary } from "../../../services/notifications";

// simple rule-based categorization
export const categorizeTimeOfDay = (activityName = "") => {
  const text = activityName.toLowerCase();

  const morning = [
    "hike",
    "trek",
    "walk",
    "breakfast",
    "market",
    "museum",
    "heritage",
    "temple",
    "park",
  ];

  const afternoon = [
    "island",
    "snorkel",
    "swim",
    "boat",
    "beach",
    "lake",
    "lunch",
    "tour",
  ];

  const evening = [
    "sunset",
    "dinner",
    "night",
    "bar",
    "music",
    "romantic",
    "stargazing",
  ];

  if (morning.some((w) => text.includes(w))) return "morning";
  if (afternoon.some((w) => text.includes(w))) return "afternoon";
  if (evening.some((w) => text.includes(w))) return "evening";
  return "afternoon"; // fallback
};

export default function ItineraryDetailsScreen({ route, navigation }) {
  const paramItinerary = route.params?.itinerary || null;
  const itineraryId = route.params?.itineraryId || paramItinerary?.id;

  const [trip, setTrip] = useState(paramItinerary || null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const unsubRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!itineraryId) {
      setLoading(false);
      return;
    }
    const ref = doc(db, "itineraries", itineraryId);

    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) setTrip({ id: snap.id, ...snap.data() });
      } catch {}
      setLoading(false);
    })();

    unsubRef.current = onSnapshot(ref, (s) => {
      if (s.exists()) setTrip({ id: s.id, ...s.data() });
    });

    return () => unsubRef.current && unsubRef.current();
  }, [itineraryId]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const baseDays = trip?.days || [];
        const enriched = [];

        for (const day of baseDays) {
          const newDay = { ...day };

          const fetchDestination = async (item) => {
            try {
              if (!item?.id) return item || null;
              const ref = doc(db, "destinations", item.id);
              const snap = await getDoc(ref);
              if (snap.exists()) return { ...item, ...snap.data() };
              return item;
            } catch {
              return item;
            }
          };

          newDay.breakfast = await fetchDestination(day.breakfast);
          newDay.lunch = await fetchDestination(day.lunch);
          newDay.dinner = await fetchDestination(day.dinner);

          const fullActs = [];
          for (const act of day.activities || []) {
            try {
              const ref = doc(db, "destinations", act.id);
              const snap = await getDoc(ref);
              if (snap.exists()) {
                const data = snap.data();
                const activitiesList = data.activities || [];
                const categorized = activitiesList.map((a) => ({
                  name: a,
                  timeOfDay: categorizeTimeOfDay(a),
                }));
                fullActs.push({ ...act, ...data, categorizedActivities: categorized });
              } else {
                fullActs.push(act);
              }
            } catch {
              fullActs.push(act);
            }
          }
          newDay.activities = fullActs;

          enriched.push(newDay);
        }

        setDays(enriched);
      } catch (err) {
        console.error("Failed to load activities:", err);
        Alert.alert("Error", "Unable to load itinerary details.");
      }
    };

    if (trip) fetchActivities();
  }, [trip]);

  useEffect(() => {
    if (!trip?.deletionPending || !trip?.deletionScheduledAt) {
      setCountdown(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const targetMs =
      trip.deletionScheduledAt instanceof Timestamp
        ? trip.deletionScheduledAt.toDate().getTime()
        : new Date(trip.deletionScheduledAt).getTime();

    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setCountdown("00:00:00");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [trip?.deletionPending, trip?.deletionScheduledAt]);

  const isArchived = !!trip?.isArchived;
  const isPendingDelete = !!trip?.deletionPending;
  const canHardDelete = useMemo(() => {
    if (!trip?.deletionScheduledAt) return false;
    const t =
      trip.deletionScheduledAt instanceof Timestamp
        ? trip.deletionScheduledAt.toDate().getTime()
        : new Date(trip.deletionScheduledAt).getTime();
    return Date.now() >= t;
  }, [trip?.deletionScheduledAt]);

  const renderActivitiesForPeriod = (acts = [], period) => {
    const filtered = acts.filter((a) => a.categorizedActivities?.some((act) => act.timeOfDay === period));
    if (!filtered.length) return <Text style={styles.noActivity}>No activities for this period.</Text>;
    return filtered.map((dest, i) => (
      <View key={i} style={{ marginBottom: 8 }}>
        <Text style={styles.destTitle}>• {dest.name || dest.title}</Text>
        {dest.categorizedActivities
          .filter((act) => act.timeOfDay === period)
          .map((act, idx) => (
            <Text key={idx} style={styles.activityText}>
              - {act.name}
            </Text>
          ))}
      </View>
    ));
  };

  const markAsDone = async () => {
    const id = trip?.id;
    if (!id) return;
    try {
      setMarking(true);
      const ref = doc(db, "itineraries", id);

      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : null;
      const startDate = data?.preferences?.startDate || null;

      await cancelAllForItinerary(id, startDate, 9, 0);

      await updateDoc(ref, {
        isDone: true,
        isArchived: true,
        archivedAt: new Date(),
        notifDayBeforeId: null,
      });

      Alert.alert("Success", "This itinerary has been marked as done.");
      navigation.goBack?.();
    } catch (err) {
      console.error("Failed to archive itinerary:", err);
      Alert.alert("Error", "Unable to mark itinerary as done.");
    } finally {
      setMarking(false);
    }
  };

  const requestDelete = async () => {
    if (!trip?.id) return;
    try {
      const when = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "itineraries", trip.id), {
        isArchived: true,
        deletionPending: true,
        deletionScheduledAt: Timestamp.fromDate(when),
      });
      Alert.alert("Scheduled", "This itinerary will be deleted in 24 hours unless you cancel.");
    } catch (e) {
      Alert.alert("Error", "Failed to schedule deletion.");
    }
  };

  const cancelDeletion = async () => {
    if (!trip?.id) return;
    try {
      await updateDoc(doc(db, "itineraries", trip.id), {
        deletionPending: false,
        deletionScheduledAt: null,
      });
      Alert.alert("Canceled", "Deletion has been canceled.");
    } catch (e) {
      Alert.alert("Error", "Failed to cancel deletion.");
    }
  };

  const hardDeleteNow = async () => {
    if (!trip?.id) return;
    try {
      await deleteDoc(doc(db, "itineraries", trip.id));
      Alert.alert("Deleted", "The itinerary has been permanently deleted.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to delete.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f37f1" size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#64748b" }}>Itinerary not found.</Text>
      </View>
    );
  }

  const enrichedDays = days || [];

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerText}>🏨 Stay at: {trip.hotel?.primary?.name || "N/A"}</Text>

        {enrichedDays.map((day, idx) => (
          <View key={idx} style={styles.dayCard}>
            <Text style={styles.dayTitle}>📅 Day {day.day}</Text>

            <Text style={styles.timeLabel}>🌅 Morning</Text>
            <Text style={styles.mealText}>- Breakfast: {day.breakfast?.name || "—"}</Text>
            <Text style={styles.subLabel}>Activities:</Text>
            {renderActivitiesForPeriod(day.activities, "morning")}

            <Text style={styles.timeLabel}>🌞 Afternoon</Text>
            <Text style={styles.mealText}>- Lunch: {day.lunch?.name || "—"}</Text>
            <Text style={styles.subLabel}>Activities:</Text>
            {renderActivitiesForPeriod(day.activities, "afternoon")}

            <Text style={styles.timeLabel}>🌙 Evening</Text>
            <Text style={styles.mealText}>- Dinner: {day.dinner?.name || "—"}</Text>
            <Text style={styles.subLabel}>Activities:</Text>
            {renderActivitiesForPeriod(day.activities, "evening")}
          </View>
        ))}

        {isPendingDelete && (
          <View style={[styles.dayCard, { borderColor: "#fca5a5", backgroundColor: "#fff1f2" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
              <Text style={{ marginLeft: 8, color: "#991b1b", fontWeight: "700" }}>
                Scheduled for deletion in <Text style={{ fontWeight: "900" }}>{countdown || "00:00:00"}</Text>
              </Text>
            </View>
            <Text style={{ color: "#7f1d1d", marginTop: 4 }}>You can cancel below before the timer ends.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!isArchived && !isPendingDelete && (
          <TouchableOpacity style={styles.doneButton} onPress={markAsDone} disabled={marking}>
            {marking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                <Text style={styles.doneText}>Mark as Done</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isArchived && !isPendingDelete && (
          <TouchableOpacity style={[styles.deleteBtn]} onPress={requestDelete}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.doneText}>Delete</Text>
          </TouchableOpacity>
        )}

        {isArchived && isPendingDelete && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[styles.cancelBtn]} onPress={cancelDeletion}>
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.doneText}>Cancel deletion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hardDeleteBtn, !canHardDelete && { backgroundColor: "#94a3b8" }]}
              onPress={canHardDelete ? hardDeleteNow : undefined}
              disabled={!canHardDelete}
            >
              <Ionicons name="trash-bin-outline" size={18} color="#fff" />
              <Text style={styles.doneText}>{canHardDelete ? "Delete now" : "Waiting…"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 110 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerText: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  timeLabel: { fontSize: 15, fontWeight: "700", color: "#0f37f1", marginTop: 6 },
  mealText: { fontSize: 14, color: "#1e293b", marginLeft: 10, marginTop: 2 },
  subLabel: { fontSize: 13, color: "#475569", marginLeft: 10, marginTop: 4, marginBottom: 2 },
  destTitle: { fontSize: 14, fontWeight: "700", color: "#334155", marginLeft: 20 },
  activityText: { fontSize: 13, color: "#475569", marginLeft: 36 },
  noActivity: { fontSize: 12, color: "#9ca3af", marginLeft: 20, fontStyle: "italic" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  doneButton: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  doneText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  deleteBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  hardDeleteBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
});
