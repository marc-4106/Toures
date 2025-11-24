import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import app from "../../services/firebaseConfig";

export default function CustomDrawer(props) {
  const {
    navigation,
    state,
    descriptors,
    isCollapsed,
    setIsCollapsed,
    role,
    unreadCount,
  } = props;

  const [showConfirm, setShowConfirm] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Fetch current user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        const db = getFirestore(app);

        if (user) {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setUserInfo({
              name: data.name || user.displayName || "User",
              role: data.role || "Admin",
              photo: data.photoURL || user.photoURL || null,
            });
          } else {
            setUserInfo({
              name: user.displayName || "Admin",
              role: role || "Admin",
              photo: user.photoURL || null,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };
    loadUserInfo();
  }, []);

  // Role-based restrictions
 const restrictedForAdmin = ["User Management", "Audit Trail", "Reports", "Support / Tickets"];


  // Filter visible items
  const filteredRoutes = state.routes.filter((route) => {
    if (role === "admin" && restrictedForAdmin.includes(route.name)) {
      return false;
    }
    return true;
  });

  // Icons
  const defaultIcons = {
    Dashboard: "home-outline",
    "User Management": "people-outline",
    "Reports": "document-text-outline",
    "Settings": "settings-outline",
    Profile: "person-outline",
    Notifications: "notifications-outline",
    "Support / Tickets": "help-circle-outline",
    "Audit Trail": "time-outline",
    "Manage Destinations": "map-outline",
    "Manage Events": "calendar-outline",
    Feedback: "chatbubble-ellipses-outline",
  };

  const confirmLogout = async () => {
    setShowConfirm(false);
    const auth = getAuth();
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: "AdminLogin" }],
      });
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <>
      <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
        {/* ==== Header with user info ==== */}
        {!isCollapsed && (
          <View style={styles.userHeader}>
            <Image
              source={
                userInfo?.photo
                  ? { uri: userInfo.photo }
                  : require("../../../assets/profile.png")
              }
              style={styles.avatar}
            />
            <View>
              <Text style={styles.userName}>{userInfo?.name || "User"}</Text>
              <Text style={styles.userRole}>
                {userInfo?.role?.charAt(0).toUpperCase() +
                  userInfo?.role?.slice(1) || "Admin"}
              </Text>
            </View>
          </View>
        )}

        {/* Collapse button */}
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

        {/* Drawer Items */}
        <View style={{ flex: 1 }}>
          {filteredRoutes.map((route) => {
            const isFocused = state.routes[state.index]?.name === route.name;
            const { title } = descriptors[route.key].options;
            const iconName =
              defaultIcons[title ?? route.name] || "ellipse-outline";
            const showBadge = route.name === "Notifications" && unreadCount > 0;

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
                <View style={{ position: "relative" }}>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={isFocused ? "#007bff" : "#555"}
                  />
                  {showBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

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

        {/* Logout */}
        <TouchableOpacity
          onPress={() => setShowConfirm(true)}
          style={styles.logoutButton}
        >
          <Ionicons name="log-out-outline" size={22} color="#b00" />
          {!isCollapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </DrawerContentScrollView>

      {/* Logout confirmation */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>Are you sure you want to logout?</Text>
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
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#e6f0ff",
    borderBottomWidth: 1,
    borderColor: "#dbeafe",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  userRole: {
    fontSize: 13,
    color: "#64748b",
  },
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
  collapsedItem: { justifyContent: "center" },
  drawerItemFocused: { backgroundColor: "#e6f0ff" },
  drawerLabel: { marginLeft: 16, fontSize: 16, color: "#333" },
  drawerLabelFocused: { color: "#007bff", fontWeight: "600" },
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
  modalText: { fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancel: { padding: 10, marginRight: 10 },
  confirm: {
    backgroundColor: "#b00",
    padding: 10,
    borderRadius: 5,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
