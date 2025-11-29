import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { auth, db } from "../../../services/firebaseConfig";
import { reload, sendEmailVerification } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function VerifyEmailScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const checkVerification = async () => {
    setChecking(true);

    await reload(auth.currentUser);

    if (auth.currentUser.emailVerified) {
      // ⭐ UPDATE Firestore emailVerified = true
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          emailVerified: true,
        });
      } catch (err) {
        console.log("Failed to update Firestore:", err);
      }

      navigation.replace("Login");
    } else {
      alert("Your email is not verified yet. Please check your inbox.");
    }

    setChecking(false);
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email sent again!");
    } catch (err) {
      console.log(err);
      alert("Failed to resend email. Try again.");
    }
    setResending(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons
          name="mail-open-outline"
          size={60}
          color="#007bff"
          style={{ marginBottom: 10 }}
        />

        <Text style={styles.title}>Verify Your Email</Text>

        <Text style={styles.message}>
          We’ve emailed a verification link to:
          {"\n"}
          <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
        </Text>

        <TouchableOpacity
          style={[styles.button, checking && { opacity: 0.6 }]}
          onPress={checkVerification}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>I Verified — Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={resendVerification}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.linkText}>Resend verification email</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    color: "#555",
  },
  emailText: {
    fontWeight: "600",
    color: "#007bff",
  },
  button: {
    backgroundColor: "#007bff",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    color: "#007bff",
    fontWeight: "500",
  },
});
