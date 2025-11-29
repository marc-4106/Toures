// WhyThisPlaceModal.js

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatPercent = (v) => Math.round(v * 100);

export default function WhyThisPlaceModal({ visible, onClose, data }) {
  if (!data) return null;

  const {
    place,
    normalizedTags = [],
    distanceKm,
    fuzzyComponents,
    normalizedWeights,
    priorityUsed,
    travelerType,
    lodgingPref,
    seasonMode,
    seasonalEffects = [],
    kindMultiplierUsed,
    finalScore,
  } = data;

  const scrollRef = useRef(null);

  // Reset scroll on open
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dark background */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}
      />

      {/* Bottom Sheet Modal */}
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Why this place?</Text>

          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#334155" />
          </TouchableOpacity>
        </View>

          {/* Place */}
          <Text style={styles.placeTitle}>{place}</Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Overall Match</Text>
            <Text style={styles.finalScore}>{formatPercent(finalScore)}%</Text>
          </View>

          <View style={styles.divider} />

        {/* Scroll */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
        

          {/* Seasonal Effects */}
          <Text style={styles.sectionTitle}>
            <Ionicons name="cloud-outline" size={18} color="#0f37f1" />{" "}
            Seasonal Effects ({seasonMode})
          </Text>

          {seasonalEffects.length ? (
            seasonalEffects.map((e, i) => (
              <Text key={i} style={styles.seasonLine}>
                • {e}
              </Text>
            ))
          ) : (
            <Text style={styles.seasonLine}>
              No seasonal influence for this location.
            </Text>
          )}

          <View style={styles.divider} />

          {/* Interest */}
          <Text style={styles.sectionTitle}>
            <Ionicons name="heart-outline" size={18} color="#0f37f1" /> Interest
            Match
          </Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Interest Fit:</Text>
            <Text style={styles.metricValue}>
              {formatPercent(fuzzyComponents.interestFit)}%
            </Text>
          </View>

          <Text style={styles.subSectionTitle}>Matched Tags:</Text>
          <View style={styles.tagList}>
            {normalizedTags.length ? (
              normalizedTags.map((t, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.seasonLine}>No specific tags matched.</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Distance */}
          <Text style={styles.sectionTitle}>
            <Ionicons name="navigate-outline" size={18} color="#0f37f1" />{" "}
            Distance
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

          <View style={styles.divider} />

          {/* Price */}
          <Text style={styles.sectionTitle}>
            <Ionicons name="pricetag-outline" size={18} color="#0f37f1" /> Price
            Match
          </Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Price Fit:</Text>
            <Text style={styles.metricValue}>
              {formatPercent(fuzzyComponents.priceFit)}%
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Weights */}
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="stats-chart-outline"
              size={18}
              color="#0f37f1"
            />{" "}
            Weight Distribution
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

          <View style={styles.divider} />

          {/* Boosts */}
          <Text style={styles.sectionTitle}>
            <Ionicons name="flame-outline" size={18} color="#0f37f1" />{" "}
            Special Boosts
          </Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Priority:</Text>
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
            <Text style={styles.metricValue}>
              {kindMultiplierUsed.toFixed(2)}×
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 8,
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
  },

  scroll: {
    flexGrow: 0,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  placeTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
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

  sectionTitle: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
    color: "#0f37f1",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  metricLabel: { color: "#475569" },
  metricValue: { color: "#0f172a", fontWeight: "700" },

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
    fontWeight: "600",
  },

  seasonLine: {
    color: "#475569",
    fontSize: 13,
    marginBottom: 4,
  },
});
