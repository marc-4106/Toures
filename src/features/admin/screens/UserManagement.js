import React, { useState, useEffect, useCallback } from "react";
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
  ActivityIndicator,
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
  query,
  where,
  getDocs,
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

  // Username validation
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [invalidUsername, setInvalidUsername] = useState(false);

  // store current logged-in uid reliably
  const [currentUid, setCurrentUid] = useState(null);

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Listen for auth state so currentUid is always accurate
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u ? u.uid : null);
    });
    return () => unsubAuth();
  }, []);

  // Load users from Firestore
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

  // Validate usernames
  const validateUsername = useCallback(
    (uname) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(uname),
    []
  );

  const handleUsernameValidation = useCallback(
    async (username, currentId) => {
      if (!username) {
        setInvalidUsername(false);
        setIsAvailable(null);
        return;
      }

      const uname = username.trim().toLowerCase();

      if (!validateUsername(uname)) {
        setInvalidUsername(true);
        setIsAvailable(null);
        return;
      }

      setInvalidUsername(false);
      setChecking(true);

      try {
        const q = query(collection(db, "users"), where("username", "==", uname));
        const snap = await getDocs(q);

        if (!snap.empty && snap.docs[0].id !== currentId) {
          setIsAvailable(false);
        } else {
          setIsAvailable(true);
        }
      } catch (e) {
        console.error("Username check failed:", e);
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    },
    [validateUsername]
  );

  // Revalidate username when editing
  useEffect(() => {
    if (!tempData?.username || !selectedUser) return;
    const delay = setTimeout(() => {
      handleUsernameValidation(tempData.username, selectedUser.id);
    }, 700);
    return () => clearTimeout(delay);
  }, [tempData?.username, selectedUser, handleUsernameValidation]);

  // When selecting a user, ensure tempData is initialized
  const handleSelectUser = (item) => {
    setSelectedUser(item);
    setTempData({
      username: item.username || "",
      role: item.role || "user",
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    });
    // reset validation states
    setInvalidUsername(false);
    setIsAvailable(null);
  };

  const handleSaveChanges = async () => {
    if (!tempData || !selectedUser) return;

    // 🛡️ SAFETY CHECK: Prevent modifying yourself if you are changing your own role
    // This prevents a SuperAdmin from accidentally demoting themselves and losing access.
    if (selectedUser.id === currentUid && tempData.role !== selectedUser.role) {
        Alert.alert(
            "Action Denied", 
            "You cannot change your own role to prevent locking yourself out. Another SuperAdmin must do this."
        );
        return;
    }

    const uname = tempData.username?.trim();

    // Username is optional — only validate when provided
    if (uname && invalidUsername) {
      showAlert("Invalid Username", "Username must start with a letter and be 3–20 characters long.");
      return;
    }

    if (uname && isAvailable === false) {
      showAlert("Username Taken", "This username is already in use.");
      return;
    }

    setSaving(true);
    try {
      // ⚡ THIS TRIGGER UPDATES FIRESTORE -> CLOUD FUNCTION DETECTS IT -> UPDATES AUTH CLAIMS
      await updateDoc(doc(db, "users", selectedUser.id), {
        username: uname,
        role: tempData.role,
        isActive: tempData.isActive,
        updatedAt: new Date().toISOString()
      });
      
      Alert.alert(
        "Success", 
        "User changes saved.\n\n⚠️ NOTE: If you changed a Role, the user must Log Out and Log In again to see the new permissions."
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
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to send reset email.");
    }
  };

  const borderStyles =
    invalidUsername
      ? { borderColor: "#dc2626", borderWidth: 2 }
      : isAvailable === true
      ? { borderColor: "#16a34a", borderWidth: 2 }
      : isAvailable === false
      ? { borderColor: "#dc2626", borderWidth: 2 }
      : { borderColor: "#cbd5e1", borderWidth: 1 };

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

      {/* Table */}
      <ScrollView horizontal={width < 1200} style={{ overflow: "auto" }}>
        <View
          style={[styles.tableWrapper, { width: width < 1200 ? 1200 : "100%" }]}
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
              style={[
                styles.row,
                item.isActive === false && { backgroundColor: "#fee2e2" },
              ]}
              onPress={() => handleSelectUser(item)}
            >
              {/* User */}
              <View style={[styles.cell, { flex: 1.5, flexDirection: "row" }]}>
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

              <Text style={[styles.cell, { flex: 1 }]}>{item.username || "—"}</Text>

              <View style={[styles.cell, { flex: 1 }]}>
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
                  { flex: 1.5 },
                ]}
              >
                {item.isActive ? "Active" : "Restricted"}
              </Text>

              <Text style={[styles.cell, { flex: 1.5 }]}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "—"}
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

                {/* Username */}
                <Text style={styles.label}>Username</Text>
                <View style={[styles.usernameField, borderStyles]}>
                  <TextInput
                    style={styles.usernameInput}
                    placeholder="Enter username"
                    value={tempData?.username}
                    onChangeText={(text) => setTempData({ ...tempData, username: text })}
                    autoCapitalize="none"
                  />
                  {checking && (
                    <ActivityIndicator size="small" color="#0f37f1" style={{ marginRight: 6 }} />
                  )}
                </View>
                {invalidUsername && (
                  <Text style={styles.takenText}>
                    ❌ Invalid username (start with letter, 3–20 chars, letters/numbers/._ only)
                  </Text>
                )}
                {isAvailable === true && <Text style={styles.availableText}>✅ Username available</Text>}
                {isAvailable === false && <Text style={styles.takenText}>❌ Username already in use</Text>}

                {/* Role */}
                <Text style={styles.label}>Role</Text>
                <View style={styles.dropdown}>
                  {["user", "admin", "superadmin"].map((role) => {
                    const isSelected = tempData?.role === role;
                    const isSuperAdmin = role === 'superadmin';
                    
                    return (
                        <TouchableOpacity
                        key={role}
                        style={[
                            styles.dropdownItem,
                            isSelected && (isSuperAdmin ? { backgroundColor: "#dc2626", borderColor: "#dc2626" } : styles.selectedRole)
                        ]}
                        onPress={() => setTempData({ ...tempData, role })}
                        >
                        <Text style={{ 
                            fontWeight: "600", 
                            color: isSelected ? "#fff" : "#0f172a" 
                        }}>
                            {role.toUpperCase()}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginLeft: 6 }} />}
                        </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Restrict / Reset */}
                <View style={styles.actionRow}>
                  {/* Restrict button: disabled when selectedUser.id === currentUid */}
                  <TouchableOpacity
                    activeOpacity={selectedUser.id === currentUid ? 1 : 0.7}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: tempData?.isActive ? "#f59e0b" : "#10b981",
                        opacity: selectedUser.id === currentUid ? 0.45 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (selectedUser.id === currentUid) {
                        Alert.alert("Action Not Allowed", "You cannot restrict or unrestrict your own account.");
                        return;
                      }
                      setTempData({ ...tempData, isActive: !tempData.isActive });
                    }}
                  >
                    <Ionicons
                      name={tempData?.isActive ? "lock-closed-outline" : "lock-open-outline"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.actionText}>{tempData?.isActive ? "Restrict" : "Unrestrict"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#3b82f6" }]} onPress={handleResetPassword}>
                    <Ionicons name="key-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Reset Password</Text>
                  </TouchableOpacity>
                </View>

                {/* Save / Cancel */}
                <TouchableOpacity onPress={handleSaveChanges} style={[styles.saveBtn, { backgroundColor: saving ? "#94a3b8" : "#0f37f1" }]} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.closeBtn}>
                  <Text style={styles.closeText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add User Modal */}
      <AddUserModal visible={showAddUser} onClose={() => setShowAddUser(false)} />
    </View>
  );
}

