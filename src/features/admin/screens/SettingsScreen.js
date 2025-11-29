import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  getAuth,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { db } from "../../../services/firebaseConfig";
import { AuthContext } from "../../../context/AuthContext";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { pickSingleImage } from "../../../utils/imagePicker";

// IMPORT MODALS
import EditProfileModal from "../components/EditProfileModal";
import ChangePasswordModal from "../components/ChangePasswordModal";

const SettingsScreen = () => {
  const { role, user } = useContext(AuthContext);
  const auth = getAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [passForm, setPassForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    username: "",
    address: "",
    phone: "",
    gender: "",
    dob: "",
    photoURL: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    gender: "",
    dob: "",
    photoURL: "",
  });

  const [config, setConfig] = useState({
    system: { maintenanceMode: false },
  });

  // Load Data
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchSystemSettings(), loadUserProfile()]);
      setLoading(false);
    };
    if (user?.uid) init();
  }, [user]);

  const fetchSystemSettings = async () => {
    try {
      const refCfg = doc(db, "system_settings", "config");
      const snap = await getDoc(refCfg);
      if (snap.exists()) {
        let data = snap.data();

        // Remove any old season data if it exists
        delete data.season;

        setConfig({ ...config, ...data });
      }
    } catch (error) {
      console.error("Error loading system config:", error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        const merged = {
          name: data.name || user.displayName || "Admin User",
          email: data.email || user.email,
          username: data.username || "",
          address: data.address || "",
          phone: data.phone || "",
          gender: data.gender || "",
          dob: data.dob || "",
          photoURL: data.photoURL || "",
        };

        setProfileData(merged);
        setEditForm({ ...merged });
      }
    } catch (err) {
      console.error("Profile load error:", err);
    }
  };

  const saveSystemConfig = async (newConfig) => {
    setConfig(newConfig);
    try {
      await updateDoc(doc(db, "system_settings", "config"), newConfig);
    } catch (e) {
      Alert.alert("Error", "Failed to update settings");
      fetchSystemSettings();
    }
  };

  const updateConfigVal = (section, key, val) => {
    const updated = {
      ...config,
      [section]: { ...config[section], [key]: val },
    };
    saveSystemConfig(updated);
  };

  // Avatar Upload
  const handlePickAvatar = async () => {
    try {
      const img = await pickSingleImage();
      if (!img) return;

      const storage = getStorage();
      const storageRef = ref(storage, `profilePhotos/${user.uid}.jpg`);

      setSaving(true);
      await uploadBytes(storageRef, img.file);
      const downloadURL = await getDownloadURL(storageRef);

      setEditForm((prev) => ({ ...prev, photoURL: downloadURL }));
      Alert.alert("Success", "Photo selected. Tap Save Changes to apply.");
    } catch (err) {
      console.error("Avatar upload error:", err);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      return Alert.alert("Error", "Name cannot be empty");
    }

    try {
      setSaving(true);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: editForm.name.trim(),
          photoURL: editForm.photoURL || null,
        });
      }

      await updateDoc(doc(db, "users", user.uid), {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        dob: editForm.dob.trim(),
        gender: editForm.gender,
        photoURL: editForm.photoURL || "",
      });

      setProfileModalVisible(false);
      loadUserProfile();
      Alert.alert("Success", "Profile updated successfully.");
    } catch (error) {
      console.error("Profile save error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  // Save password
  const handleChangePassword = async () => {
    const { current, new: newPass, confirm } = passForm;

    if (!current || !newPass || !confirm) {
      window.alert("Please fill in all fields.");
      return;
    }
    if (newPass !== confirm) {
      window.alert("New passwords do not match.");
      return;
    }
    if (newPass.length < 6) {
      window.alert("Password must be at least 6 characters.");
      return;
    }

    try {
      setSaving(true);
      const currentUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        current
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);

      setPasswordModalVisible(false);
      setSuccessMessage("Password updated successfully!");

      setTimeout(() => setSuccessMessage(""), 5000);

      setPassForm({ current: "", new: "", confirm: "" });
    } catch (error) {
      console.error(error);
      window.alert("The current password you entered is incorrect.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <ActivityIndicator
        style={styles.center}
        size="large"
        color="#0f37f1"
      />
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>

      {successMessage !== "" && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" style={{ marginRight: 8 }} />
          <Text style={{ color: "#166534", fontWeight: "600" }}>{successMessage}</Text>
        </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={[styles.badge, role === "superadmin" ? styles.badgeSuper : styles.badgeAdmin]}>
          <Text style={styles.badgeText}>{role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* ACCOUNT SECTION */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>

      <View style={styles.card}>
        <View style={styles.userInfo}>
          <Image
            source={
              profileData.photoURL
                ? { uri: profileData.photoURL }
                : require("../../../../assets/profile.png")
            }
            style={styles.avatar}
          />
          <View>
            <Text style={styles.userName}>{profileData.name}</Text>
            <Text style={styles.userEmail}>{profileData.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuItem} onPress={() => setProfileModalVisible(true)}>
          <View style={styles.menuRow}>
            <Ionicons name="person-circle-outline" size={22} color="#475569" />
            <Text style={styles.menuText}>Edit Profile Information</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModalVisible(true)}>
          <View style={styles.menuRow}>
            <Ionicons name="key-outline" size={22} color="#475569" />
            <Text style={styles.menuText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* ADMINISTRATION */}
      <Text style={styles.sectionHeader}>ADMINISTRATION</Text>

      {/* DANGER ZONE */}
      <Text style={[styles.sectionHeader, { color: "#dc2626" }]}>
        DANGER ZONE
      </Text>

      <View style={[styles.card, { borderColor: "#fca5a5" }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.menuRow}>
              <Ionicons name="construct-outline" size={20} color="#dc2626" />
              <Text style={[styles.cardTitle, { color: "#dc2626", marginLeft: 8 }]}>
                Maintenance Mode
              </Text>
            </View>
            <Text style={styles.hint}>
              {role === "superadmin"
                ? "Shuts down app access for all users."
                : "Contact Superadmin to enable."}
            </Text>
          </View>

          {role === "superadmin" ? (
            <Switch
              value={config.system.maintenanceMode}
              onValueChange={(v) => updateConfigVal("system", "maintenanceMode", v)}
              trackColor={{ true: "#dc2626" }}
            />
          ) : (
            <Ionicons name="lock-closed" size={24} color="#94a3b8" />
          )}
        </View>
      </View>

      {/* MODAL COMPONENTS */}
      <EditProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onSave={handleSaveProfile}
        saving={saving}
        editForm={editForm}
        setEditForm={setEditForm}
        profileData={profileData}
        handlePickAvatar={handlePickAvatar}
      />

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => {
          setPasswordModalVisible(false);
          setPassForm({ current: "", new: "", confirm: "" });
        }}
        onSave={handleChangePassword}
        saving={saving}
        passForm={passForm}
        setPassForm={setPassForm}
      />
    </ScrollView>
  );
};

export default SettingsScreen;

// -------------------------------------------
// STYLING
// -------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  successBanner: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
    borderWidth: 1,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeSuper: { backgroundColor: "#dcfce7" },
  badgeAdmin: { backgroundColor: "#e0f2fe" },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#334155" },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 1,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  userInfo: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e2e8f0",
    marginRight: 15,
  },
  userName: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  userEmail: { fontSize: 14, color: "#64748b" },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 10 },

  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  menuRow: { flexDirection: "row", alignItems: "center" },
  menuText: { fontSize: 16, marginLeft: 10, color: "#334155" },

  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  hint: { fontSize: 12, color: "#94a3b8", marginTop: 4 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
