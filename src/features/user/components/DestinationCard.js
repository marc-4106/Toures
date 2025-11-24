// src/features/user/components/DestinationCard.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { navigateToExplore } from "../../../utils/navigateToExplore";
import { haversineKm, formatKm } from "../../recommender/distance";

const MAP_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

export default function DestinationCard({ item, userLocation, onPress }) {
  const [driveDistText, setDriveDistText] = useState(null);

  const lat = item?.Coordinates?.latitude;
  const lng = item?.Coordinates?.longitude;

  const straightKm = useMemo(() => {
    if (!userLocation || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
  }, [userLocation, lat, lng]);

  useEffect(() => {
    setDriveDistText(null);

    if (!userLocation || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!MAP_API_KEY) return; // offline or key missing - rely on haversine

    const oLat = Number(userLocation.latitude);
    const oLng = Number(userLocation.longitude);
    const dLat = Number(lat);
    const dLng = Number(lng);

    const controller = new AbortController();
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${oLat},${oLng}` +
      `&destinations=${dLat},${dLng}` +
      `&mode=driving&units=metric&key=${MAP_API_KEY}`;

    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        const element = json?.rows?.[0]?.elements?.[0];
        if (element?.status === "OK" && element?.distance?.text) {
          setDriveDistText(element.distance.text); // e.g. "12.3 km"
        }
      } catch {
        // ignore - UI will show haversine fallback
      }
    })();

    return () => controller.abort();
  }, [userLocation, lat, lng]);

  return (
    <TouchableOpacity onPress={() => onPress?.(item)} activeOpacity={0.9} style={styles.card}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.noImage]}>
          <Ionicons name="image-outline" size={28} color="#94a3b8" />
        </View>
      )}

      <View style={{ padding: 10 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cityText} numberOfLines={1}>
          {item.cityOrMunicipality || "—"}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description || "No description."}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.cardMeta}>
            Kind: {(item.kind || "").charAt(0).toUpperCase() + (item.kind || "").slice(1) || "—"}
          </Text>
          <Text style={styles.cardMeta}>
            • Distance: {driveDistText ?? (straightKm == null ? "—" : formatKm(straightKm))}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.smallBtn, styles.grayBtn]}
            onPress={(e) => {
              e.stopPropagation();
              onPress?.(item);
            }}
          >
            <Ionicons name="information-circle-outline" size={16} color="#111827" />
            <Text style={[styles.smallBtnText, { color: "#111827" }]}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, styles.primaryBtn]}
            onPress={(e) => {
              e.stopPropagation();
              navigateToExplore(item.__nav, item, { showRoute: true });
            }}
          >
            <Ionicons name="navigate-outline" size={16} color="#fff" />
            <Text style={[styles.smallBtnText, { color: "#fff" }]}>Get Direction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardImage: { width: "100%", height: 140, backgroundColor: "#f1f5f9" },
  noImage: { alignItems: "center", justifyContent: "center" },

  cardTitle: { fontWeight: "800", color: "#0f172a" },
  cityText: { color: "#64748b", marginTop: 1 },
  cardDesc: { color: "#475569", marginTop: 2 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  cardMeta: { color: "#0f172a", fontWeight: "700" },

  cardActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  grayBtn: { backgroundColor: "#f1f5f9" },
  primaryBtn: { backgroundColor: "#0f37f1" },
  smallBtnText: { fontWeight: "800" },
});