/* -----------------------------------
   STYLES
----------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    alignItems: "center",
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addText: { color: "#fff", fontWeight: "700" },
  tableWrapper: { flexGrow: 1, borderRadius: 10, backgroundColor: "#fff" },
  rowHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 2,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerText: {
    fontWeight: "700",
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 50,
  },
  cell: { paddingHorizontal: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#e2e8f0",
  },
  name: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  email: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: {
    borderRadius: 6,
    textAlign: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: "#fff",
    minWidth: 70,
    maxWidth: 140,
  },
  admin: { backgroundColor: "#122e5cff" },
  superadmin: { backgroundColor: "#9e1010ff" },
  user: { backgroundColor: "#5797f0ff" },
  active: { color: "#16a34a", fontWeight: "600", textAlign: "center" },
  restricted: { color: "#dc2626", fontWeight: "600", textAlign: "center" },
  verifyBadge: {
    borderRadius: 6,
    textAlign: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    minWidth: 80,
    maxWidth: 150,
  },
  verified: { backgroundColor: "#16a34a" },
  unverified: { backgroundColor: "#f59e0b" },

  /* --- MODAL --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  modalUserInfo: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  avatarLarge: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#e2e8f0" },
  modalName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  modalEmail: { color: "#64748b", fontSize: 13 },
  label: { fontWeight: "700", color: "#0f172a", marginTop: 10, marginBottom: 6 },
  usernameField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
  },
  usernameInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: 10,
    backgroundColor: "transparent",
    borderWidth: 0,
    outlineStyle: "none",
    outlineWidth: 0,
    boxShadow: "none",
  },
  takenText: { color: "#dc2626", marginTop: 4, fontWeight: "600" },
  availableText: { color: "#16a34a", marginTop: 4, fontWeight: "600" },
  dropdown: { gap: 6, marginBottom: 16 },
  dropdownItem: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  selectedRole: { backgroundColor: "#0f37f1", borderColor: "#0f37f1" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
  closeText: { color: "#ef4444", fontWeight: "700" },
});