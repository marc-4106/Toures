import React, { useCallback } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  Text,
  View,
  StyleSheet,
  Image,            // 👈 add Image
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

import HomeScreen from '../features/user/screens/UserHomeScreen';
import EventScreen from '../features/user/screens/EventScreen';
import ExploreScreen from '../features/user/screens/UserExploreScreen';
import ProfileScreen from '../features/user/screens/UserProfileScreen';
import ExpertScreen from '../features/user/screens/UserExpertScreen';

const Tab = createBottomTabNavigator();

// ✅ load your Toures logo for the center tab icon
// (path is correct for a file in src/navigation → ../../assets/...)
const touresLogo = require('../../assets/login/WhiteToures.png');

const createTabBarIcon = (name, focused) => (
  <Ionicons
    name={focused ? name : `${name}-outline`}
    size={focused ? 30 : 26}
    color={focused ? '#1badf9' : 'gray'}
  />
);

const createTabBarLabel = (label, focused) => (
  <Text style={{ color: focused ? '#1badf9' : 'gray', fontSize: 12 }}>{label}</Text>
);

const UsersBottomTabNavigator = () => {
  const navigation = useNavigation();

  // 🔒 Intercept Android hardware back at the tab root
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        Alert.alert(
          'Logout?',
          'Do you want to logout and return to the Welcome screen?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: async () => {
                try {
                  await signOut(auth);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Welcome' }], // change if your unauth route has a different name
                  });
                } catch (e) {
                  console.warn('Sign out failed:', e);
                  Alert.alert('Logout failed', e?.message ?? 'Please try again.');
                }
              },
            },
          ]
        );
        return true; // prevent default back navigation
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );

  return (
    <SafeAreaProvider>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute',
            height: 55,
            borderTopWidth: 0,
            elevation: 0,
            backgroundColor: '#fff',
            overflow: 'visible',
            paddingBottom: 5,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => createTabBarIcon('home', focused),
            tabBarLabel: ({ focused }) => createTabBarLabel('Home', focused),
          }}
        />

        <Tab.Screen
          name="Events"
          component={EventScreen}
          options={{
            tabBarIcon: ({ focused }) => createTabBarIcon('calendar', focused),
            tabBarLabel: ({ focused }) => createTabBarLabel('Events', focused),
          }}
        />

        <Tab.Screen
          name="FuzzyPlan"
          component={ExpertScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ focused }) => (
              <View style={styles.fabWrapper} accessible accessibilityLabel="Fuzzy Plan">
                <View
                  style={[
                    styles.fabButton,
                    // subtle border color change on focus
                    { borderColor: focused ? '#1badf9' : 'gray' },
                  ]}
                >
                  {/* 🖼️ Use your Toures image as the icon */}
                  <Image
                    source={touresLogo}
                    style={[
                      styles.fabImage,
                      // If your WhiteToures.png is light/white, tint it to match your brand color
                      // { tintColor: focused ? '#1badf9' : 'gray' },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.fabLabel, { color: focused ? '#1badf9' : 'gray' }]}>
                  Fuzzy Plan
                </Text>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Explore"
          component={ExploreScreen}
          options={{
            tabBarIcon: ({ focused }) => createTabBarIcon('search', focused),
            tabBarLabel: ({ focused }) => createTabBarLabel('Explore', focused),
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) => createTabBarIcon('person', focused),
            tabBarLabel: ({ focused }) => createTabBarLabel('Profile', focused),
          }}
        />
      </Tab.Navigator>
    </SafeAreaProvider>
  );
};

export default UsersBottomTabNavigator;

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  fabButton: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 3,
    // borderColor: '#1badf9',
    elevation: 6,
    shadowColor: '#1badf9',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  fabImage: {
    width: 55,
    height: 55,
  },
  fabLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
});
