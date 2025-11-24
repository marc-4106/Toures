import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert, // Import Alert for error feedback
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  getAllNoti,
  markRead,
  markAllRead,
  clearAllNoti,
} from "../../../services/notificationLogs";

function timeAgo(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch {
    return "";
  }
}

export default function NotificationScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await getAllNoti();
    setItems(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onPressItem = async (item) => {
    // 1. Mark as read
    if (!item.read) {
      await markRead(item.id);
      // Reload list to update read status immediately
      load();
    }
    
    // 2. Handle Navigation/Deep Link
    const { itinId, type } = item.data;

    // Check if it's an Itinerary-related notification
    if (itinId) {
      // Assuming 'ItineraryDetails' is the route name for viewing a specific itinerary
      try {
        navigation.navigate("ItineraryDetails", { itineraryId: itinId });
      } catch (e) {
        // Fallback if navigation fails (e.g., screen not mounted or wrong name)
        console.error("Navigation error:", e);
        Alert.alert("Navigation Failed", "Could not open itinerary details.");
      }
    } else {
      // Handle other types of notifications, or do nothing.
      // console.log(`Notification tapped: ${item.title}`);
    }
  };

  const onMarkAll = async () => {
    await markAllRead();
    load();
  };

  const onClearAll = async () => {
    await clearAllNoti();
    load();
  };
  
  // 🟢 NEW: Calculate unread count
  const unreadCount = items.filter((item) => !item.read).length;

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.unread]}
        onPress={() => onPressItem(item)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={item.read ? "notifications-outline" : "notifications"}
            size={20}
            color={item.read ? "#334155" : "#0f37f1"}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text numberOfLines={1} style={styles.title}>
              {item.title || "Notification"}
            </Text>
            {!!item.body && (
              <Text numberOfLines={2} style={styles.body}>
                {item.body}
              </Text>
            )}
            <Text style={styles.time}>{timeAgo(item.receivedAt)}</Text>
          </View>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {/* 🟢 WRAP TITLE AND BADGE IN A CONTAINER */}
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              {/* Limit display to 99+ for large counts */}
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.smallBtn} onPress={onMarkAll}>
            <Ionicons name="checkmark-done-outline" size={16} color="#0f172a" />
            <Text style={styles.smallBtnText}>Mark all</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.danger]} onPress={onClearAll}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={[styles.smallBtnText, { color: "#fff" }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0f37f1"]} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="mail-open-outline" size={28} color="#94a3b8" />
            <Text style={{ color: "#475569", marginTop: 8 }}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headingContainer: { // 🟢 NEW: Container for the title and badge
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heading: { fontSize: 20, fontWeight: "800", color: "#0f172a" },

  // 🟢 NEW: Styles for the notification badge
  badgeContainer: {
    backgroundColor: "#ef4444", // Red color
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  // END NEW STYLES

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  smallBtnText: { fontWeight: "800", color: "#0f172a" },
  danger: { backgroundColor: "#ef4444" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  unread: { borderColor: "#c7d2fe", backgroundColor: "#eef2ff" },
  title: { fontWeight: "800", color: "#0f172a" },
  body: { color: "#334155", marginTop: 2 },
  time: { color: "#64748b", fontSize: 12, marginTop: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0f37f1",
    position: "absolute",
    top: 12,
    right: 12,
  },
});
