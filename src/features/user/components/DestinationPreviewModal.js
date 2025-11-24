import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function DestinationPreviewModal({ visible, onClose, destination }) {
  if (!destination) return null;

  const { name, description, imageUrl, cityOrMunicipality, kind } = destination;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Image */}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
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
            {description ? (
              <Text style={styles.desc} numberOfLines={3}>
                {description}
              </Text>
            ) : null}
          </View>

          {/* Web Fallback Map */}
          {destination?.Coordinates && (
            <View style={styles.mapPreview}>
              <iframe
                title="MapPreview"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 12,
                }}
                src={`https://www.google.com/maps?q=${destination.Coordinates.latitude},${destination.Coordinates.longitude}&z=14&output=embed`}
              />
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.closeBtn]}
              onPress={onClose}
            >
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  image: { width: "100%", height: 180 },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  placeholderText: { color: "#9ca3af", fontWeight: "600" },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  meta: { color: "#6b7280", fontSize: 13, marginTop: 3 },
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
