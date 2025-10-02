import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/user/screens/UserLoginScreen';
import WelcomeScreen from '../features/user/screens/WelcomeScreen';
import RegisterScreen from '../features/user/screens/UserRegisterScreen';
import BottomTab from './UsersBottomTabNavigator'
import NotificationScreen from '../features/user/screens/UserNotificationScreen';
import EditProfileScreen from '../features/user/screens/UserEditProfileScreen'



const Stack = createNativeStackNavigator();

const LoginNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component ={WelcomeScreen}/>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={RegisterScreen}/>
      <Stack.Screen name="BottomTab" component={BottomTab} />
      <Stack.Screen name="Notification" component={NotificationScreen} options={{headerShown: true}}/>
      <Stack.Screen name='EditProfile' component={EditProfileScreen} options={{headerShown: true}}/>
    </Stack.Navigator>
  );
  
};

export default LoginNavigator;
