// CustomDrawer.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, signOut } from "firebase/auth";

export default function CustomDrawer(props) {
  const {
    navigation,
    state,
    descriptors,
    isCollapsed,
    setIsCollapsed,
    role, // 👈 pass this down from navigator
  } = props;

  const [showConfirm, setShowConfirm] = useState(false);

  // Define restricted screens per role
  const restrictedForAdmin = [
    "User Management",
    "Audit Trail",
    "Logs / Reports",
    "Settings",
  ];

  // Drawer items with role filtering
  const filteredRoutes = state.routes.filter((route) => {
    if ( role === "admin" && restrictedForAdmin.includes(route.name)) {
      return false;
    }
    return true; // superadmin sees everything
  });

  // Default icons for known routes
  const defaultIcons = {
    Dashboard: "home-outline",
    "Admin Dashboard": "home-outline",
    "User Management": "people-outline",
    "Logs / Reports": "document-text-outline",
    Settings: "settings-outline",
    Notifications: "notifications-outline",
    "Support / Tickets": "help-circle-outline",
    "Audit Trail": "trail-sign-outline",
    "Manage Destinations": "map-outline",
    "Manage Events": "calendar-outline",
    Feedback: "chatbubble-ellipses-outline",
  };

  // Logout logic
  const confirmLogout = async () => {
    setShowConfirm(false);
    const auth = getAuth();
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: "AdminLogin" }], // adjust if your login screen is different
      });
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <>
      <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
        {/* Collapse toggle button */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsCollapsed(!isCollapsed)}
        >
          <Ionicons
            name={isCollapsed ? "arrow-forward" : "arrow-back"}
            size={24}
            color="black"
          />
          {!isCollapsed && <Text style={styles.toggleText}>Collapse</Text>}
        </TouchableOpacity>

        {/* Drawer items */}
        <View style={{ flex: 1 }}>
          {filteredRoutes.map((route, index) => {
            const isFocused = state.index === index;
            const { drawerIcon, title } = descriptors[route.key].options;
            const iconName =
              drawerIcon || defaultIcons[title ?? route.name] || "ellipse-outline";

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={[
                  styles.drawerItem,
                  isFocused && styles.drawerItemFocused,
                  isCollapsed && styles.collapsedItem,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? "#007bff" : "#555"}
                />
                {!isCollapsed && (
                  <Text
                    style={[
                      styles.drawerLabel,
                      isFocused && styles.drawerLabelFocused,
                    ]}
                  >
                    {title ?? route.name}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout button */}
        <TouchableOpacity
          onPress={() => setShowConfirm(true)}
          style={styles.logoutButton}
        >
          <Ionicons name="log-out-outline" size={22} color="#b00" />
          {!isCollapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </DrawerContentScrollView>

      {/* Logout confirmation modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowConfirm(false)}
                style={styles.cancel}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmLogout} style={styles.confirm}>
                <Text style={{ color: "white" }}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  toggleText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  collapsedItem: {
    justifyContent: "center",
  },
  drawerItemFocused: {
    backgroundColor: "#e6f0ff",
  },
  drawerLabel: {
    marginLeft: 16,
    fontSize: 16,
    color: "#333",
  },
  drawerLabelFocused: {
    color: "#007bff",
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fdd",
  },
  logoutText: {
    color: "#b00",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 400,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancel: {
    padding: 10,
    marginRight: 10,
  },
  confirm: {
    backgroundColor: "#b00",
    padding: 10,
    borderRadius: 5,
  },
});
