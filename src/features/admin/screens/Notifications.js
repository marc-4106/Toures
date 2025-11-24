import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import {
  getAllNoti,
  markRead,
  getUnreadCount,
  markAllRead,
  clearAllNoti,
  notiEmitter,
} from "../../../services/notificationLogs";

import { getFirestore, doc, updateDoc } from "firebase/firestore";
import app from "../../../services/firebaseConfig";

export default function Notifications() {
  const [notis, setNotis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState(null);

  const navigation = useNavigation();
  const db = getFirestore(app);

  async function loadNotis() {
    setLoading(true);
    try {
      const all = await getAllNoti();
      const count = await getUnreadCount();
      setNotis(all);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotis();
    const sub = notiEmitter.addListener("updated", loadNotis);
    return () => sub.remove();
  }, []);

  const handleNotificationClick = async (item) => {
    if (!item.read) {
      await markRead(item.id);
      loadNotis();
    }
    setSelectedNoti(item);
    setModalVisible(true);
  };

  const handleAction = async (actionType) => {
    if (!selectedNoti) return;

    if (actionType === "ticket" && selectedNoti.data?.ticketId) {
      try {
        const ticketRef = doc(db, "supportTickets", selectedNoti.data.ticketId);
        await updateDoc(ticketRef, { status: "pending" });
      } catch (err) {
        console.error("Failed to update ticket status:", err);
      }
      navigation.navigate("Support / Tickets", { ticketId: selectedNoti.data.ticketId });
    } else if (actionType === "destination" && selectedNoti.data?.destinationId) {
      navigation.navigate("DestinationsDetail", { id: selectedNoti.data.destinationId });
    }
    setModalVisible(false);
  };

  const handleMarkAllRead = () => {
    Alert.alert("Mark All as Read", "Mark all notifications as read?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          await markAllRead();
          loadNotis();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Clear All", "This will delete all notifications. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await clearAllNoti();
          loadNotis();
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotis();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.unreadItem]}
      onPress={() => handleNotificationClick(item)}
      activeOpacity={0.8}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title} {!item.read && <Text style={styles.newBadge}>NEW</Text>}
        </Text>
      </View>
      <Text style={styles.itemBody} numberOfLines={2}>
        {item.body}
      </Text>
      <Text style={styles.itemTime}>
        {new Date(item.receivedAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.iconBtn}>
            <Ionicons name="checkmark-done-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearAll} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
          <View style={styles.badgeWrapper}>
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Notification List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0f172a" style={{ marginTop: 30 }} />
      ) : notis.length === 0 ? (
        <Text style={styles.empty}>No notifications yet.</Text>
      ) : (
        <FlatList
          data={notis}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 50 }}
        />
      )}

      {/* Modal Preview */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedNoti?.title}</Text>
            <Text style={styles.modalBody}>{selectedNoti?.body}</Text>
            <View style={styles.modalActions}>
              {selectedNoti?.data?.ticketId && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleAction("ticket")}
                >
                  <Text style={styles.actionText}>View Ticket</Text>
                </TouchableOpacity>
              )}
              {selectedNoti?.data?.destinationId && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#0f37f1" }]}
                  onPress={() => handleAction("destination")}
                >
                  <Text style={[styles.actionText, { color: "#fff" }]}>View Destination</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#e2e8f0" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.actionText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBtn: { padding: 6 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  badgeWrapper: { position: "relative" },
  badge: { position: "absolute", top: -6, right: -8, backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  item: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  unreadItem: { backgroundColor: "#f1f5f9" },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  itemTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  newBadge: { backgroundColor: "#0f37f1", color: "#fff", fontSize: 10, fontWeight: "700", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: "hidden", marginLeft: 6 },
  itemBody: { color: "#334155", fontSize: 14, marginBottom: 6 },
  itemTime: { fontSize: 12, color: "#94a3b8", textAlign: "right" },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40, fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "100%", maxWidth: 400, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12, color: "#0f172a" },
  modalBody: { fontSize: 14, color: "#334155", marginBottom: 20 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  actionBtn: { backgroundColor: "#16a34a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionText: { fontWeight: "700", color: "#fff" },
});
