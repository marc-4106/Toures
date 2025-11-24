import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DashboardStatsCard from "./DashboardStatsCard";
import DestinationModal, { DEFAULT_KIND_OPTIONS }from "../../components/common/DestinationModal";


import {
  fetchDestinations,
  addDestination,
} from "../../services/firestoreDestinations"; // ✅ reuse service

const DestinationsCard = () => {
  const [destinationCount, setDestinationCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({});

  const loadDestinations = async () => {
    const allDest = await fetchDestinations();

    if (filter === "all") {
      setDestinationCount(allDest.length);
    } else if (filter === "active") {
      setDestinationCount(allDest.filter((d) => !d.isArchived).length);
    } else {
      setDestinationCount(allDest.filter((d) => d.isArchived).length);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, [filter, modalVisible]); // re-run when modal closes

  const handleSave = async () => {
    await addDestination({ ...form, isArchived: false });
    setModalVisible(false);
    setForm({});
    loadDestinations(); // refresh stats
  };

  return (
    <DashboardStatsCard title="Total Destinations" value={destinationCount}>
      {/* Toggle buttons */}
      <View style={styles.toggleContainer}>
        {["all", "active", "archived"].map((f) => (
          <Pressable
            key={f}
            style={[styles.toggleButton, filter === f && styles.toggleActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.toggleText, filter === f && styles.toggleTextActive]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Add Destination */}
      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Destination</Text>
      </Pressable>

      {/* Destination Modal */}
      <DestinationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setForm({});
        }}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        kindOptions={DEFAULT_KIND_OPTIONS}  // ✅ pass directly here
      />

    </DashboardStatsCard>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginHorizontal: 4,
    marginTop: 4,
  },
  toggleActive: {
    backgroundColor: "#0f37f1",
    borderColor: "#0f37f1",
  },
  toggleText: {
    fontSize: 14,
    color: "#444",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  addButton: {
    marginTop: 12,
    backgroundColor: "#0f37f1",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default DestinationsCard;
