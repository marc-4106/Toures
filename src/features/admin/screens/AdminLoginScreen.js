import React, { useEffect, useState, useRef } from "react";
import {
  Image,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { auth, db } from "../../../services/firebaseConfig";
import { MaterialIcons } from "@expo/vector-icons";
import {
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const AdminLoginScreen = ({ navigation }) => {
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef(null); // For enter key navigation

  const showAlert = (title, message) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showAlert("Missing Fields", "Please fill in both fields.");
      return;
    }

    setLoading(true);
    try {
      let emailToUse = identifier.trim().toLowerCase();

      // If it doesn’t contain "@", treat as username
      if (!identifier.includes("@")) {
        const q = query(collection(db, "users"), where("username", "==", identifier.trim()));
        const snap = await getDocs(q);

        if (snap.empty) {
          showAlert("Invalid Login", "Username not found.");
          setLoading(false);
          return;
        }

        emailToUse = snap.docs[0].data().email;
      }

      // Authenticate via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCredential.user;

      // Get Firestore user doc
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        showAlert("Error", "User record not found.");
        setLoading(false);
        return;
      }

      const data = docSnap.data();

      // Check restriction
      if (data.isActive === false) {
        showAlert("Restricted", "This account is restricted or disabled.");
        setLoading(false);
        return;
      }

      // Check role access
      if (data.role === "superadmin") {
        showAlert("Welcome Superadmin!", "Redirecting to dashboard...");
        navigation.replace("SuperadminDash");
      } else if (data.role === "admin") {
        showAlert("Welcome Admin!", "Redirecting to dashboard...");
        navigation.replace("AdminDrawer");
      } else {
        showAlert("Access Denied", "You are not authorized for admin access.");
      }
    } catch (error) {
      console.log(error);
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        showAlert("Login Failed", "Incorrect username/email or password.");
      } else if (error.code === "auth/invalid-email") {
        showAlert("Invalid Email", "Please enter a valid email format.");
      } else {
        showAlert("Error", error.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require("../../../../assets/login/WhiteToures.png")}
          style={styles.logo}
        />

        <Text style={styles.logo_text}>ADMIN LOGIN</Text>

        <View
          style={[
            styles.inputWrapper,
            emailFocused && styles.inputWrapperFocused,
          ]}
        >
          <MaterialIcons
            name={"person-outline"}
            size={20}
            color={emailFocused ? "#0F37F1" : identifier ? "#0F37F1" : "#90a4ae"}
            style={styles.inputIcon}
          />
          <TextInput
            placeholder="Email or Username"
            placeholderTextColor="#90a4ae"
            style={styles.input}
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()} // Move focus to password
          />
        </View>

        <View
          style={[
            styles.inputWrapper,
            passwordFocused && styles.inputWrapperFocused,
          ]}
        >
          <MaterialIcons
            name={password ? "lock" : "lock-outline"}
            size={20}
            color={
              passwordFocused ? "#0F37F1" : password ? "#0F37F1" : "#90a4ae"
            }
            style={styles.inputIcon}
          />
          <TextInput
            ref={passwordRef}
            placeholder="Password"
            placeholderTextColor="#90a4ae"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            returnKeyType="done"
            onSubmitEditing={handleLogin} // Pressing Enter now triggers login
          />
        </View>

        <View style={styles.footerRow}>
          <Pressable onPress={() => showAlert("Notice", "Forgot Password feature coming soon!")}>
            <Text style={styles.footerText}>Forgot Password ?</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && { opacity: 0.8 },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.text}>Log In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default AdminLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F37F1",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 10,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#011576",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 20,
  },
  logo_text: {
    color: "#0F37F1",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  inputWrapperFocused: {
    backgroundColor: "#FFFFFF",
    borderColor: "#0F37F1",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: "#011576",
    fontSize: 16,
    borderWidth: 0,
    outlineStyle: "none",
    outlineWidth: 0,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
    marginBottom: 5,
    paddingBottom: 15,
  },
  footerText: {
    color: "#0F37F1",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#0F37F1",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
    width: 400,
    maxWidth: "100%",
    marginBottom: 20,
  },
  buttonPressed: { opacity: 0.85 },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
