import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import MapView, { Marker } from "react-native-maps";




export default function DestinationMapModal({ visible, onClose, destination }) {
  if (!destination) return null;

  const { name, kind, cityOrMunicipality, Coordinates } = destination;
  const hasCoords =
    Coordinates?.latitude != null && Coordinates?.longitude != null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={styles.modal}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{name || "Destination Map"}</Text>
          {cityOrMunicipality ? (
            <Text style={styles.subtitle}>{cityOrMunicipality}</Text>
          ) : null}
        </View>

        {/* Map area */}
        {hasCoords ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: Number(Coordinates.latitude),
              longitude: Number(Coordinates.longitude),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: Number(Coordinates.latitude),
                longitude: Number(Coordinates.longitude),
              }}
              title={name}
              description={kind}
            />
          </MapView>
        ) : (
          <View style={styles.noCoords}>
            <Text style={styles.noCoordsText}>No coordinates available</Text>
          </View>
        )}

        {/* Footer */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Close Map</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    height: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  noCoords: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noCoordsText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 14,
    backgroundColor: "#0f37f1",
    alignItems: "center",
  },
  closeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
