// CLEAN UPDATED VERSION — ALL USERNAME CHECKER CODE REMOVED

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../../../services/firebaseConfig";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import profile from "../../../../assets/profile.png";
import AddUserModal from "../../../components/common/AddUserModal";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const { width } = useWindowDimensions();

  const [currentUid, setCurrentUid] = useState(null);

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u ? u.uid : null);
    });
    return () => unsub();
  }, []);

  // Load users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Selecting a user
  const handleSelectUser = (item) => {
    setSelectedUser(item);
    setTempData({
      username: item.username || "",
      role: item.role || "user",
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    });
  };

  // Save user changes
const handleSaveChanges = async () => {
  if (!tempData || !selectedUser) return;

  // prevent self-demotion
  if (selectedUser.id === currentUid && tempData.role !== selectedUser.role) {
    Alert.alert(
      "Action Denied",
      "You cannot change your own role. Another SuperAdmin must do this."
    );
    return;
  }

  // ⭐ Username NOT required anymore
  const uname = tempData.username ? tempData.username.trim() : "";

  setSaving(true);

  try {
    await updateDoc(doc(db, "users", selectedUser.id), {
      username: uname,
      role: tempData.role,
      isActive: tempData.isActive,
      updatedAt: new Date().toISOString(),
    });

    Alert.alert(
      "Success",
      "User changes saved.\n\n⚠ If a role was changed, the user must log out and log in again."
    );

    setSelectedUser(null);
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Failed to save changes.");
  } finally {
    setSaving(false);
  }
};

  const handleResetPassword = async () => {
    if (!selectedUser?.email) return;

    try {
      await sendPasswordResetEmail(auth, selectedUser.email);
      Alert.alert("Reset Sent", `Password reset sent to ${selectedUser.email}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to send reset email.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <Text style={styles.title}>User Management</Text>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search user..."
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />

          <TouchableOpacity
            onPress={() => setShowAddUser(true)}
            style={styles.addBtn}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addText}>Add User</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User Table */}
      <ScrollView horizontal={width < 1200}>
        <View
          style={[
            styles.tableWrapper,
            { width: width < 1200 ? 1200 : "100%" },
          ]}
        >
          <View style={styles.rowHeader}>
            <Text style={[styles.headerText, { flex: 1.5 }]}>User</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Username</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Role</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Status</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Created At</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Verification</Text>
          </View>

          {filteredUsers.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleSelectUser(item)}
              style={[
                styles.row,
                !item.isActive && { backgroundColor: "#fee2e2" },
              ]}
            >
              {/* User */}
              <View style={[styles.cell, { flex: 2, flexDirection: "row" }]}>
                <Image
                  source={
                    item.photoURL
                      ? { uri: item.photoURL }
                      : item.avatar
                      ? { uri: item.avatar }
                      : profile
                  }
                  style={styles.avatar}
                />

                <View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
              </View>

              <Text style={[styles.cell, { flex: 1.5 }]}>{item.username}</Text>

              <View style={[styles.cell, { flex: 1.5 }]}>
                <Text
                  style={[
                    styles.badge,
                    item.role === "admin"
                      ? styles.admin
                      : item.role === "superadmin"
                      ? styles.superadmin
                      : styles.user,
                  ]}
                >
                  {item.role}
                </Text>
              </View>

              <Text
                style={[
                  styles.cell,
                  item.isActive ? styles.active : styles.restricted,
                  { flex: 2 },
                ]}
              >
                {item.isActive ? "Active" : "Restricted"}
              </Text>

              <Text style={[styles.cell, { flex: 1.5 }]}>
                {item.createdAt?.toDate
                  ? item.createdAt.toDate().toLocaleString()
                  : "—"}
              </Text>

              <Text
                style={[
                  styles.cell,
                  { flex: 1.5 },
                  styles.verifyBadge,
                  item.emailVerified ? styles.verified : styles.unverified,
                ]}
              >
                {item.emailVerified ? "Verified" : "Unverified"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Manage User Modal */}
      <Modal visible={!!selectedUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selectedUser && (
              <>
                <Text style={styles.modalTitle}>Manage User</Text>

                <View style={styles.modalUserInfo}>
                  <Image
                    source={
                      selectedUser.photoURL ? { uri: selectedUser.photoURL } : profile
                    }
                    style={styles.avatarLarge}
                  />

                  <View>
                    <Text style={styles.modalName}>{selectedUser.name}</Text>
                    <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                  </View>
                </View>

                {/* Username (read-only) */}
                <Text style={styles.label}>Username</Text>
                <View style={styles.usernameField}>
                  <TextInput
                    style={[styles.usernameInput, { color: "#94a3b8" }]}
                    value={tempData?.username}
                    editable={false}
                  />
                </View>

                {/* Role */}
                <Text style={styles.label}>Role</Text>
                <View style={styles.dropdown}>
                  {["user", "admin", "superadmin"].map((role) => {
                    const isSelected = tempData?.role === role;
                    return (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.dropdownItem,
                          isSelected &&
                            (role === "superadmin"
                              ? { backgroundColor: "#2C3E50" }
                              : styles.selectedRole),
                        ]}
                        onPress={() => setTempData({ ...tempData, role })}
                      >
                        <Text
                          style={{
                            fontWeight: "600",
                            color: isSelected ? "#fff" : "#0f172a",
                          }}
                        >
                          {role.toUpperCase()}
                        </Text>

                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#fff"
                             style={{
                              position: "absolute",
                              right: 12,}}
                            
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Restrict / Reset Password */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    activeOpacity={selectedUser.id === currentUid ? 1 : 0.7}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: tempData?.isActive
                          ? "#f59e0b"
                          : "#10b981",
                        opacity:
                          selectedUser.id === currentUid ? 0.45 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (selectedUser.id === currentUid) {
                        Alert.alert(
                          "Action Not Allowed",
                          "You cannot restrict/unrestrict your own account."
                        );
                        return;
                      }

                      setTempData({
                        ...tempData,
                        isActive: !tempData.isActive,
                      });
                    }}
                  >
                    <Ionicons
                      name={
                        tempData?.isActive
                          ? "lock-closed-outline"
                          : "lock-open-outline"
                      }
                      size={16}
                      color="#fff"
                    />

                    <Text style={styles.actionText}>
                      {tempData?.isActive ? "Restrict" : "Unrestrict"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
                    onPress={handleResetPassword}
                  >
                    <Ionicons name="key-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Reset Password</Text>
                  </TouchableOpacity>
                </View>

                {/* Save */}
                <TouchableOpacity
                  onPress={handleSaveChanges}
                  disabled={saving}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: saving ? "#94a3b8" : "#0f37f1" },
                  ]}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  onPress={() => setSelectedUser(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add User Modal */}
      <AddUserModal
        visible={showAddUser}
        onClose={() => setShowAddUser(false)}
      />
    </View>
  );
}

/* ------------ STYLES (unchanged except cleaned username styles) ------------ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  search: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#fff",
    minWidth: 200,
  },
  addBtn: {
    backgroundColor: "#0f37f1",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addText: { color: "#fff", fontWeight: "700" },

  tableWrapper: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
  },

  rowHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 2,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
  },
  headerText: {
    fontWeight: "700",
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 50,
  },

  cell: {
    paddingHorizontal: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#e2e8f0",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  email: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  badge: {
    borderRadius: 6,
    color: "#fff",
    paddingVertical: 3,
    paddingHorizontal: 6,
    textAlign: "center",
    minWidth: 70,
  },
  admin: { backgroundColor: "#4A6FA5" },
  superadmin: { backgroundColor: "#1B263B" },
  user: { backgroundColor: "#20B2AA" },
  active: { color: "#16a34a", fontWeight: "600", textAlign: "center" },
  restricted: { color: "#dc2626", fontWeight: "600", textAlign: "center" },

  verifyBadge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
    minWidth: 80,
  },
  verified: { backgroundColor: "#16a34a" },
  unverified: { backgroundColor: "#f59e0b" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    maxWidth: 420,
    width: "100%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  modalUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e2e8f0",
  },
  modalName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  modalEmail: { color: "#64748b", fontSize: 13 },

  label: { fontWeight: "700", marginTop: 10, marginBottom: 6 },
  usernameField: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  usernameInput: {
    fontSize: 14,
    paddingVertical: 10,
  },

  dropdown: { flex: 1, gap: 6, marginTop: 4, marginBottom: 16 },
  dropdownItem: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",   // center the text
  borderWidth: 1,
  borderColor: "#cbd5e1",
  paddingVertical: 8,
  borderRadius: 8,
  width: "100%",
  position: "relative",        // allow absolute icon
},
  selectedRole: { backgroundColor: "#0f37f1", borderColor: "#0f37f1" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 10,
  },
  actionText: { color: "#fff", fontWeight: "700" },

  saveBtn: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "800" },

  closeBtn: { marginTop: 12, alignItems: "center" },
  closeText: {
    color: "#ef4444",
    fontWeight: "700",
  },
});
