import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import DashboardStatsCard from "./DashboardStatsCard";

const UsersCard = () => {
  const [userCount, setUserCount] = useState(0);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      let usersQuery;
      if (filter === "all") {
        usersQuery = collection(db, "users");
      } else if (filter === "active") {
        usersQuery = query(collection(db, "users"), where("isActive", "==", true));
      } else {
        usersQuery = query(collection(db, "users"), where("isActive", "==", false));
      }
      const snap = await getDocs(usersQuery);
      setUserCount(snap.size);
    };
    fetchUsers();
  }, [filter]);

  return (
    <DashboardStatsCard title="Total Users" value={userCount}>
      <View style={styles.toggleContainer}>
        {["all", "active", "restricted"].map((f) => (
          <Pressable
            key={f}
            style={[styles.toggleButton, filter === f && styles.toggleActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.toggleText, filter === f && styles.toggleTextActive]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </DashboardStatsCard>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginHorizontal: 4,
    marginTop: 4,
  },
  toggleActive: {
    backgroundColor: "#0f37f1",
    borderColor: "#0f37f1",
  },
  toggleText: {
    fontSize: 14,
    color: "#444",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default UsersCard;
