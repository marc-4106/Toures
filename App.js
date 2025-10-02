import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, Alert } from 'react-native'; // Import Alert
import { NavigationContainer } from '@react-navigation/native';
import AdminNavigator from './src/navigation/AdminLoginNavigator';
import UserNavigator from './src/navigation/UserLoginNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './src/services/firebaseConfig'; 
import { doc, getDoc } from 'firebase/firestore';

// Import expo-location
import * as Location from 'expo-location'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false); // New state
  const isWeb = Platform.OS === 'web';

  // Function to request location permission
  const requestLocationPermission = async () => {
    if (isWeb) {
      setLocationPermissionGranted(true); // Always grant for web to proceed
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        "Location Required",
        "Please enable location services to use features like the Explore map. You can grant permission in your device settings.",
        [
          { text: "OK", onPress: () => setLocationPermissionGranted(false) } // Keep false if denied
        ]
      );
      // We set initializing to false here to allow the UI to load 
      // even if permission is denied, but the map won't work correctly.
      setInitializing(false);
      return;
    }

    setLocationPermissionGranted(true);
  };


  // Effect to handle Firebase auth state
  useEffect(() => {
    // Request location permission immediately upon app load
    requestLocationPermission(); 

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role); // e.g., 'admin' or 'user'
        }
      } else {
        setUserRole(null);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  // Show loader while initializing or while requesting permission
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // NOTE: We don't block navigation if permission is denied, 
  // but map functionality will be degraded for the user.

  return (
    <AuthProvider>
      <NavigationContainer>
        {!user ? (
          isWeb ? <AdminNavigator isAuth={false} /> : <UserNavigator isAuth={false} />
        ) : (
          isWeb ? <AdminNavigator isAuth={true} role={userRole} /> : <UserNavigator isAuth={true} role={userRole} />
        )}
      </NavigationContainer>
    </AuthProvider>
  );
}