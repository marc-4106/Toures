import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  AppState
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { auth, db } from "../../../services/firebaseConfig";
// Ensure Timestamp is imported here
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";

// New Helper Imports
import { getPermissionStatuses, requestPermission } from "../../../utils/permissionCheck";

// ... Row Component ...
function Row({ icon, label, right, onPress, danger }) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {!!icon && <Ionicons name={icon} size={18} color={danger ? "#ef4444" : "#0f172a"} />}
        <Text style={[styles.rowLabel, danger && { color: "#ef4444" }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {right || <Ionicons name="chevron-forward" size={16} color="#94a3b8" />}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}

// ... Section Component ...
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function AppSettingsScreen({ navigation }) {
  const [userEmail, setUserEmail] = useState("Loading...");
   
  // Individual Permission States
  const [perms, setPerms] = useState({
    location: false,
    camera: false,
    notifications: false
  });

  // 1. Initial Data Load & Permission Check
  const loadData = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setUserEmail(snap.data().email || user.email);
        else setUserEmail(user.email);
    } else {
        setUserEmail("Not signed in");
    }

    // CHECK ALL PERMISSIONS INDIVIDUALLY
    const statuses = await getPermissionStatuses();
    setPerms(statuses);

  }, []);

  // Listener for coming back from Settings
  useEffect(() => {
    loadData();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadData(); 
      }
    });
    return () => subscription.remove();
  }, [loadData]);


  // 2. Universal Toggle Handler
  const togglePermission = async (type, currentValue) => {
    // If it's already ON and user clicks, they want to turn it OFF
    if (currentValue === true) {
        Alert.alert(
            "Disable Permission",
            `To disable ${type}, you must do so in your device settings.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
            ]
        );
        return; // Don't change state, wait for app to reload from settings
    }

    // If it's OFF and user clicks, they want to turn it ON
    const granted = await requestPermission(type);
     
    if (granted) {
        setPerms(prev => ({ ...prev, [type]: true }));
    } else {
        // If denied (or "Don't ask again"), guide to settings
        Alert.alert(
            "Permission Required",
            `We cannot enable ${type} without your permission. Please allow it in Settings.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
            ]
        );
    }
  };

  // 3. DELETE ACCOUNT LOGIC (The implementation)
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Your account will be deactivated immediately and permanently deleted in 3 days. You can cancel this request by logging in again before then.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Schedule Deletion",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
              const userDocRef = doc(db, "users", user.uid);

              // Calculate 3 Days from now
              const deletionDate = new Date();
              deletionDate.setDate(deletionDate.getDate() + 3);

              // Mark in Firestore
              await updateDoc(userDocRef, {
                accountStatus: 'pending_deletion',
                deletionScheduledAt: Timestamp.fromDate(deletionDate),
              });

              // Sign the user out immediately
              await signOut(auth);
              
              // The Auth Context/Listener in your app should handle the redirect to Login
              Alert.alert("Scheduled", "Your account is scheduled for deletion in 72 hours.");
              
            } catch (error) {
              console.error("Schedule deletion error:", error);
              Alert.alert("Error", "Could not schedule deletion. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Account Settings</Text>

      <Section title="Account">
        <Row icon="person-circle-outline" label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
        <Row icon="mail-outline" label="Email" right={<Text style={styles.valueText}>{userEmail}</Text>} />
      </Section>

      <Section title="Device Permissions">
        {/* LOCATION SWITCH */}
        <Row
          icon="navigate-outline"
          label="Location"
          right={
            <Switch 
              value={perms.location} 
              onValueChange={() => togglePermission('location', perms.location)} 
            />
          }
        />
        
        {/* NOTIFICATIONS SWITCH */}
        <Row
          icon="notifications-outline"
          label="Notifications"
          right={
            <Switch 
              value={perms.notifications} 
              onValueChange={() => togglePermission('notifications', perms.notifications)} 
            />
          }
        />

        {/* CAMERA SWITCH (Android Only usually, or if supported on iOS) */}
        {Platform.OS === 'android' && (
            <Row
            icon="camera-outline"
            label="Camera"
            right={
                <Switch 
                value={perms.camera} 
                onValueChange={() => togglePermission('camera', perms.camera)} 
                />
            }
            />
        )}
        
        <View style={styles.hintWrap}>
            <Text style={styles.hintText}>
                Toggling a permission off will open system settings.
            </Text>
        </View>
      </Section>

      <Section title="Privacy">
        <Row icon="document-text-outline" label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
        <Row icon="trash-outline" label="Delete account" danger onPress={handleDeleteAccount} />
      </Section>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  screenTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#334155", marginBottom: 6, marginLeft: 4 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rowRight: { alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, color: "#0f172a", fontWeight: "600", flexShrink: 1 },
  valueText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  hintWrap: { paddingHorizontal: 12, paddingVertical: 10 },
  hintText: { color: "#64748b", fontSize: 12 },
});