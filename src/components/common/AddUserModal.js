import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../services/firebaseConfig";

export default function AddUserModal({ visible, onClose }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [invalidUsername, setInvalidUsername] = useState(false);

  // --- Username Validation ---
  const validateUsername = (uname) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(uname);

  useEffect(() => {
    const uname = username.trim().toLowerCase();

    if (!uname) {
      setIsAvailable(null);
      setInvalidUsername(false);
      return;
    }

    if (!validateUsername(uname)) {
      setInvalidUsername(true);
      setIsAvailable(null);
      return;
    } else {
      setInvalidUsername(false);
    }

    const timer = setTimeout(async () => {
      try {
        setChecking(true);
        const q = query(collection(db, "users"), where("username", "==", uname));
        const snap = await getDocs(q);
        setIsAvailable(snap.empty);
      } catch (e) {
        console.error(e);
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [username]);

  // --- Clear modal on close ---
  useEffect(() => {
    if (!visible) {
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPw("");
      setRole("user");
      setIsAvailable(null);
      setInvalidUsername(false);
      setChecking(false);
    }
  }, [visible]);

    const handleAddUser = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedPw = password.trim();
    const trimmedConfirm = confirmPw.trim();

    const showAlert = (title, message) => {
        if (Platform.OS === "web") {
        window.alert(`${title}\n\n${message}`);
        } else {
        Alert.alert(title, message);
        }
    };

    if (!trimmedName || !trimmedEmail || !trimmedPw || !trimmedConfirm) {
        showAlert("Missing Fields", "Please fill out all required fields (name, email, and password).");
        return;
    }

    if (trimmedUsername && (invalidUsername || isAvailable === false)) {
        showAlert("Invalid Username", "Please choose a valid and available username before proceeding.");
        return;
    }

    if (trimmedPw.length < 6) {
        showAlert("Weak Password", "Password must be at least 6 characters long.");
        return;
    }

    if (trimmedPw !== trimmedConfirm) {
        showAlert("Password Mismatch", "Passwords do not match. Please re-enter.");
        return;
    }

    try {
        setLoading(true);
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPw);

        if (role === "user") {
        await sendEmailVerification(cred.user, {
            url: "https://toures-2025.web.app",
            handleCodeInApp: true,
        });
        }

        await setDoc(doc(db, "users", cred.user.uid), {
        name: trimmedName,
        username: trimmedUsername || null,
        email: cred.user.email,
        role,
        isActive: true,
        emailVerified: role === "user" ? false : true,
        createdAt: serverTimestamp(),
        });

        showAlert(
        "User Created",
        role === "user"
            ? "User added successfully. A verification email has been sent."
            : "Admin or Superadmin added successfully."
        );

        onClose();
    } catch (error) {
        console.error(error);
        let message = "Failed to create user.";
        if (error.code === "auth/email-already-in-use") message = "This email is already in use.";
        else if (error.code === "auth/invalid-email") message = "Please enter a valid email address.";
        else if (error.code === "auth/weak-password") message = "Password is too weak. Please make it stronger.";
        showAlert("Error", message);
    } finally {
        setLoading(false);
    }
    };



  const roles = ["user", "admin", "superadmin"];

 const borderStyles =
  invalidUsername
    ? { borderColor: "#dc2626", borderWidth: 2, shadowColor: "#dc2626" }
    : isAvailable === true
    ? { borderColor: "#16a34a", borderWidth: 2, shadowColor: "#16a34a" }
    : isAvailable === false
    ? { borderColor: "#dc2626", borderWidth: 2, shadowColor: "#dc2626" }
    : { borderColor: "#cbd5e1", borderWidth: 1, shadowColor: "transparent" };


  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modal}>
          <Text style={styles.title}>Add New User</Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter full name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Username (optional)</Text>
            <View style={[styles.usernameWrapper, borderStyles]}>
            <TextInput
                style={styles.usernameInput}
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
            />
            {checking && <ActivityIndicator size="small" color="#0f37f1" style={{ marginLeft: 8 }} />}
            </View>

            {invalidUsername && (
            <Text style={styles.takenText}>
                ❌ Invalid username (start with letter, 3–20 chars, letters/numbers/._ only)
            </Text>
            )}
            {isAvailable === true && (
            <Text style={styles.availableText}>✅ Username available</Text>
            )}
            {isAvailable === false && (
            <Text style={styles.takenText}>❌ Username already in use</Text>
            )}


            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                placeholder="Enter password"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#475569"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                placeholder="Re-enter password"
                secureTextEntry={!showConfirm}
                value={confirmPw}
                onChangeText={setConfirmPw}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#475569"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, role === r && styles.roleSelected]}
                  onPress={() => setRole(r)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === r && { color: "#fff", fontWeight: "700" },
                    ]}
                  >
                    {r.toUpperCase()}
                  </Text>
                  {role === r && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, loading && { backgroundColor: "#94a3b8" }]}
              disabled={loading}
              onPress={handleAddUser}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.saveText}>Add User</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 420,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  label: { fontWeight: "700", color: "#0f172a", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fafc",
    fontSize: 14,
  },
 usernameRow: {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 8,
  backgroundColor: "#f8fafc",
  paddingRight: 10,
  elevation: 1,
  shadowOpacity: 0.15,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 },
},

  availableText: { color: "#16a34a", marginTop: 4, fontWeight: "600" },
  takenText: { color: "#dc2626", marginTop: 4, fontWeight: "600" },
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    paddingRight: 10,
  },
  roleRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginHorizontal: 3,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  roleSelected: { backgroundColor: "#0f37f1", borderColor: "#0f37f1" },
  roleText: { color: "#0f172a", fontWeight: "600" },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#0f37f1",
    marginTop: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn: { marginTop: 12, alignItems: "center" },
  cancelText: { color: "#ef4444", fontWeight: "700" },
  usernameWrapper: {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 8,
  backgroundColor: "#f8fafc",
  paddingRight: 10,
  paddingLeft: 10,
  elevation: 1,
  shadowOpacity: 0.12,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
},

usernameInput: {
  flex: 1,
  fontSize: 14,
  color: "#0f172a",
  paddingVertical: 10,
  // hide input border completely
  borderWidth: 0,
  outlineStyle: "none",
  backgroundColor: "transparent",
},
});
