import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, Alert } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import AdminNavigator from './src/navigation/AdminLoginNavigator';
import UserNavigator from './src/navigation/UserLoginNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './src/services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// import { startNotificationLogging } from './src/services/notificationLogs';
import useAdminTicketAlerts from './src/features/admin/hooks/useAdminTicketAlerts';
import { ensureNotiReady } from './src/services/notifications';

// 👇 1. IMPORT REMOVED (runAutoEventCleanup)
// import { runAutoEventCleanup } from './src/features/admin/services/eventService';

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const isWeb = Platform.OS === 'web';

  if (typeof console !== 'undefined' && console.warn) {
    const oldWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];
      if (
        message &&
        (message.startsWith('Warning: findDOMNode is deprecated') ||
          message.startsWith('"shadow*" style props are deprecated') ||
          message.includes('props.pointerEvents is deprecated'))
      ) {
        return;
      }
      oldWarn.apply(console, args);
    };
  }

  // --- Location Permission ---
  const requestLocationPermission = async () => {
    if (isWeb) {
      setLocationPermissionGranted(true);
      return;
    }
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Required',
        'Please enable location services to use features like the Explore map. You can grant permission in your device settings.',
        [{ text: 'OK', onPress: () => setLocationPermissionGranted(false) }]
      );
      setInitializing(false);
      return;
    }
    setLocationPermissionGranted(true);
  };

  // --- App Initialization ---
  useEffect(() => {
    requestLocationPermission();

    // 🔔 Set up Expo notification permissions & channels
    ensureNotiReady();

    // 🟢 Start local notification logging system
    // const cleanupNoti = startNotificationLogging();

    // 👤 Firebase Auth listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) setUserRole(userDoc.data().role);

        // 👇 2. AUTO EVENT CLEANUP REMOVED
        // setTimeout(() => {
        //   runAutoEventCleanup().catch(err => console.log("Auto-cleanup skipped:", err));
        // }, 2000);

      } else {
        setUserRole(null);
      }
      setInitializing(false);
    });

    return () => {
      unsubscribeAuth();
      // cleanupNoti();
    };
  }, []);

  // --- 🔔 Global admin ticket listener (admin or superadmin only) ---
  useAdminTicketAlerts({
    uid: user?.uid,
    role: userRole,
  });

  // --- Loading state ---
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --- Navigation theme ---
  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#ffffff',
    },
  };

  // --- Render Navigators ---
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar
          style="dark"
          backgroundColor="#ffffff"
          translucent={false}
          hidden={false}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <NavigationContainer theme={MyTheme}>
            {!user ? (
              isWeb ? (
                <AdminNavigator isAuth={false} />
              ) : (
                <UserNavigator isAuth={false} />
              )
            ) : isWeb ? (
              <AdminNavigator isAuth={true} role={userRole} />
            ) : (
              <UserNavigator isAuth={true} role={userRole} />
            )}
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
