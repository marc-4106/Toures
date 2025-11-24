// src/features/user/screens/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import * as pkg from 'react-native-image-picker/package.json';
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
  NativeModules,
} from 'react-native';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickSingleImage } from '../../../utils/imagePicker.native';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import profile from '../../../../assets/profile.png';

const EditProfileScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState(null);

  const [photoURL, setPhotoURL] = useState(null);
  const [localPhoto, setLocalPhoto] = useState(null); // { uri, fileName, mime }
  const [uploading, setUploading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const [imgVer, setImgVer] = useState(0); // cache-buster for Image URIs

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const user = auth.currentUser;

  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('RN version:', Platform.Version);
      console.log('RNIP version:', pkg.version);
      console.log('Has ImagePickerManager:', !!NativeModules.ImagePickerManager);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setEmail(data.email || '');
          setAddress(data.address || '');
          setPhone(data.phone || '');
          setGender(data.gender || '');
          setDob(data.dob ? new Date(data.dob) : null);
          setPhotoURL(data.photoURL || user.photoURL || null);
        } else {
          console.log('No user profile found.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const formatDateOnly = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;

  const pickImage = async () => {
    try {
      console.log('[EditProfile] Change photo tapped');
      const picked = await pickSingleImage({ quality: 0.8, maxWidth: 1280, maxHeight: 1280 });
      console.log('[EditProfile] picked:', picked);
      setLocalPhoto({
        uri: picked.uri,
        fileName: picked.fileName || 'profile.jpg',
        mime: picked.mime || 'image/jpeg',
      });
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('cancel')) return;
      console.error('Image pick error:', e);
      Alert.alert('Error', e?.message || 'Failed to open gallery.');
    }
  };

  const uploadPhoto = async () => {
    if (!user || !localPhoto?.uri) return;
    setUploading(true);
    try {
      // best effort: delete any old variants first to avoid orphans
      try {
        const uid = user.uid;
        const candidates = [
          `profilePhotos/${uid}.jpg`,
          `profilePhotos/${uid}.jpeg`,
          `profilePhotos/${uid}.png`,
          `profilePhotos/${uid}.webp`,
        ];
        for (const p of candidates) {
          try {
            await deleteObject(ref(storage, p));
          } catch {}
        }
      } catch {}

      const resp = await fetch(localPhoto.uri);
      const blob = await resp.blob();

      const objectPath = `profilePhotos/${user.uid}.jpg`;
      const storageRef = ref(storage, objectPath);

      await uploadBytes(storageRef, blob, { contentType: localPhoto.mime || 'image/jpeg' });
      const url = await getDownloadURL(storageRef);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: url });
      await updateProfile(user, { photoURL: url });
      await user.reload();

      setPhotoURL(url);
      setLocalPhoto(null);
      setImgVer((v) => v + 1); // bust cache so <Image> refreshes
      Alert.alert('Success', 'Profile photo updated.');
    } catch (e) {
      console.error('Upload error:', e);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const uid = user.uid;

      // try delete by current download URL, if present
      if (photoURL) {
        try {
          await deleteObject(ref(storage, photoURL));
        } catch {}
      }
      // delete common file name variants
      const variants = [
        `profilePhotos/${uid}.jpg`,
        `profilePhotos/${uid}.jpeg`,
        `profilePhotos/${uid}.png`,
        `profilePhotos/${uid}.webp`,
      ];
      for (const path of variants) {
        try {
          await deleteObject(ref(storage, path));
        } catch {}
      }
      // optional sweep of folder (safe if folder is small)
      try {
        const baseRef = ref(storage, 'profilePhotos');
        const all = await listAll(baseRef);
        const mine = all.items.filter((it) => it.name.startsWith(uid));
        for (const itemRef of mine) {
          try {
            await deleteObject(itemRef);
          } catch {}
        }
      } catch {}

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { photoURL: null });
      await updateProfile(user, { photoURL: null });
      await user.reload();

      setPhotoURL(null);
      setLocalPhoto(null);
      setImgVer((v) => v + 1); // ensure any cached URI is bypassed

      Alert.alert('Removed', 'Profile photo removed.');
    } catch (e) {
      console.error('Remove photo error:', e);
      Alert.alert('Error', 'Failed to remove photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        email,
        address,
        phone,
        gender,
        dob: dob ? formatDateOnly(dob) : null,
      });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDob(selectedDate);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1badf9" />
      </View>
    );
  }

  // local selection takes priority, then remote URL (with cache-buster), else local asset
  const displaySource = localPhoto?.uri
    ? { uri: localPhoto.uri }
    : photoURL
    ? { uri: `${photoURL}?v=${imgVer}` }
    : profile;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.photoContainer}>
        <Image source={displaySource} style={styles.photo} />
        {uploading ? (
          <View style={{ marginTop: 10 }}>
            <ActivityIndicator size="small" color="#1badf9" />
          </View>
        ) : (
          <View style={styles.photoButtonsRow}>
            <Pressable style={[styles.smallBtn, styles.outlineBtn]} onPress={pickImage}>
              <Text style={[styles.smallBtnText, { color: '#1badf9' }]}>
                {localPhoto ? 'Change selection' : 'Change photo'}
              </Text>
            </Pressable>

            {localPhoto ? (
              <Pressable style={styles.smallBtn} onPress={uploadPhoto}>
                <Text style={styles.smallBtnText}>Upload</Text>
              </Pressable>
            ) : photoURL ? (
              <Pressable style={[styles.smallBtn, styles.dangerBtn]} onPress={removePhoto}>
                <Text style={styles.smallBtnText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {localPhoto ? (
          <Text style={styles.infoText}>Preview not yet saved - tap Upload to apply.</Text>
        ) : (
          <Text style={styles.infoText}>You can upload a square photo.</Text>
        )}
      </View>

      <TextInput placeholder="Full Name" style={styles.input} value={name} onChangeText={setName} />

      <TextInput
        placeholder="Email Address"
        style={[styles.input, styles.disabledInput]}
        value={email}
        editable={false}
      />

      <TextInput placeholder="Address" style={styles.input} value={address} onChangeText={setAddress} />

      <TextInput
        placeholder="Phone Number"
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        placeholder="Gender (e.g., Male, Female, Other)"
        style={styles.input}
        value={gender}
        onChangeText={setGender}
      />

      <Pressable style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: dob ? '#000' : '#888' }}>{dob ? dob.toDateString() : 'Select Date of Birth'}</Text>
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          value={dob || new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={uploading}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </Pressable>

      <Text style={styles.noteText}>
        * This information is not yet final and may change based on further data gathering.
      </Text>
    </ScrollView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  photoContainer: { alignItems: 'center', marginBottom: 24 },
  photo: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#ccc' },
  photoButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: { backgroundColor: '#1badf9', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1badf9' },
  dangerBtn: { backgroundColor: '#ef4444' },
  infoText: { marginTop: 8, fontSize: 13, color: '#888', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 15, fontSize: 16 },
  disabledInput: { backgroundColor: '#f0f0f0', color: '#888' },
  saveButton: { backgroundColor: '#1badf9', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noteText: { marginTop: 10, fontSize: 13, color: '#666', fontStyle: 'italic' },
});
