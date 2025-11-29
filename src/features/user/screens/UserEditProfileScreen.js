import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, updateProfile } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { pickSingleImage } from "../../../utils/imagePicker.native";
import profilePlaceholder from "../../../../assets/profile.png";

const EditProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState(new Date());

  // Photo State
  const [photoURL, setPhotoURL] = useState(null);
  const [localPhoto, setLocalPhoto] = useState(null);
  const [imgVer, setImgVer] = useState(0);

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const user = auth.currentUser;

  // Load User Data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || user.displayName || "");
          setEmail(data.email || user.email || "");
          setAddress(data.address || "");
          setPhone(data.phone || "");
          setGender(data.gender || "Not Specified");
          
          if (data.dob) {
            setDob(new Date(data.dob));
          }
          setPhotoURL(data.photoURL || user.photoURL || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Format Date for Display (e.g. "Jan 01, 1990")
  const formatDateDisplay = (date) => {
    if (!date) return "Select Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Image Logic
  const pickImage = async () => {
    try {
      const picked = await pickSingleImage({ quality: 0.8, maxWidth: 800, maxHeight: 800 });
      if (picked?.uri) {
        setLocalPhoto({
          uri: picked.uri,
          mime: picked.mime || "image/jpeg",
        });
      }
    } catch (e) {
      if (!String(e?.message).includes("cancel")) {
        Alert.alert("Error", "Could not select image.");
      }
    }
  };

  const uploadPhoto = async () => {
    if (!user || !localPhoto?.uri) return;
    setUploading(true);
    try {
      // 1. Delete old photo if exists (optional cleanup)
      try {
        const oldRef = ref(storage, `profilePhotos/${user.uid}.jpg`);
        await deleteObject(oldRef);
      } catch (e) { /* ignore if not exists */ }

      // 2. Upload New
      const resp = await fetch(localPhoto.uri);
      const blob = await resp.blob();
      const storageRef = ref(storage, `profilePhotos/${user.uid}.jpg`);
      
      await uploadBytes(storageRef, blob, { contentType: localPhoto.mime });
      const url = await getDownloadURL(storageRef);

      // 3. Update Auth & Firestore
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });

      setPhotoURL(url);
      setLocalPhoto(null);
      setImgVer((v) => v + 1); // Refresh image cache
      Alert.alert("Success", "Profile photo updated!");
    } catch (e) {
      console.error(e);
      Alert.alert("Upload Failed", "Please try again later.");
    } finally {
      setUploading(false);
    }
  };

  // Save All Changes
  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("Missing Name", "Please enter your full name.");
    
    setSaving(true);
    try {
      // If a new photo is selected but not uploaded, upload it first
      if (localPhoto) {
        await uploadPhoto(); 
      }

      const userRef = doc(db, "users", user.uid);
      const payload = {
        name,
        address,
        phone,
        gender,
        dob: dob.toISOString(), // Standard ISO format for DB
      };

      await updateDoc(userRef, payload);
      await updateProfile(user, { displayName: name });

      Alert.alert("Profile Updated", "Your changes have been saved.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f37f1" />
      </View>
    );
  }

  // Resolve Image Source
  const avatarSource = localPhoto 
    ? { uri: localPhoto.uri } 
    : photoURL 
      ? { uri: `${photoURL}?v=${imgVer}` } 
      : profilePlaceholder;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* --- 1. PHOTO SECTION --- */}
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            <Image source={avatarSource} style={styles.avatar} />
            <Pressable style={styles.cameraBtn} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="#fff" />
            </Pressable>
          </View>
          
          {localPhoto && (
            <Pressable 
              style={styles.uploadBtn} 
              onPress={uploadPhoto} 
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadText}>Upload New Photo</Text>}
            </Pressable>
          )}
        </View>

        {/* --- 2. FORM FIELDS --- */}
        <View style={styles.form}>
          
          {/* Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="e.g. Juan Dela Cruz" 
          />

          {/* Email (Read Only) */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.input, styles.disabledInput]}>
            <Text style={{ color: "#64748b" }}>{email}</Text>
            <Ionicons name="lock-closed" size={16} color="#94a3b8" />
          </View>

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            style={styles.input} 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad"
            placeholder="0912 345 6789" 
          />

          {/* Address */}
          <Text style={styles.label}>Address</Text>
          <TextInput 
            style={styles.input} 
            value={address} 
            onChangeText={setAddress} 
            placeholder="City, Province" 
          />

          {/* Gender (Dropdown) */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={(itemValue) => setGender(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value="" color="#94a3b8" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Prefer not to say" value="Other" />
            </Picker>
          </View>

          {/* Date of Birth (DatePicker) */}
          <Text style={styles.label}>Date of Birth</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <View style={styles.input}>
              <Text style={{ color: "#0f172a" }}>{formatDateDisplay(dob)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
            </View>
          </Pressable>

          {/* Date Picker Modal Logic */}
          {showDatePicker && (
            <DateTimePicker
              value={dob}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDob(selectedDate);
              }}
              maximumDate={new Date()} // Can't be born in future
            />
          )}

        </View>

        {/* --- 3. SAVE BUTTON --- */}
        <Pressable 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={saving || uploading}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  
  /* Photo Section */
  photoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e2e8f0',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0f37f1',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadBtn: {
    marginTop: 12,
    backgroundColor: '#0f37f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Form Section */
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  
  /* Picker Styles */
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden', // Ensures picker stays inside border
    justifyContent: 'center',
  },
  picker: {
    height: 50, // Standard touch target
    width: '100%',
  },

  /* Save Button */
  saveBtn: {
    backgroundColor: '#0f37f1',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: "#0f37f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EditProfileScreen;