import React, { useState, useMemo } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UniversalDatePicker from "../../../components/common/UniversalDatePicker"; 

const SubEventManager = ({ subEvents = [], onChange }) => {
  // Form State
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleAdd = () => {
    if (!title.trim() || !date) {
      Alert.alert("Missing Info", "Activity Name and Date are required.");
      return;
    }

    const newSub = { 
      id: Date.now().toString(), 
      title: title.trim(), 
      location: location.trim() || "TBD",
      date: date, // Date is required for grouping
      time: time.trim() || "All Day"
    };

    // Add to list and clear inputs (keep date for convenience?)
    onChange([...(subEvents || []), newSub]);
    setTitle("");
    setLocation("");
    setTime("");
    // setDate(""); // Optional: Keep date to add multiple events for same day easier
  };

  const handleDelete = (id) => {
    onChange((subEvents || []).filter((s) => s.id !== id));
  };

  // --- Grouping Logic ---
  const groupedEvents = useMemo(() => {
    const groups = {};
    const list = subEvents || [];

    // 1. Group by Date
    list.forEach(event => {
      const dateKey = event.date || "Undated";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    // 2. Sort Dates
    const sortedDates = Object.keys(groups).sort((a, b) => {
        if (a === "Undated") return 1;
        if (b === "Undated") return -1;
        return new Date(a) - new Date(b);
    });

    // 3. Sort Times within Dates (Optional simple string sort)
    sortedDates.forEach(date => {
        groups[date].sort((a, b) => a.time.localeCompare(b.time));
    });

    return { sortedDates, groups };
  }, [subEvents]);

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>Add Activity Schedule</Text>
      
      {/* Input Area */}
      <View style={styles.formContainer}>
        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>Activity Name</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Opening Ceremony" 
                    value={title} onChangeText={setTitle} 
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>Venue / Location</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g. City Plaza" 
                    value={location} onChangeText={setLocation} 
                />
            </View>
        </View>

        <View style={styles.row}>
            <View style={{ flex: 1 }}>
               <UniversalDatePicker 
                 label="Date"
                 value={date}
                 onChange={setDate}
               />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g. 8:00 AM" 
                    value={time} onChangeText={setTime} 
                />
            </View>
        </View>

        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add to Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Display */}
      <View style={styles.scheduleContainer}>
        {subEvents.length === 0 && (
            <Text style={styles.emptyText}>No activities scheduled yet.</Text>
        )}

        {groupedEvents.sortedDates.map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                    <Ionicons name="calendar" size={16} color="#0f37f1" />
                    <Text style={styles.dateHeaderText}>{dateKey}</Text>
                </View>

                {/* Events Table for this Date */}
                <View style={styles.table}>
                    {/* Table Header Row */}
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.th, { width: 80 }]}>Time</Text>
                        <Text style={[styles.th, { flex: 1 }]}>Event Name</Text>
                        <Text style={[styles.th, { flex: 1 }]}>Venue</Text>
                        <View style={{ width: 30 }} /> 
                    </View>

                    {/* Event Rows */}
                    {groupedEvents.groups[dateKey].map((event) => (
                        <View key={event.id} style={styles.tableRow}>
                            <Text style={[styles.td, styles.timeText]}>{event.time}</Text>
                            <Text style={[styles.td, styles.titleText, { flex: 1 }]}>{event.title}</Text>
                            <Text style={[styles.td, { flex: 1 }]}>{event.location}</Text>
                            
                            <TouchableOpacity onPress={() => handleDelete(event.id)} style={styles.deleteBtn}>
                                <Ionicons name="close-circle" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 16,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  
  /* Form Styles */
  formContainer: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#0f172a",
    height: 42, 
  },
  addBtn: {
    backgroundColor: "#0f37f1",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Schedule List Styles */
  scheduleContainer: {
    gap: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: 13,
    padding: 20,
  },
  dateGroup: {
    gap: 8,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  dateHeaderText: {
    color: "#0f37f1",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Table Styles */
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  th: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  td: {
    fontSize: 13,
    color: "#334155",
  },
  timeText: {
    width: 80,
    fontWeight: "600",
    color: "#0f172a",
  },
  titleText: {
    fontWeight: "600",
  },
  deleteBtn: {
    width: 30,
    alignItems: "flex-end",
  },
});

export default SubEventManager;