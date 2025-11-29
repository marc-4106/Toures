import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const EditProfileModal = ({
  visible,
  onClose,
  onSave,
  saving,
  editForm,
  setEditForm,
  profileData,
  handlePickAvatar,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Profile</Text>

          {/* Avatar */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Image
              source={
                editForm.photoURL
                  ? { uri: editForm.photoURL }
                  : require("../../../../assets/profile.png")
              }
              style={styles.avatarLarge}
            />
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickAvatar}>
              <Ionicons name="camera-outline" size={18} color="#0f37f1" />
              <Text style={{ color: "#0f37f1", marginLeft: 6 }}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable form */}
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.label}>Email (read-only)</Text>
            <TextInput
              value={profileData.email}
              editable={false}
              style={[styles.input, { backgroundColor: "#f1f5f9" }]}
            />

            <Text style={styles.label}>Username (read-only)</Text>
            <TextInput
              value={profileData.username}
              editable={false}
              style={[styles.input, { backgroundColor: "#f1f5f9" }]}
            />

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.name}
              onChangeText={(t) => setEditForm((p) => ({ ...p, name: t }))}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={editForm.address}
              onChangeText={(t) => setEditForm((p) => ({ ...p, address: t }))}
            />

            <Text style={styles.label}>Contact #</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={editForm.phone}
              onChangeText={(t) => setEditForm((p) => ({ ...p, phone: t }))}
            />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.dropdown}>
              {["Male", "Female", "Other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setEditForm((p) => ({ ...p, gender: g }))}
                  style={[
                    styles.dropdownItem,
                    editForm.gender === g && styles.dropdownSelected,
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: "600",
                      color: editForm.gender === g ? "#fff" : "#334155",
                    }}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Birthdate</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={editForm.dob}
              onChangeText={(t) => setEditForm((p) => ({ ...p, dob: t }))}
            />
          </ScrollView>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={{ color: "#64748b" }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSave}
              style={styles.confirmBtn}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditProfileModal;

// 🔥 STYLES BELONG TO THIS MODAL ONLY
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  modalContainer: {
    width: "95%",
    maxWidth: 420,
    maxHeight: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    paddingBottom: 10,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 20,
    textAlign: "center",
    color: "#0f172a",
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e2e8f0",
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dropdownItem: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  dropdownSelected: {
    backgroundColor: "#0f37f1",
  },
  modalButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 10,
    paddingBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#0f37f1",
    alignItems: "center",
  },
});
