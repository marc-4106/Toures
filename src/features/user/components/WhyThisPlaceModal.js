// WhyThisPlaceModal.js

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatPercent = (v) => Math.round(v * 100);

export default function WhyThisPlaceModal({ visible, onClose, data }) {
  if (!data) return null;

  const {
    place,
    normalizedTags,
    distanceKm,
    fuzzyComponents,
    normalizedWeights,
    priorityUsed,
    travelerType,
    lodgingPref,
    kindMultiplierUsed,
    finalScore,
  } = data;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Why this place?</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: "85%" }}>
            {/* Place */}
            <Text style={styles.placeTitle}>{place}</Text>

            {/* Score */}
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Overall Match</Text>
              <Text style={styles.finalScore}>
                {formatPercent(finalScore)}%
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Interest Fit */}
            <Text style={styles.sectionTitle}>
              <Ionicons name="heart-outline" size={18} color="#0f37f1" /> Interest Match
            </Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Interest Fit:</Text>
              <Text style={styles.metricValue}>
                {formatPercent(fuzzyComponents.interestFit)}%
              </Text>
            </View>

            {/* Tags */}
            <Text style={styles.subSectionTitle}>Matched Tags:</Text>
            <View style={styles.tagList}>
              {normalizedTags.map((t, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Distance */}
            <Text style={styles.sectionTitle}>
              <Ionicons name="navigate-outline" size={18} color="#0f37f1" /> Distance
            </Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Distance:</Text>
              <Text style={styles.metricValue}>{distanceKm.toFixed(1)} km</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Distance Fit:</Text>
              <Text style={styles.metricValue}>
                {formatPercent(fuzzyComponents.distanceFit)}%
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Price */}
            <Text style={styles.sectionTitle}>
              <Ionicons name="pricetag-outline" size={18} color="#0f37f1" /> Price Fit
            </Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Price Fit:</Text>
              <Text style={styles.metricValue}>
                {formatPercent(fuzzyComponents.priceFit)}%
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Weight distribution */}
            <Text style={styles.sectionTitle}>
              <Ionicons name="stats-chart-outline" size={18} color="#0f37f1" /> Weight
              Distribution
            </Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Interest Weight:</Text>
              <Text style={styles.metricValue}>
                {(normalizedWeights.interest * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Distance Weight:</Text>
              <Text style={styles.metricValue}>
                {(normalizedWeights.distance * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Price Weight:</Text>
              <Text style={styles.metricValue}>
                {(normalizedWeights.price * 100).toFixed(0)}%
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Special Boosts */}
            <Text style={styles.sectionTitle}>
              <Ionicons name="flame-outline" size={18} color="#0f37f1" /> Special Boosts
            </Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Priority Based On:</Text>
              <Text style={styles.metricValue}>{priorityUsed}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Traveler Type:</Text>
              <Text style={styles.metricValue}>{travelerType}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Lodging Pref:</Text>
              <Text style={styles.metricValue}>{lodgingPref}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Boost Multiplier:</Text>
              <Text style={styles.metricValue}>{kindMultiplierUsed.toFixed(2)}×</Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  placeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
    color: "#0f37f1",
  },

  subSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 4,
    color: "#475569",
  },

  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#475569",
  },
  finalScore: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f37f1",
  },

  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },

  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  metricLabel: {
    fontSize: 13,
    color: "#475569",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },

  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: "#3730a3",
    fontSize: 12,
    fontWeight: "600",
  },
});
