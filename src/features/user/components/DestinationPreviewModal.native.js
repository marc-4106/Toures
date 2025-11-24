import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import MapStyle from "../../../constant/MapStyle";
import { haversineKm } from "../../recommender/distance";

// Load react-native-maps only on native
let MapView, Marker;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function DestinationPreviewModal({
  visible,
  onClose,
  destination,
  startCity,
}) {
  // Hooks must ALWAYS be here, first, no conditions
  const [distanceKm, setDistanceKm] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Extract destination fields safely AFTER hooks
  const name = destination?.name;
  const description = destination?.description;
  const imageUrl = destination?.imageUrl;
  const cityOrMunicipality = destination?.cityOrMunicipality;
  const kind = destination?.kind;
  const Coordinates = destination?.Coordinates;

  const hasCoords =
    Coordinates?.latitude != null && Coordinates?.longitude != null;

  /* ------------------------------------------
      Distance Calculation Effect
  ------------------------------------------ */
  useEffect(() => {
    if (!visible || !hasCoords) return;

    (async () => {
      // Prefer startCity if provided
      if (startCity?.lat && startCity?.lng) {
        const km = haversineKm(
          Number(startCity.lat),
          Number(startCity.lng),
          Number(Coordinates.latitude),
          Number(Coordinates.longitude)
        );
        setDistanceKm(Number(km.toFixed(2)));
        return;
      }

      // Fallback: user GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let location = await Location.getCurrentPositionAsync({});
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userLoc);

      const km = haversineKm(
        userLoc.latitude,
        userLoc.longitude,
        Number(Coordinates.latitude),
        Number(Coordinates.longitude)
      );
      setDistanceKm(Number(km.toFixed(2)));
    })();
  }, [visible, hasCoords, startCity, Coordinates]);

  /* ------------------------------------------
      If modal is closed or no destination
  ------------------------------------------ */
  if (!visible || !destination) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>

          {/* Image */}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.content}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.meta}>
              {(kind || "").toUpperCase()} • {cityOrMunicipality || "—"}
            </Text>

            {distanceKm != null && (
              <Text style={styles.distance}>
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m away`
                  : `${distanceKm} km away`}
              </Text>
            )}

            {description ? (
              <Text style={styles.desc} numberOfLines={3}>
                {description}
              </Text>
            ) : null}
          </View>

          {/* Map */}
          {hasCoords && Platform.OS !== "web" && (
            <View style={styles.mapPreview}>
              <MapView
                style={{ flex: 1 }}
                customMapStyle={MapStyle}
                initialRegion={{
                  latitude: Number(Coordinates.latitude),
                  longitude: Number(Coordinates.longitude),
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
              >
                <Marker
                  coordinate={{
                    latitude: Number(Coordinates.latitude),
                    longitude: Number(Coordinates.longitude),
                  }}
                  title={name}
                />

                {userLocation && (
                  <Marker
                    coordinate={userLocation}
                    pinColor="blue"
                    title="Your Location"
                  />
                )}
              </MapView>
            </View>
          )}

          {/* Web Fallback */}
          {hasCoords && Platform.OS === "web" && (
            <View style={styles.mapPreview}>
              <iframe
                title="MapPreview"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 12,
                }}
                src={`https://www.google.com/maps?q=${Coordinates.latitude},${Coordinates.longitude}&z=14&output=embed`}
              />
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.closeBtn]} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "95%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
  },
  image: { width: "100%", height: 180 },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  placeholderText: { color: "#9ca3af", fontWeight: "600" },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  meta: { color: "#6b7280", fontSize: 13, marginTop: 3 },

  distance: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "700",
    color: "#0f37f1",
  },

  desc: { color: "#374151", fontSize: 14, marginTop: 6, lineHeight: 18 },

  mapPreview: {
    height: 300,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  button: { flex: 1, paddingVertical: 14, alignItems: "center" },
  closeBtn: { backgroundColor: "#ef4444" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
