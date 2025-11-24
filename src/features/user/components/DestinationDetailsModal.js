// src/features/user/components/DestinationDetailsModal.js
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

import { haversineKm, formatKm } from "../../recommender/distance";
import { navigateToExplore } from "../../../utils/navigateToExplore";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop";

const MAP_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

export default function DestinationDetailsModal({
  visible,
  onClose,
  destination,
  userLocation,
  onGetDirections,
}) {
  const [imgError, setImgError] = useState(false);
  const [driveDistText, setDriveDistText] = useState(null); // e.g. "12.3 km"

  const km = useMemo(() => {
    if (!userLocation) return null;
    const lat = destination?.Coordinates?.latitude;
    const lng = destination?.Coordinates?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
  }, [destination, userLocation]);

  const kindPretty = useMemo(() => {
    const k = destination?.kind || "";
    return k ? k.charAt(0).toUpperCase() + k.slice(1) : "—";
  }, [destination]);

  const contactEmail = destination?.contact?.email || "";
  const contactPhone =
    destination?.contact?.phoneRaw || destination?.contact?.phone || "";

  const heroSrc =
    !imgError && destination?.imageUrl
      ? { uri: destination.imageUrl }
      : { uri: FALLBACK_IMG };

  useEffect(() => {
    setDriveDistText(null);

    if (!visible) return;
    if (!userLocation || !destination || !MAP_API_KEY) return;

    const oLat = Number(userLocation.latitude);
    const oLng = Number(userLocation.longitude);
    const dLat = Number(destination?.Coordinates?.latitude);
    const dLng = Number(destination?.Coordinates?.longitude);
    if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) return;

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
          setDriveDistText(element.distance.text);
        }
      } catch {
        // ignore - fallback will render
      }
    })();

    return () => controller.abort();
  }, [visible, userLocation, destination]);

  if (!visible || !destination) return null;

  const handleCall = () => {
    if (!contactPhone) return;
    Linking.openURL(`tel:${contactPhone}`).catch(() => {});
  };

  const handleEmail = () => {
    if (!contactEmail) return;
    Linking.openURL(`mailto:${contactEmail}`).catch(() => {});
  };

  const handleGetDirections = () => {
    if (onGetDirections) return onGetDirections(destination);
    if (destination?.__nav) {
      navigateToExplore(destination.__nav, destination, { showRoute: true });
      return;
    }
    onClose?.();
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.heroWrap}>
          <Image
            source={heroSrc}
            style={styles.hero}
            onError={() => setImgError(true)}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: "rgba(15,55,241,0.9)" }]}>
              <Ionicons name="pricetag-outline" size={13} color="#fff" />
              <Text style={styles.chipText}>{kindPretty}</Text>
            </View>

            <View style={[styles.chip, { backgroundColor: "rgba(2,6,23,0.6)" }]}>
              <Ionicons name="navigate-outline" size={13} color="#fff" />
              <Text style={styles.chipText}>
                {driveDistText ?? (km == null ? "—" : formatKm(km))}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.xIcon} onPress={onClose} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={2}>
              {destination?.name || "Destination"}
            </Text>
            {!!destination?.cityOrMunicipality && (
              <Text style={styles.cityText} numberOfLines={1}>
                {destination.cityOrMunicipality}
              </Text>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>About</Text>
          <Text style={styles.descriptionText}>
            {destination?.description || "No description."}
          </Text>

          {contactPhone || contactEmail ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Contact</Text>
              {contactPhone ? (
                <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
                  <View style={[styles.iconPill, { backgroundColor: "#e0f2fe" }]}>
                    <Ionicons name="call-outline" size={18} color="#0f37f1" />
                  </View>
                  <Text style={styles.contactText}>{contactPhone}</Text>
                </TouchableOpacity>
              ) : null}
              {contactEmail ? (
                <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
                  <View style={[styles.iconPill, { backgroundColor: "#e0e8ff" }]}>
                    <Ionicons name="mail-outline" size={18} color="#0f37f1" />
                  </View>
                  <Text style={styles.contactText}>{contactEmail}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleGetDirections}>
          <Ionicons name="navigate-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Get Direction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SHEET_RADIUS = 16;

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 55, zIndex: 999 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" },

  sheet: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    height: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: "hidden",
  },

  heroWrap: { width: "100%", height: 190, backgroundColor: "#e2e8f0" },
  hero: { width: "100%", height: "100%" },

  chipsRow: { position: "absolute", top: 10, left: 12, flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  xIcon: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  titleWrap: { position: "absolute", left: 12, right: 12, bottom: 10 },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cityText: { marginTop: 2, color: "#e5e7eb", fontWeight: "700" },

  bodyScroll: { paddingHorizontal: 16, paddingTop: 12, maxHeight: 360 },

  sectionLabel: {
    color: "#64748b",
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  descriptionText: { color: "#0f172a", lineHeight: 20 },

  contactRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  iconPill: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  contactText: { color: "#0f37f1", fontWeight: "800" },

  primaryBtn: {
    marginTop: 10,
    marginBottom: 12,
    marginHorizontal: 16,
    backgroundColor: "#0f37f1",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },
});
