import React from "react";
import { View, Text, StyleSheet } from "react-native";

const DashboardStatsCard = ({ title, value, children }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    color: "#666",
    marginBottom: 6,
    textAlign: "center",
  },
  value: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
  },
});

export default DashboardStatsCard;
