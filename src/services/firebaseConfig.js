// src/services/firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Use EXACTLY what the Firebase Console shows for Storage bucket
const firebaseConfig = {
  
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  
  projectId: "toures-2025",
  storageBucket: "toures-2025.firebasestorage.app",
  messagingSenderId: "485530509427",
  appId: "1:485530509427:web:1eb908c05f174f6bb84a06"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth: native persistence on iOS/Android
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

// Option A: rely on storageBucket from config (good if console shows this bucket)
const storage = getStorage(app);

// Option B (extra explicit): point to the bucket explicitly
// const storage = getStorage(app, `gs://${storageBucket}`);

export { app, auth, db, storage };
