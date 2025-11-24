import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth"; 
import { fetchEvents, toggleArchiveEvent, deleteEvent } from "../services/eventService";

// 🛡️ SAFE IMPORT: Handle missing logger
let logActivity = null;
try {
  const reportsModule = require("../../../services/firestoreReportsAndLogs");
  logActivity = reportsModule.logActivity;
} catch (e) {
  console.warn("⚠️ Logger module not found. Audit trail disabled.");
}

import EventFormModal from "../components/EventFormModal"; 
import EventDetailsModal from "../components/EventDetailsModal"; 

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); 
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isViewVisible, setIsViewVisible] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);

  const auth = getAuth();
  const getActorName = () => auth.currentUser?.email || auth.currentUser?.displayName || "system";
  const getActorId = () => auth.currentUser?.uid || "system";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      const sorted = data.sort((a, b) => {
         const dateA = a.startDate?.seconds || 0;
         const dateB = b.startDate?.seconds || 0;
         return dateB - dateA;
      });
      setEvents(sorted);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayedEvents = useMemo(() => {
    return events.filter((ev) => {
      const title = ev.title ? ev.title.toLowerCase() : "";
      const term = searchTerm.toLowerCase();
      const matchesSearch = title.includes(term);
      const status = ev.status || "active";
      const matchesStatus = status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, filterStatus]);

  // --- Handlers ---

  const handleAdd = () => {
    setSelectedEvent(null);
    setIsFormVisible(true);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setIsFormVisible(true);
  };

  const handleView = (event) => {
    setViewEvent(event);
    setIsViewVisible(true);
  };

  // --- 🛡️ CROSS-PLATFORM CONFIRMATION HELPER ---
  // This fixes the issue where Alert buttons don't work on Web
  const confirmAction = (title, message, onConfirm) => {
    if (Platform.OS === 'web') {
      // Web: Use browser native confirm
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      // Mobile: Use Native Alert
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: onConfirm }
      ]);
    }
  };

  // --- SAFE ACTIONS ---

  const safeLog = async (actionType, targetId, details) => {
    if (typeof logActivity === 'function') {
      try {
        await logActivity({
          actorName: getActorName(),
          actorId: getActorId(),
          actionType,
          targetEntity: "Event",
          targetId,
          details,
        });
      } catch (e) {
        console.warn("Logging failed silently:", e);
      }
    }
  };

  const handleSuccessSave = async (savedEvent, isEdit) => {
    setIsFormVisible(false);
    loadData();
    await safeLog(
      isEdit ? "UPDATE" : "CREATE",
      savedEvent.id || "new_event",
      `${isEdit ? 'Updated' : 'Created'} event: ${savedEvent.title}`
    );
  };

  const handleArchive = (event) => {
    const action = event.status === 'active' ? 'archive' : 'restore';
    
    confirmAction(
      "Confirm Action", 
      `Are you sure you want to ${action} "${event.title}"?`,
      async () => {
        // 1. Optimistic UI Update
        const newStatus = event.status === 'active' ? 'archived' : 'active';
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e));

        try {
          await toggleArchiveEvent(event.id, event.status);
          await safeLog(
            newStatus === 'archived' ? "ARCHIVE" : "UNARCHIVE",
            event.id,
            `${action === 'archive' ? 'Archived' : 'Restored'} event: ${event.title}`
          );
        } catch (e) { 
            // Revert on fail
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: event.status } : e));
            Alert.alert("Error", "Action failed."); 
        }
      }
    );
  };

  const handleDelete = (id, title) => {
    confirmAction(
      "Delete Event",
      "Are you sure? This cannot be undone.",
      async () => {
        console.log("Deleting...");
        // 1. Optimistic UI Update
        const previousEvents = [...events];
        setEvents(prev => prev.filter(e => e.id !== id));

        try {
          await deleteEvent(id);
          await safeLog("DELETE", id, `Deleted event: ${title}`);
        } catch (e) { 
            console.error(e);
            // Revert on fail
            setEvents(previousEvents);
            Alert.alert("Error", "Delete failed."); 
        }
      }
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(); 
  };

  const renderEventItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.eventInfo}>
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={24} color="#cbd5e1" />
              </View>
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.eventDesc} numberOfLines={1}>{item.description || "No description"}</Text>
          </View>
        </View>
        
        <View style={[
            styles.statusBadge, 
            item.status === 'active' ? styles.activeBadge : styles.archivedBadge
          ]}>
          <Text style={[
            styles.statusText,
            item.status === 'active' ? styles.activeText : styles.archivedText
          ]}>
            {item.status === 'active' ? 'Active' : 'Archived'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            {formatDate(item.startDate)}
            {item.eventType === 'range' && ` — ${formatDate(item.endDate)}`}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="list-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            {item.subEvents?.length || 0} Activities
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => handleView(item)} style={styles.iconBtn}>
          <Ionicons name="eye-outline" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color="#0f37f1" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handleArchive(item)} style={styles.iconBtn}>
          <Ionicons 
            name={item.status === 'active' ? "archive-outline" : "refresh-outline"} 
            size={20} 
            color="#f59e0b" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handleDelete(item.id, item.title)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.subtitle}>Manage schedule & activities</Text>
        </View>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>
        
        <View style={styles.tabContainer}>
          {['active', 'archived'].map((status) => (
            <TouchableOpacity 
              key={status}
              style={[styles.tabBtn, filterStatus === status && styles.activeTabBtn]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.tabText, filterStatus === status && styles.activeTabText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0f37f1" style={{ marginTop: 40 }} />
      ) : displayedEvents.length === 0 ? (
        <Text style={styles.emptyText}>No {filterStatus} events found.</Text>
      ) : (
        <FlatList
          data={displayedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <EventFormModal
        visible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        eventToEdit={selectedEvent}
        onSuccess={(savedData) => handleSuccessSave(savedData, !!selectedEvent)}
      />

      <EventDetailsModal 
        visible={isViewVisible}
        event={viewEvent}
        onClose={() => setIsViewVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: Platform.OS === 'ios' ? 10 : 0 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  addBtn: { backgroundColor: "#0f37f1", flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, shadowColor: "#0f37f1", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, marginLeft: 4 },
  filterContainer: { gap: 12, marginBottom: 16 },
  searchWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", height: "100%" },
  tabContainer: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 4, borderRadius: 10, alignSelf: 'flex-start' },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 7 },
  activeTabBtn: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  activeTabText: { color: "#0f172a" },
  listContent: { paddingBottom: 40 },
  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontSize: 15, fontStyle: 'italic' },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eventInfo: { flexDirection: "row", flex: 1, marginRight: 10 },
  imageContainer: { width: 50, height: 50, borderRadius: 10, backgroundColor: "#f1f5f9", overflow: "hidden", marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  eventImage: { width: "100%", height: "100%" },
  placeholderImage: { opacity: 0.5 },
  textContainer: { flex: 1, justifyContent: 'center' },
  eventTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 2 },
  eventDesc: { fontSize: 13, color: "#64748b" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  activeBadge: { backgroundColor: "#ecfdf5", borderColor: "#d1fae5" },
  archivedBadge: { backgroundColor: "#fffbeb", borderColor: "#fef3c7" },
  statusText: { fontSize: 11, fontWeight: "700" },
  activeText: { color: "#059669" },
  archivedText: { color: "#d97706" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  cardDetails: { flexDirection: "row", gap: 16, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
});