import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "../../../services/firebaseConfig";

export default function ArchivedItinerariesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

 const fetchArchived = useCallback(async () => {
  try {
    setLoading(true);
    const userId = auth?.currentUser?.uid || "guest";

    // try server-side order first (requires composite index)
    try {
      const q = query(
        collection(db, "itineraries"),
        where("userId", "==", userId),
        where("isArchived", "==", true),
        orderBy("archivedAt", "desc")
      );
      const snap = await getDocs(q);
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(arr);
    } catch (e) {
      // If index is missing or any query error, fall back to client-side sort
      console.warn("[ArchivedItineraries] orderBy failed, falling back. Error:", e?.message || e);
      const qNoOrder = query(
        collection(db, "itineraries"),
        where("userId", "==", userId),
        where("isArchived", "==", true)
      );
      const snap = await getDocs(qNoOrder);
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // robust client-side sort: handle Timestamp or Date or missing
      arr.sort((a, b) => {
        const ta = a.archivedAt?.toDate ? a.archivedAt.toDate() : a.archivedAt;
        const tb = b.archivedAt?.toDate ? b.archivedAt.toDate() : b.archivedAt;
        const va = ta instanceof Date ? ta.getTime() : 0;
        const vb = tb instanceof Date ? tb.getTime() : 0;
        return vb - va; // desc
      });

      setItems(arr);
    }
  } catch (e) {
    console.error("[ArchivedItineraries] fetch error:", e);
    setItems([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchArchived();
    }, [fetchArchived])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchArchived();
  };

  const goToItinerary = (trip) => {
    navigation.navigate("ItineraryDetails", { itinerary: trip });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.heading}>Archived Itineraries</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0f37f1"]} />
        }
      >
        {loading ? (
          <ActivityIndicator color="#0f37f1" style={{ marginTop: 30 }} />
        ) : items.length > 0 ? (
          items.map((trip) => (
            <View key={trip.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="archive-outline" size={20} color="#0f37f1" />
                <Text style={styles.cardTitle}>
                  {trip.name || trip.preferences?.startCity?.label || "Archived Itinerary"}
                </Text>
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
                      {new Date(trip.preferences?.startDate).toLocaleDateString()} -{" "}
                      {new Date(trip.preferences?.endDate).toLocaleDateString()}
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
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <Ionicons name="alert-circle-outline" size={28} color="#94a3b8" />
            <Text style={{ color: "#475569", marginTop: 8 }}>
              No archived itineraries yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  heading: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
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
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginLeft: 6, color: "#0f172a" },
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
  btnView: { backgroundColor: "#0f37f1", flex: 1, justifyContent: "center" },
  btnText: { fontWeight: "700", color: "#fff", marginLeft: 6 },
});
