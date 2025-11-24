// src/features/admin/components/EventFormModal.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Custom components & utils
import { pickSingleImageNative } from "../../../utils/imagePicker.native";
import { resizeImageNative } from "../../../utils/resizeNative";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../../services/firebaseConfig";
import { saveEvent, formatDateForInput } from "../services/eventService";

// 👇 NEW: Import the fixed date picker
import UniversalDatePicker from "../../../components/common/UniversalDatePicker"; 
import SubEventManager from "./SubEventManager";

export default function EventFormModal({ visible, onClose, eventToEdit, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [draftImage, setDraftImage] = useState(null);
  const [draftPreview, setDraftPreview] = useState(null);

  // Initialize with empty strings to prevent "uncontrolled" warnings
  const [formData, setFormData] = useState({
    title: "", description: "", eventType: "single", startDate: "", endDate: "", 
    hasSubEvents: false, subEvents: [], imageUrl: ""
  });

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        ...eventToEdit,
        title: eventToEdit.title || "",
        description: eventToEdit.description || "",
        startDate: formatDateForInput(eventToEdit.startDate) || "",
        endDate: formatDateForInput(eventToEdit.endDate) || "",
        hasSubEvents: eventToEdit.subEvents?.length > 0,
        subEvents: eventToEdit.subEvents || [],
        imageUrl: eventToEdit.imageUrl || ""
      });
      setDraftImage(null);
      setDraftPreview(null);
    } else {
      setFormData({ title: "", description: "", eventType: "single", startDate: "", endDate: "", hasSubEvents: false, subEvents: [], imageUrl: "" });
      setDraftImage(null);
      setDraftPreview(null);
    }
  }, [eventToEdit, visible]);

  // --- IMAGE LOGIC ---
  async function pickWebImage() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return reject(new Error('No file selected'));
        resolve(file);
      };
      input.onerror = (e) => reject(e);
      input.click();
    });
  }

  const handlePickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const file = await pickWebImage();
        setDraftImage({
          file,
          name: file.name,
          type: file.type || 'image/jpeg',
        });
        setDraftPreview(URL.createObjectURL(file));
      } else {
        const picked = await pickSingleImageNative({
          quality: 0.9, maxWidth: 2048, maxHeight: 2048,
        });
        const resizedUri = await resizeImageNative(picked.uri, {
          width: 1280, quality: 0.7, format: 'JPEG',
        });
        setDraftImage({
          uri: resizedUri,
          fileName: picked.fileName || 'upload.jpg',
          mime: picked.mime || 'image/jpeg',
        });
        setDraftPreview(resizedUri);
      }
    } catch (err) {
      console.warn('Pick image cancelled/failed:', err?.message || err);
    }
  };

  // --- UPLOAD LOGIC ---
  const uploadImageToFirebase = async () => {
    if (!draftImage) return formData.imageUrl; 

    setUploading(true);
    setUploadProgress(0);

    try {
      let body, mime, fileName;

      if (Platform.OS === 'web' && draftImage.file) {
        body = draftImage.file;
        mime = draftImage.type;
        fileName = draftImage.name;
      } else {
        const { uri, fileName: nName, mime: nMime } = draftImage;
        body = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new TypeError('Failed to convert URI to Blob'));
          xhr.responseType = 'blob';
          xhr.open('GET', uri, true);
          xhr.send(null);
        });
        mime = nMime || 'image/jpeg';
        fileName = nName || 'upload.jpg';
      }

      const safeName = (fileName || 'upload.jpg').split('?')[0];
      const storageRef = ref(storage, `events/${Date.now()}_${safeName}`);
      const uploadTask = uploadBytesResumable(storageRef, body, { contentType: mime });

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
            setUploadProgress(Math.round(pct));
          },
          (error) => {
            setUploading(false);
            reject(error);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploading(false);
            resolve(downloadUrl);
          }
        );
      });

    } catch (error) {
      setUploading(false);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate) {
      Alert.alert("Missing Fields", "Title and Start Date are required.");
      return;
    }

   setLoading(true);
    try {
      const finalImageUrl = await uploadImageToFirebase();
      const payload = { ...formData, imageUrl: finalImageUrl };
      
      // Capture the result ID (if your service returns it) or just pass payload
      const savedResult = await saveEvent(payload, null); 
      
      // ✅ FIX: Pass the saved data back to parent for logging
      onSuccess(savedResult || payload); 
    } catch (err) {
      // ... error handling ...
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{eventToEdit ? "Edit Event" : "New Event"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 20 }}>
            
            {/* Image Picker */}
            <Text style={styles.label}>Thumbnail Image</Text>
            <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.imagePicker}>
              {uploading ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator color="#0f37f1" />
                  <Text style={styles.placeholderText}>Uploading {uploadProgress}%...</Text>
                </View>
              ) : draftPreview || formData.imageUrl ? (
                <Image source={{ uri: draftPreview || formData.imageUrl }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={30} color="#94a3b8" />
                  <Text style={styles.placeholderText}>Tap to pick image</Text>
                </View>
              )}
              {(draftPreview || formData.imageUrl) && !uploading && (
                <View style={styles.changeImageBadge}>
                  <Text style={styles.changeImageText}>Change</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Fields */}
            <Text style={styles.label}>
              Event Title <Text style={{color:'#ef4444'}}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Summer Festival"
              value={formData.title}
              onChangeText={(t) => setFormData({...formData, title: t})}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief details..."
              value={formData.description}
              onChangeText={(t) => setFormData({...formData, description: t})}
              multiline
              textAlignVertical="top"
            />

            {/* Date Type */}
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.radioBtn, formData.eventType === 'single' && styles.radioActive]}
                onPress={() => setFormData({...formData, eventType: 'single'})}
              >
                <Text style={[styles.radioText, formData.eventType === 'single' && styles.radioTextActive]}>Single Date</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioBtn, formData.eventType === 'range' && styles.radioActive]}
                onPress={() => setFormData({...formData, eventType: 'range'})}
              >
                <Text style={[styles.radioText, formData.eventType === 'range' && styles.radioTextActive]}>Date Range</Text>
              </TouchableOpacity>
            </View>

            {/* Date Inputs (Using Universal Picker) */}
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <UniversalDatePicker 
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(d) => setFormData(prev => ({...prev, startDate: d}))}
                />
              </View>

              {formData.eventType === 'range' && (
                <View style={{flex: 1}}>
                  <UniversalDatePicker 
                    label="End Date"
                    value={formData.endDate}
                    onChange={(d) => setFormData(prev => ({...prev, endDate: d}))}
                  />
                </View>
              )}
            </View>

            {/* Sub-Events */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Has Sub-Events?</Text>
                <Text style={styles.switchSub}>Add activities inside this event</Text>
              </View>
              <Switch
                value={formData.hasSubEvents}
                onValueChange={(v) => setFormData(prev => ({...prev, hasSubEvents: v}))}
                trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                thumbColor={formData.hasSubEvents ? "#0f37f1" : "#f1f5f9"}
              />
            </View>

            {formData.hasSubEvents && (
              <SubEventManager 
                subEvents={formData.subEvents || []} 
                onChange={(newSubs) => setFormData(prev => ({ ...prev, subEvents: newSubs }))}
              />
            )}

          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={loading || uploading}
              style={[styles.saveBtn, (loading || uploading) && {opacity: 0.7}]}
            >
              {loading || uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Event</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 16, maxHeight: "90%", overflow: "hidden", width: 720, maxWidth: "80%", alignSelf: "center"},
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#f1f5f9" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  scrollContent: { padding: 16 },
  
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 10, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc" },
  textArea: { height: 80 },

  imagePicker: { height: 240, borderWidth: 1, borderColor: "#cbd5e1", borderStyle: "dashed", borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", overflow: 'hidden', position: 'relative' },
  imagePlaceholder: { alignItems: "center" },
  placeholderText: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  previewImage: { width: "100%", height: "100%" },
  
  changeImageBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  changeImageText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  radioBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, alignItems: "center" },
  radioActive: { borderColor: "#0f37f1", backgroundColor: "#eff6ff" },
  radioText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  radioTextActive: { color: "#0f37f1" },

  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: "#f1f5f9" },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  switchSub: { fontSize: 12, color: "#64748b" },

  footer: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderColor: "#f1f5f9", backgroundColor: "#f8fafc" },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", alignItems: "center" },
  cancelText: { color: "#475569", fontWeight: "600" },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#0f37f1", alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" }
});