// src/features/user/screens/UserExploreScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../../services/firebaseConfig";
import MapStyle from "../../../constant/MapStyle";
import { haversineKm, formatKm } from "../../recommender/distance";

const NEAR_ME_DISTANCE_KM = 5;

// Use the Directions key from EXPO_PUBLIC_… only
const MAP_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

const BACOLOD_REGION = {
  latitude: 10.6667,
  longitude: 122.95,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Pin colors per kind (lowercase keys; use exact kind strings you save)
const KIND_COLORS = {
  hotel: "#7C3AED",
  restaurant: "#F97316",
  resort: "#14B8A6",
  mall: "#EF4444",
  heritage: "#22C55E",
  activity: "#06B6D4",
  "pasalubong center": "#A855F7",
  default: "#3B82F6",
};

// kind chips (match saved lowercase kinds)
const KIND_CHIPS = [
  "All",
  "hotel",
  "restaurant",
  "resort",
  "mall",
  "heritage",
  "activity",
  "pasalubong center",
];

const normKind = (k) => (k ? String(k).toLowerCase() : "");

export default function UserExploreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState("All");
  const [proximityMode, setProximityMode] = useState("All"); // "All" | "Near"

  // 1) Location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Location permission denied. Showing default region.");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setUserLocation(current);
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            { ...current, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
            350
          );
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 2) Destinations (not archived)
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const q = query(
          collection(db, "destinations"),
          where("isArchived", "==", false)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => {
          const d = doc.data();
          const kind = normKind(d.kind);
          return {
            id: doc.id,
            ...d,
            kind,
            Coordinates: d.Coordinates || { latitude: 0, longitude: 0 },
            tags: Array.isArray(d.tags)
              ? d.tags
              : Array.isArray(d.categories)
              ? d.categories
              : [],
          };
        });
        setDestinations(data);
      } catch (e) {
        console.error("Fetch destinations error:", e);
        setErrorMsg("Failed to load destinations.");
      }
    };
    fetchDestinations();
  }, []);

  // 3) Directions polyline (Google Directions API)
  const getRoute = async (destinationCoords) => {
    if (!MAP_API_KEY) {
      Alert.alert(
        "Directions key missing",
        "Your Google Maps Directions API key was not found."
      );
      return;
    }

    if (
      !userLocation ||
      !Number.isFinite(userLocation.latitude) ||
      !Number.isFinite(userLocation.longitude)
    ) {
      Alert.alert("Error", "Your location is unknown.");
      return;
    }

    const dLat = Number(destinationCoords?.latitude);
    const dLng = Number(destinationCoords?.longitude);
    if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      Alert.alert("Invalid location", "Destination coordinates are invalid.");
      return;
    }

    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = `${dLat},${dLng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${MAP_API_KEY}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (!json.routes?.length) {
        const status = json.status || "UNKNOWN";
        const msg = json.error_message || "No route could be found.";
        Alert.alert(`Routing Error (${status})`, msg);
        setRouteCoordinates(null);
        setRouteInfo(null);
        return;
      }

      // polyline decode
      const points = json.routes[0].overview_polyline.points;
      const decode = (t) => {
        let pts = [],
          index = 0,
          lat = 0,
          lng = 0;
        while (index < t.length) {
          let b,
            shift = 0,
            result = 0;
          do {
            b = t.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          let dlat = (result & 1) ? ~(result >> 1) : result >> 1;
          lat += dlat;

          shift = 0;
          result = 0;
          do {
            b = t.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          let dlng = (result & 1) ? ~(result >> 1) : result >> 1;
          lng += dlng;

          pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
        }
        return pts;
      };
      const coords = decode(points);
      setRouteCoordinates(coords);

      // details
      const route0 = json.routes[0];
      const leg = route0.legs?.[0];
      setRouteInfo({
        distanceMeters: leg?.distance?.value ?? null,
        distanceText: leg?.distance?.text ?? "—",
        durationSeconds: leg?.duration?.value ?? null,
        durationText: leg?.duration?.text ?? "—",
        startAddress: leg?.start_address ?? "",
        endAddress: leg?.end_address ?? "",
        summary: route0?.summary ?? "",
        warnings: route0?.warnings ?? [],
      });

      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            { latitude: dLat, longitude: dLng },
          ],
          { edgePadding: { top: 60, right: 60, bottom: 120, left: 60 }, animated: true }
        );
      }
    } catch (e) {
      console.error("Directions error:", e);
      Alert.alert(
        "API Error",
        "Failed to fetch directions. Please check network/API key."
      );
      setRouteCoordinates(null);
      setRouteInfo(null);
    }
  };

  // 4) Filtered list (kind + proximity + search)
  const filtered = destinations.filter((d) => {
    // search
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      q.length === 0
        ? true
        : (d.name || "").toLowerCase().includes(q) ||
          (d.kind || "").toLowerCase().includes(q) ||
          (Array.isArray(d.tags) ? d.tags.join(" ") : "")
            .toLowerCase()
            .includes(q);

    // kind
    const matchesKind = kindFilter === "All" ? true : d.kind === kindFilter;

    // proximity
    let matchesProximity = true;
    if (proximityMode === "Near") {
      if (!userLocation) {
        matchesProximity = false;
      } else {
        const dist = haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          Number(d?.Coordinates?.latitude),
          Number(d?.Coordinates?.longitude)
        );
        matchesProximity = dist <= NEAR_ME_DISTANCE_KM;
      }
    }

    return !d.isArchived && matchesSearch && matchesKind && matchesProximity;
  });

  const handleMarkerPress = (destination) => {
    setSelectedDestination(destination);
    setRouteCoordinates(null);
    setRouteInfo(null);
    setIsModalVisible(true);
  };

  const handleDirectionsButton = () => {
    if (!selectedDestination) return;
    const lat = Number(selectedDestination?.Coordinates?.latitude);
    const lng = Number(selectedDestination?.Coordinates?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert("Invalid location", "This place has invalid or missing coordinates.");
      return;
    }
    setIsModalVisible(false);
    getRoute({ latitude: lat, longitude: lng });
  };

  const focusOnPlace = async ({
    id,
    name,
    latitude,
    longitude,
    showRoute = false,
  }) => {
    const dest = {
      id: id || `${latitude},${longitude}`,
      name: name || "Selected place",
      Coordinates: { latitude, longitude },
    };
    if (mapRef.current && latitude && longitude) {
      mapRef.current.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400
      );
    }
    setSelectedDestination(dest);
    setIsModalVisible(true);
    setRouteInfo(null);

    if (showRoute) {
      await getRoute({ latitude, longitude });
    }
  };

  useEffect(() => {
    const f = route.params?.focus;
    if (!f) return;
    const lat = Number(f.latitude);
    const lng = Number(f.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      focusOnPlace({
        id: f.id,
        name: f.name,
        latitude: lat,
        longitude: lng,
        showRoute: !!f.showRoute,
      });
    }
    navigation.setParams({ focus: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.focus]);

  const modalDistanceKm =
    selectedDestination && userLocation
      ? haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          Number(selectedDestination?.Coordinates?.latitude),
          Number(selectedDestination?.Coordinates?.longitude)
        )
      : null;

  // map helpers
  const recenterToUser = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion(
        { ...userLocation, latitudeDelta: 0.06, longitudeDelta: 0.06 },
        300
      );
    }
  };
  const clearRoute = () => {
    setRouteCoordinates(null);
    setRouteInfo(null);
  };
  const toggleNearMe = () => {
    if (!userLocation) {
      Alert.alert(
        "Location Required",
        'Enable location to use the "Near Me" filter.'
      );
      return;
    }
    setProximityMode((m) => (m === "Near" ? "All" : "Near"));
  };

  return (
    <View style={styles.container}>
      {/* MAP ABSOLUTE FULLSCREEN */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={BACOLOD_REGION}
        customMapStyle={MapStyle}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {filtered.map((dest) => {
          const lat = Number(dest?.Coordinates?.latitude);
          const lng = Number(dest?.Coordinates?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const pinColor = KIND_COLORS[dest.kind] || KIND_COLORS.default;

          return (
            <Marker
              key={dest.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={dest.name}
              description={dest.kind || undefined}
              onPress={() => handleMarkerPress(dest)}
              pinColor={pinColor}
            />
          );
        })}

        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#0f37f1"
          />
        )}
      </MapView>

      {/* TOP OVERLAYS (search + chips + near me toggle) */}
      <View style={styles.topOverlay}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={16}
            color="#64748b"
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, kind, tags…"
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color="#94a3b8"
                style={{ marginRight: 8 }}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Kind chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {KIND_CHIPS.map((chip) => {
            const active = kindFilter === chip;
            const isKind = chip !== "All";
            return (
              <TouchableOpacity
                key={chip}
                onPress={() => setKindFilter(chip)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                  isKind && KIND_COLORS[chip]
                    ? { borderColor: KIND_COLORS[chip] }
                    : null,
                ]}
              >
                {chip === "All" ? (
                  <Ionicons
                    name="grid"
                    size={12}
                    color={active ? "#0f37f1" : "#475569"}
                  />
                ) : (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          KIND_COLORS[chip] || KIND_COLORS.default,
                      },
                    ]}
                  />
                )}
                <Text style={[styles.chipText, active && { color: "#0f37f1" }]}>
                  {chip === "All"
                    ? "All"
                    : chip.charAt(0).toUpperCase() + chip.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Near Me toggle (single) */}
        <View style={styles.toggleRow}>
          <View style={styles.segment}>
            <TouchableOpacity
              onPress={toggleNearMe}
              style={[
                styles.segmentBtn,
                proximityMode === "Near" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  proximityMode === "Near" && styles.segmentTextActive,
                ]}
              >
                Near Me
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* FLOATING SMALL BUTTONS */}
      <View style={styles.fabs}>
        {routeCoordinates && (
          <TouchableOpacity style={styles.fab} onPress={clearRoute}>
            <Ionicons name="close" size={16} color="#0f172a" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.fab} onPress={recenterToUser}>
          <Ionicons name="locate" size={16} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* LOADING / ERROR */}
      {(isLoading || errorMsg) && (
        <View style={styles.loadingOverlay}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0f37f1" />
          ) : (
            <Text style={styles.errorText}>{errorMsg}</Text>
          )}
        </View>
      )}

      {/* BOTTOM SHEET MODAL */}
      {selectedDestination && (
        <View
          style={[styles.modalOverlay, { display: isModalVisible ? "flex" : "none" }]}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

            {selectedDestination.imageUrl ? (
              <Image
                source={{ uri: selectedDestination.imageUrl }}
                style={styles.hero}
              />
            ) : (
              <View style={[styles.hero, styles.heroFallback]}>
                <Ionicons name="image-outline" size={28} color="#94a3b8" />
              </View>
            )}

            <Text style={styles.title} numberOfLines={2}>
              {selectedDestination.name || "Destination"}
            </Text>

            <View style={styles.metaRow}>
              {selectedDestination.kind ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {selectedDestination.kind.charAt(0).toUpperCase() +
                      selectedDestination.kind.slice(1)}
                  </Text>
                </View>
              ) : null}

              {selectedDestination.cityOrMunicipality ? (
                <View style={[styles.badge, styles.badgeSoft]}>
                  <Ionicons name="location-outline" size={12} color="#0f172a" />
                  <Text style={[styles.badgeText, { color: "#0f172a" }]}>
                    {selectedDestination.cityOrMunicipality}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.badge, styles.badgeSoft]}>
                <Ionicons name="walk-outline" size={12} color="#0f172a" />
                <Text style={[styles.badgeText, { color: "#0f172a" }]}>
                  {modalDistanceKm == null
                    ? "—"
                    : `${formatKm(modalDistanceKm)} away`}
                </Text>
              </View>
            </View>

            {/* Description section */}
            <View style={styles.descBlock}>
              <Text style={styles.sectionLabel}>Description</Text>
              <ScrollView
                style={styles.descScroll}
                contentContainerStyle={{ paddingBottom: 2 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.descriptionText}>
                  {selectedDestination.description?.trim() ||
                    "No description available."}
                </Text>
              </ScrollView>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleDirectionsButton}
              >
                <Ionicons name="navigate-outline" size={14} color="#fff" />
                <Text style={styles.btnPrimaryText}>Get Directions</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeX}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeXText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ROUTE INFO CARD */}
      {routeCoordinates && routeInfo && !isModalVisible && (
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <Ionicons name="car-outline" size={16} color="#0f172a" />
            <Text style={styles.routeCardTitle}>
              {routeInfo.summary || "Best route"}
            </Text>
            <TouchableOpacity onPress={clearRoute} style={styles.routeCardClose}>
              <Ionicons name="close" size={16} color="#334155" />
            </TouchableOpacity>
          </View>

          <View style={styles.routeCardStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatPrimary}>{routeInfo.distanceText}</Text>
              <Text style={styles.routeStatLabel}>Distance</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeStat}>
              <Text style={styles.routeStatPrimary}>{routeInfo.durationText}</Text>
              <Text style={styles.routeStatLabel}>ETA</Text>
            </View>
          </View>

      

          {routeInfo.warnings?.length ? (
            <View style={styles.routeWarnings}>
              {routeInfo.warnings.map((w, i) => (
                <Text key={i} style={styles.routeWarningText}>
                  • {w}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  // top overlays
  topOverlay: {
    position: "absolute",
    top: Platform.select({ ios: 54, android: 24 }),
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 40,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },

  chipsRow: { paddingHorizontal: 12, paddingTop: 6, gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginRight: 6,
  },
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#93c5fd" },
  chipText: { fontWeight: "700", color: "#475569", fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 6 },

  // Near Me toggle
  toggleRow: {
    paddingHorizontal: 12,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  segmentBtnActive: {
    backgroundColor: "#0f37f1",
  },
  segmentText: {
    fontWeight: "800",
    color: "#0f172a",
    fontSize: 12,
  },
  segmentTextActive: {
    color: "#fff",
  },

  // fabs
  fabs: {
    position: "absolute",
    right: 12,
    bottom: 86,
    gap: 8,
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },

  // loading / error
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { marginTop: 10, color: "red", textAlign: "center" },

  // modal (bottom sheet)
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    bottom: 55,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginTop: 8,
    marginBottom: 8,
  },
  hero: { width: "100%", height: 140, backgroundColor: "#f1f5f9" },
  heroFallback: { alignItems: "center", justifyContent: "center" },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    paddingHorizontal: 14,
    marginTop: 10,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  badge: {
    backgroundColor: "#0f37f1",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeSoft: {
    backgroundColor: "#eef2ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  // Description
  descBlock: { paddingHorizontal: 14, marginTop: 10 },
  sectionLabel: { color: "#64748b", fontWeight: "800", marginBottom: 6 },
  descScroll: { maxHeight: 120 },
  descriptionText: { color: "#0f172a", lineHeight: 20 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimary: { backgroundColor: "#0f37f1" },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  closeX: { position: "absolute", top: 8, right: 8, padding: 6 },
  closeXText: { fontSize: 18, color: "#334155", fontWeight: "900" },

  // Route card
  routeCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 86, // above fabs
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  routeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeCardTitle: {
    marginLeft: 8,
    fontWeight: "900",
    color: "#0f172a",
    flex: 1,
  },
  routeCardClose: {
    padding: 4,
    marginLeft: 8,
  },
  routeCardStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingVertical: 8,
  },
  routeStat: {
    flex: 1,
    alignItems: "center",
  },
  routeStatPrimary: {
    fontWeight: "900",
    color: "#0f172a",
  },
  routeStatLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
    marginTop: 2,
  },
  routeDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e2e8f0",
  },
  routeAddresses: { marginTop: 10, gap: 4 },
  routeAddressLine: { color: "#334155", fontWeight: "600" },
  routeWarnings: { marginTop: 8 },
  routeWarningText: { color: "#b45309", fontWeight: "700", fontSize: 12 },
});
