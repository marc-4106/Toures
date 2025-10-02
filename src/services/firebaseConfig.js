import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase Config (Replace with your actual config)
const firebaseConfig = {
  
  apiKey: "AIzaSyB8ovXpuWQwljZo7HwiS47QkYW6Wbjba2Q",
  authDomain: "toures-2025.firebaseapp.com",
  projectId: "toures-2025",
  storageBucket: "toures-2025.appspot.app",
  messagingSenderId: "485530509427",
  appId: "1:485530509427:web:1eb908c05f174f6bb84a06"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app); // For web, just use getAuth
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

// Export Firebase Auth
export { auth, db };