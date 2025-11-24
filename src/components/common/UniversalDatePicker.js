import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function UniversalDatePicker({ label, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // --- WEB: Render HTML Input ---
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        {/* We use React.createElement to render a raw HTML <input> 
           This bypasses React Native's restrictions and uses the browser's native picker.
        */}
        {React.createElement("input", {
          type: "date",
          value: value || "",
          onChange: (e) => onChange(e.target.value),
          style: {
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "14px",
            color: "#0f172a",
            width: "100%",
            backgroundColor: "#f8fafc",
            outline: "none",
            fontFamily: "inherit",
          },
        })}
      </View>
    );
  }

  // --- MOBILE: Render Native Picker ---
  
  // Handle Android/iOS Selection
  const onMobileDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD
      if (Platform.OS === "android") {
        onChange(dateStr);
      } else {
        setTempDate(selectedDate); // iOS intermediate state
      }
    }
  };

  const confirmIOSDate = () => {
    const dateStr = tempDate.toISOString().split("T")[0];
    onChange(dateStr);
    setShowPicker(false);
  };

  const openMobilePicker = () => {
    const current = value ? new Date(value) : new Date();
    setTempDate(current);
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.mobileInput} onPress={openMobilePicker}>
        <Ionicons name="calendar-outline" size={20} color="#64748b" />
        <Text style={[styles.mobileText, !value && styles.placeholder]}>
          {value || "Select Date"}
        </Text>
      </TouchableOpacity>

      {/* Mobile Modal Logic */}
      {showPicker && (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="fade">
            <View style={styles.iosOverlay}>
              <View style={styles.iosContent}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="inline"
                  onChange={onMobileDateChange}
                />
                <TouchableOpacity onPress={confirmIOSDate} style={styles.iosBtn}>
                  <Text style={styles.iosBtnText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowPicker(false)} 
                  style={[styles.iosBtn, styles.cancelBtn]}
                >
                  <Text style={[styles.iosBtnText, styles.cancelText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={onMobileDateChange}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  // Mobile Styles
  mobileInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  mobileText: {
    fontSize: 14,
    color: "#0f172a",
  },
  placeholder: {
    color: "#94a3b8",
  },
  // iOS Modal Styles
  iosOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  iosContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxWidth: 350,
  },
  iosBtn: {
    marginTop: 10,
    backgroundColor: "#0f37f1",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    marginTop: 0,
  },
  iosBtnText: {
    color: "white",
    fontWeight: "700",
  },
  cancelText: {
    color: "#475569",
  },
});