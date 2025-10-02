import React from "react";
import { View, Text, Pressable, StyleSheet, Image, Switch } from "react-native";

const DestinationItem = ({ item, onEdit, onArchive, onUnarchive, onToggleFeatured, isArchivedView }) => (
  <View style={styles.card}>
    {item.imageUrl ? (
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
    ) : null}

    <Text style={styles.title}>{item.name}</Text>
    <Text>{item.description}</Text>

    {/* ✅ Show fuzzy fields */}
    <Text>Budget: ₱{item.budget}</Text>
    <Text>Popularity: {item.popularity}/10</Text>
    <Text>Category: {item.category}</Text>

    {/* Location */}
    <Text>Lat: {item.coordinates?.latitude}</Text>
    <Text>Lng: {item.coordinates?.longitude}</Text>


    {/* ✅ Toggle Switch for Featured */}
    <View style={styles.featuredRow}>
      <Text style={styles.featuredLabel}>Featured:</Text>
      <Switch
        value={item.isFeatured}
        onValueChange={(val) => onToggleFeatured(item.id, val)}
        thumbColor={item.isFeatured ? "#0f37f1" : "#ccc"}
        trackColor={{ true: "#5a7efc", false: "#ddd" }}
      />
    </View>

    {/* Actions */}
    <View style={styles.actions}>
      <Pressable style={[styles.button, styles.editButton]} onPress={() => onEdit(item)}>
        <Text style={styles.buttonText}>Edit</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isArchivedView ? styles.unarchiveButton : styles.archiveButton]}
        onPress={() => (isArchivedView ? onUnarchive(item.id) : onArchive(item.id))}
>
        <Text style={styles.buttonText}>{isArchivedView ? "Unarchive" : "Archive"}</Text>
      </Pressable>
    </View>
  </View>
);

export default DestinationItem;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    elevation: 3,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 4,
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  featuredLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: "#0f37f1",
  },
  unarchiveButton: {
  backgroundColor: "#28a745", 
  },
  archiveButton: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
