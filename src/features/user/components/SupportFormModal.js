// src/features/user/components/SupportFormModal.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { db, storage } from "../../../services/firebaseConfig";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { pickSingleImage } from "../../../utils/imagePicker.native";

export default function SupportFormModal({ visible, onClose, userEmail, userId }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await pickSingleImage();
      setScreenshot(result);
      Alert.alert("Screenshot Attached", `File: ${result.fileName}`);
    } catch (error) {
      if (error.message !== "User cancelled") {
        Alert.alert("Error Attaching Image", error.message);
      }
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim() || !userEmail || !userId) {
      Alert.alert(
        "Missing Information",
        "Subject, Description, and User Authentication are required."
      );
      return;
    }

    setIsLoading(true);
    try {
      let finalScreenshotUrl = null;

      if (screenshot) {
        const response = await fetch(screenshot.uri);
        const blob = await response.blob();
        const storagePath = `support_tickets/${userId}/${Date.now()}_${screenshot.fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob, { contentType: screenshot.mime });
        finalScreenshotUrl = await getDownloadURL(storageRef);
      }

      const ticketData = {
        userId,
        userEmail,
        subject: subject.trim(),
        description: description.trim(),
        screenshotUrl: finalScreenshotUrl,
        status: "New",
        assignedTo: null, // Initially unassigned
        createdAt: serverTimestamp(),
      };

      const ticketsCollectionRef = collection(db, "supportTickets");
      const docRef = await addDoc(ticketsCollectionRef, ticketData);

      // Notify Super Admins only
      const usersSnapshot = await getDocs(collection(db, "users"));
      usersSnapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.role === "superadmin") {
          await addDoc(collection(db, `users/${docSnap.id}/notifications`), {
            title: "New Support Ticket",
            body: `${userEmail} - ${subject}`,
            ticketId: docRef.id,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      });

      Alert.alert("Ticket Submitted ✅", `Ticket ID: ${docRef.id}`);
      setSubject("");
      setDescription("");
      setScreenshot(null);
      onClose();
    } catch (error) {
      console.error("Submission Error:", error);
      Alert.alert(
        "Submission Failed ⚠️",
        "An error occurred. Ensure you are logged in and check your network."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Submit a Request</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Your Email Address (Required)</Text>
          <View style={[styles.input, styles.readOnlyInput]}>
            <Text style={styles.readOnlyText}>{userEmail || "Loading..."}</Text>
          </View>

          <Text style={styles.label}>Subject (Required)</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief summary of your issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          <Text style={styles.label}>Description (Required)</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Please describe your issue in detail."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Attach Screenshot (Optional)</Text>
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickImage}
              disabled={isLoading}
            >
              <Ionicons name="image-outline" size={18} color="#0f172a" />
              <Text style={styles.uploadButtonText}>
                {screenshot ? `Change: ${screenshot.fileName}` : "Choose a file"}
              </Text>
            </TouchableOpacity>
            {screenshot && (
              <TouchableOpacity onPress={() => setScreenshot(null)} style={styles.clearImage}>
                <Ionicons name="close-circle" size={22} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isLoading || !subject.trim() || !description.trim()) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !subject.trim() || !description.trim()}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Send Request</Text>}
            </TouchableOpacity>

            <Text style={styles.note}>
              Required fields are marked. Submitting creates a traceable ticket.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 40, paddingBottom: 15, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0", alignItems: "center", justifyContent: "center", position: "relative" },
  closeButton: { position: "absolute", left: 10, bottom: 10, padding: 10 },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  content: { flex: 1, padding: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#334155", marginBottom: 5, marginTop: 15 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, fontSize: 16, color: "#0f172a" },
  readOnlyInput: { backgroundColor: "#f1f5f9" },
  readOnlyText: { color: "#64748b", fontSize: 16 },
  descriptionInput: { minHeight: 120 },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, gap: 8, flex: 1 },
  uploadButtonText: { color: "#0f172a", fontSize: 14, fontWeight: "500" },
  clearImage: { padding: 4 },
  footer: { marginTop: 30, alignItems: "center" },
  submitButton: { backgroundColor: "#10b981", borderRadius: 10, paddingVertical: 14, width: "100%", alignItems: "center" },
  disabledButton: { backgroundColor: "#a7f3d0" },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  note: { marginTop: 15, fontSize: 12, color: "#64748b", textAlign: "center" },
});
