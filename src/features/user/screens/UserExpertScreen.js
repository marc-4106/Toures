import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../../services/firebaseConfig";
import { cancelTripReminder } from "../../../services/notifications";

export default function UserExpertScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [itineraries, setItineraries] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingNameFor, setSavingNameFor] = useState(null);

  const goToPreferences = () => navigation.navigate("TravelPreferences");
  const goToArchived = () => navigation.navigate("ArchivedItineraries");

  const startInlineEdit = (trip) => {
    setEditingId(trip.id);
    setNameDraft(trip.name || trip?.preferences?.startCity?.label || "Unnamed Itinerary");
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setNameDraft("");
  };

  const saveInlineName = async (tripId) => {
    const newName = (nameDraft || "").trim() || "Unnamed Itinerary";
    try {
      setSavingNameFor(tripId);
      const ref = doc(db, "itineraries", tripId);
      await updateDoc(ref, { name: newName, updatedAt: serverTimestamp() });

      // optimistic local update
      setItineraries((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, name: newName } : t))
      );
      setEditingId(null);
      setNameDraft("");
    } catch (e) {
      // no toast here to keep it simple; could add Alert if you want
    } finally {
      setSavingNameFor(null);
    }
  };

  const autoArchiveExpiredItineraries = async (activeSnap) => {
    if (activeSnap.empty) return 0;
    const now = new Date();
    const batch = writeBatch(db);
    let toArchive = 0;

    activeSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const end = data?.preferences?.endDate
        ? new Date(data.preferences.endDate)
        : null;

      if (end && end < now && !data.isArchived) {
        toArchive += 1;
        batch.update(docSnap.ref, {
          isArchived: true,
          archivedAt: serverTimestamp(),
        });
      }
    });

    if (toArchive > 0) {
      await batch.commit();
      activeSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const end = data?.preferences?.endDate ? new Date(data.preferences.endDate) : null;
        if (end && end < new Date()) {
          cancelTripReminder(docSnap.id); // best effort
        }
      });
    }
    return toArchive;
  };

  const fetchItineraries = useCallback(async () => {
    try {
      setLoading(true);
      const userId = auth?.currentUser?.uid || "guest";

      const qActive = query(
        collection(db, "itineraries"),
        where("userId", "==", userId),
        where("isArchived", "==", false),
        orderBy("createdAt", "desc")
      );
      const snapActive = await getDocs(qActive);

      const changed = await autoArchiveExpiredItineraries(snapActive);

      const snapFinal = changed > 0 ? await getDocs(qActive) : snapActive;

      const trips = snapFinal.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItineraries(trips);
    } catch (err) {
      console.warn("Failed to load itineraries:", err);
      setItineraries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchItineraries();
    }, [fetchItineraries])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItineraries();
  };

  const goToItinerary = (trip) => {
    navigation.navigate("ItineraryDetails", { itinerary: trip });
  };

  const editItinerary = (trip) => {
    navigation.navigate("TravelPreferences", {
      mode: "edit",
      itineraryId: trip.id,
      savedItinerary: {
        hotel: trip.hotel,
        days: trip.days,
        totals: trip.totals,
        preferences: trip.preferences,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Explore with Toures ✈️</Text>
      <Text style={styles.sub}>
        Plan your next adventure — or revisit your saved itineraries.
      </Text>

      <TouchableOpacity
        onPress={goToPreferences}
        style={styles.startBtn}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Start Fuzzy Plan"
      >
        <Ionicons name="bulb-outline" size={18} color="#fff" />
        <Text style={styles.startBtnText}>Start Fuzzy Plan</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={goToArchived}
        style={styles.archivedBtn}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="View Archived Itineraries"
      >
        <Ionicons name="archive-outline" size={18} color="#0f37f1" />
        <Text style={styles.archivedBtnText}>View Archived</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0f37f1"]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#0f37f1" style={{ marginTop: 30 }} />
        ) : itineraries.length > 0 ? (
          itineraries.map((trip) => {
            const isEditing = editingId === trip.id;
            const isSaving = savingNameFor === trip.id;

            return (
              <View key={trip.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="sparkles-outline" size={20} color="#0f37f1" />

                  {isEditing ? (
                    <View style={styles.titleEditRow}>
                      <TextInput
                        style={styles.titleInput}
                        value={nameDraft}
                        onChangeText={setNameDraft}
                        autoFocus
                        placeholder="Itinerary name"
                        placeholderTextColor="#94a3b8"
                      />
                      <View style={styles.inlineBtns}>
                        <TouchableOpacity
                          onPress={() => saveInlineName(trip.id)}
                          disabled={isSaving}
                          style={[styles.iconSmall, { backgroundColor: "#16a34a" }]}
                          accessibilityRole="button"
                          accessibilityLabel="Save name"
                        >
                          {isSaving ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={cancelInlineEdit}
                          style={[styles.iconSmall, { backgroundColor: "#ef4444" }]}
                          accessibilityRole="button"
                          accessibilityLabel="Cancel edit"
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.titleDisplayRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {trip.name ||
                          trip.preferences?.startCity?.label ||
                          "Unnamed Itinerary"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => startInlineEdit(trip)}
                        style={styles.iconSmallGhost}
                        accessibilityRole="button"
                        accessibilityLabel="Rename itinerary"
                      >
                        <Ionicons name="pencil" size={14} color="#0f172a" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.tripDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#475569" />
                    <Text style={styles.detailText}>
                      Start City:{" "}
                      <Text style={styles.detailHighlight}>
                        {trip.preferences?.startCity?.label || "Unknown"}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#475569" />
                    <Text style={styles.detailText}>
                      Dates:{" "}
                      <Text style={styles.detailHighlight}>
                        {new Date(
                          trip.preferences?.startDate
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          trip.preferences?.endDate
                        ).toLocaleDateString()}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={16} color="#475569" />
                    <Text style={styles.detailText}>
                      Budget:{" "}
                      <Text style={styles.detailHighlight}>
                        ₱{trip.preferences?.maxBudget?.toLocaleString() || "0"}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="star-outline" size={16} color="#475569" />
                    <Text style={styles.detailText}>
                      Priority:{" "}
                      <Text style={styles.detailHighlight}>
                        {trip.preferences?.priority || "Balanced"}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnView]}
                    onPress={() => goToItinerary(trip)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#fff" />
                    <Text style={styles.btnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnEdit]}
                    onPress={() => editItinerary(trip)}
                  >
                    <Ionicons name="create-outline" size={16} color="#0f37f1" />
                    <Text style={[styles.btnText, { color: "#0f37f1" }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <Ionicons name="alert-circle-outline" size={28} color="#94a3b8" />
            <Text style={{ color: "#475569", marginTop: 8 }}>
              You don’t have a saved itinerary yet.
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              Tap “Start Fuzzy Plan” to create one.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 16 },
  heading: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginTop: 8 },
  sub: { marginTop: 6, color: "#475569", marginBottom: 12 },

  startBtn: {
    backgroundColor: "#0f37f1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#0f37f1",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 8,
      },
    }),
  },
  startBtnText: { color: "#fff", fontWeight: "800", marginHorizontal: 6 },

  archivedBtn: {
    backgroundColor: "#e0f2fe",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    marginBottom: 12,
  },
  archivedBtnText: { color: "#0f37f1", fontWeight: "800", marginHorizontal: 6 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },

  titleDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 4,
    gap: 8,
  },

  titleEditRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 4,
  },

  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", flex: 1 },

  titleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },

  inlineBtns: {
    flexDirection: "row",
    gap: 8,
  },

  iconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  iconSmallGhost: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  tripDetails: { marginVertical: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  detailText: { fontSize: 14, color: "#334155", marginLeft: 6 },
  detailHighlight: { fontWeight: "600", color: "#0f37f1" },

  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnView: { backgroundColor: "#0f37f1", flex: 1, marginRight: 6, justifyContent: "center" },
  btnEdit: {
    backgroundColor: "#e0f2fe",
    flex: 1,
    marginLeft: 6,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0ea5e9",
  },
  btnText: { fontWeight: "700", color: "#fff", marginLeft: 6 },
});
