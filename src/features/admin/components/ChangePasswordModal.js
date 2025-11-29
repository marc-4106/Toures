import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Password strength + requirement validation
const analyzePassword = (pw) => {
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const longEnough = pw.length >= 6;

  const score = [hasUpper, hasLower, hasNumber, longEnough].filter(Boolean)
    .length;

  let strength = "weak";
  if (score <= 1) strength = "weak";
  else if (score === 2 || score === 3) strength = "medium";
  else if (score === 4) strength = "strong";

  return { strength, hasUpper, hasLower, hasNumber, longEnough };
};

const ChangePasswordModal = ({
  visible,
  onClose,
  onSave,
  saving,
  passForm,
  setPassForm,
}) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const analysis = useMemo(() => analyzePassword(passForm.new), [passForm.new]);

  const isValid =
    passForm.current.length > 0 &&
    analysis.hasUpper &&
    analysis.hasLower &&
    analysis.hasNumber &&
    analysis.longEnough &&
    passForm.new === passForm.confirm;

  const strengthColor =
    analysis.strength === "weak"
      ? "#dc2626"
      : analysis.strength === "medium"
      ? "#f59e0b"
      : "#16a34a";

  const strengthLabel =
    analysis.strength === "weak"
      ? "Weak"
      : analysis.strength === "medium"
      ? "Medium"
      : "Strong";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>

          {/* CURRENT PASSWORD */}
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showCurrent}
              placeholder="Required for security"
              value={passForm.current}
              onChangeText={(t) => setPassForm((p) => ({ ...p, current: t }))}
            />
            <TouchableOpacity
              style={styles.eye}
              onPress={() => setShowCurrent((v) => !v)}
            >
              <Ionicons
                name={showCurrent ? "eye" : "eye-off"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {passForm.current.length === 0 && (
            <Text style={styles.errorText}>Current password is required.</Text>
          )}

          {/* NEW PASSWORD */}
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showNew}
              placeholder="At least 1 uppercase, lowercase & number"
              value={passForm.new}
              onChangeText={(t) => setPassForm((p) => ({ ...p, new: t }))}
            />
            <TouchableOpacity
              style={styles.eye}
              onPress={() => setShowNew((v) => !v)}
            >
              <Ionicons
                name={showNew ? "eye" : "eye-off"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {/* Strength Bar */}
          {passForm.new.length > 0 && (
            <View style={styles.strengthContainer}>
              <View
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor: strengthColor,
                    width:
                      analysis.strength === "weak"
                        ? "33%"
                        : analysis.strength === "medium"
                        ? "66%"
                        : "100%",
                  },
                ]}
              />
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                {strengthLabel}
              </Text>
            </View>
          )}

          {/* NEW PASSWORD ERRORS */}
          <View style={styles.validationList}>
            <Text
              style={[
                styles.validationItem,
                { color: analysis.hasUpper ? "#16a34a" : "#dc2626" },
              ]}
            >
              • Contains uppercase letter
            </Text>
            <Text
              style={[
                styles.validationItem,
                { color: analysis.hasLower ? "#16a34a" : "#dc2626" },
              ]}
            >
              • Contains lowercase letter
            </Text>
            <Text
              style={[
                styles.validationItem,
                { color: analysis.hasNumber ? "#16a34a" : "#dc2626" },
              ]}
            >
              • Contains a number
            </Text>
            <Text
              style={[
                styles.validationItem,
                { color: analysis.longEnough ? "#16a34a" : "#dc2626" },
              ]}
            >
              • At least 6 characters
            </Text>
          </View>

          {/* CONFIRM PASSWORD */}
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showConfirm}
              placeholder="Re-enter new password"
              value={passForm.confirm}
              onChangeText={(t) => setPassForm((p) => ({ ...p, confirm: t }))}
            />
            <TouchableOpacity
              style={styles.eye}
              onPress={() => setShowConfirm((v) => !v)}
            >
              <Ionicons
                name={showConfirm ? "eye" : "eye-off"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {passForm.confirm.length > 0 &&
            passForm.confirm !== passForm.new && (
              <Text style={styles.errorText}>Passwords do not match.</Text>
            )}

          {/* BUTTONS */}
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={{ color: "#64748b" }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSave}
              style={[styles.confirmBtn, !isValid && { opacity: 0.5 }]}
              disabled={!isValid || saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ChangePasswordModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  modalContent: {
    width: "85%",
    maxWidth: 600,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#0f172a",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    marginBottom: 6,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  eye: {
    position: "absolute",
    right: 10,
    top: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginBottom: 4,
  },
  strengthContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  strengthBar: {
    height: 6,
    borderRadius: 4,
  },
  strengthLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  validationList: {
    marginBottom: 10,
  },
  validationItem: {
    fontSize: 12,
    marginBottom: 2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
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
