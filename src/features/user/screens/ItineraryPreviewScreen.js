// src/features/user/screens/ItineraryPreviewScreen.js
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ItineraryPreview from "../components/ItineraryPreview";

export default function ItineraryPreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Safely read plan from params (might be missing)
  const incomingPlan = useMemo(() => route?.params?.plan ?? null, [route?.params?.plan]);

  // Local state so child can mutate via setPlan
  const [plan, setPlan] = useState(incomingPlan);

  // Sync when a new plan arrives
  useEffect(() => {
    if (incomingPlan) setPlan(incomingPlan);
  }, [incomingPlan]);

  // Empty-state UI if no plan is supplied
  if (!plan) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No itinerary yet</Text>
        <Text style={styles.emptySub}>
          Create your travel preferences to generate a plan.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("TravelPreferences")}
        >
          <Text style={styles.primaryBtnText}>Create Itinerary</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const onSave = () => {
    // TODO: Save plan to Firestore if needed
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <ItineraryPreview plan={plan} setPlan={setPlan} onSave={onSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  emptySub: { marginTop: 6, color: "#475569", textAlign: "center" },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#0f37f1",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
});   