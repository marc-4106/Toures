import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../features/user/screens/UserHomeScreen';
import MyListScreen from '../features/user/screens/UserMyListScreen';
import ExploreScreen from '../features/user/screens/UserExploreScreen';
import ProfileScreen from '../features/user/screens/UserProfileScreen';
import ExpertScreen from '../features/user/screens/UserExpertScreen';

const Tab = createBottomTabNavigator();

// Shared icon configuration
const createTabBarIcon = (name, focused) => (
  <Ionicons
    name={focused ? name : `${name}-outline`}
    size={focused ? 30 : 26}
    color={focused ? '#1badf9' : 'gray'}
  />
);

// Shared label renderer
const createTabBarLabel = (label, focused) => (
<Text style={{ color: focused ? '#1badf9' : 'gray', fontSize: 12 }}>{label}</Text>
);

const UsersBottomTabNavigator = () => {
  return (
    <SafeAreaProvider>

    
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
      headerShown: false,
      tabBarStyle: {
      position: 'absolute',
      height: 70,
      borderTopWidth: 0,
      elevation: 0,
      backgroundColor: '#fff',
      overflow: 'visible',   
      paddingBottom: 10,
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
        name="MyList"
        component={MyListScreen}
        options={{
          tabBarIcon: ({ focused }) => createTabBarIcon('list', focused),
          tabBarLabel: ({ focused }) => createTabBarLabel('MyList', focused),
        }}
      />
      <Tab.Screen 
          name="Expert" 
          component={ExpertScreen} 
          options={{ 
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.fabWrapper}>
             <View style={[styles.fabButton, { borderColor: focused ? '#1badf9' : 'gray' }]}>
               <Ionicons
                  name={focused ? 'bulb' : 'bulb-outline'}
                  size={28}
                  color={focused ? '#1badf9' : 'gray'}
              />
             </View>
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
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1badf9',
    elevation: 6,
    shadowColor: '#1badf9',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
});