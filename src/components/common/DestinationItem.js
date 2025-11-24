import React from "react";
import { View, Text, Pressable, StyleSheet, Switch } from "react-native";

const pretty = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

const DestinationItem = ({
  item,
  onEdit,
  onArchive,
  onUnarchive,
  onToggleFeatured,
  isArchivedView,
}) => {
  // Safe reads
  const name = item?.name || "";
  const description = item?.description || "";
  const kind = item?.kind ? pretty(String(item.kind)) : "—";
  const lat = item?.Coordinates?.latitude;
  const lng = item?.Coordinates?.longitude;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{name}</Text>
      {!!description && <Text style={styles.text}>{description}</Text>}

      {/* Kind + Tags */}
      <View style={styles.row}>
        <Text style={styles.meta}><Text style={styles.metaLabel}>Kind: </Text>{kind}</Text>
      </View>
   

      {/* Location */}
      <Text style={styles.meta}>
        <Text style={styles.metaLabel}>Lat: </Text>{lat ?? "—"}
      </Text>
      <Text style={styles.meta}>
        <Text style={styles.metaLabel}>Lng: </Text>{lng ?? "—"}
      </Text>

      {/* Featured toggle */}
      <View style={styles.featuredRow}>
        <Text style={styles.featuredLabel}>Featured:</Text>
        <Switch
          value={!!item.isFeatured}
          onValueChange={(val) => onToggleFeatured && onToggleFeatured(val)}
          thumbColor={item.isFeatured ? "#0f37f1" : "#f3f4f6"}
          trackColor={{ true: "#6ea8fe", false: "#d1d5db" }}
          accessibilityLabel="Toggle featured"
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.editButton]} onPress={() => onEdit && onEdit(item)}>
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            isArchivedView ? styles.unarchiveButton : styles.archiveButton,
          ]}
          onPress={() =>
            isArchivedView
              ? onUnarchive && onUnarchive() // parent already bound id+name
              : onArchive && onArchive()     // parent already bound id+name
          }
        >
          <Text style={styles.buttonText}>
            {isArchivedView ? "Unarchive" : "Archive"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default DestinationItem;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 4,
    color: "#0f172a",
  },
  text: {
    color: "#444",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  meta: {
    color: "#374151",
    marginTop: 2,
  },
  metaLabel: {
    fontWeight: "600",
    color: "#111827",
  },
  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  featuredLabel: {
    fontSize: 14,
    color: "#111827",
  },
  actions: {
    flexDirection: "row",
    marginTop: 14,
    justifyContent: "space-between",
    maxWidth: 500,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  archiveButton: {
    backgroundColor: "#FF9800",
  },
  unarchiveButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
