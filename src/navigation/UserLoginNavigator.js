import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/user/screens/UserLoginScreen';
import WelcomeScreen from '../features/user/screens/WelcomeScreen';
import RegisterScreen from '../features/user/screens/UserRegisterScreen';
import BottomTab from './UsersBottomTabNavigator'
import NotificationScreen from '../features/user/screens/UserNotificationScreen';
import EditProfileScreen from '../features/user/screens/UserEditProfileScreen';
import TravelPreferencesScreen from "../features/user/screens/TravelPreferencesScreen";
import ItineraryPreviewScreen from '../features/user/screens/ItineraryPreviewScreen';
import ItineraryDetailsScreen from "../features/user/screens/ItineraryDetailsScreen";
import ArchivedItinerariesScreen from "../features/user/screens/ArchivedItinerariesScreen"
import HelpSupportScreen from '../features/user/screens/HelpSupportScreen';
import AppSettingsScreen from '../features/user/screens/AppSettingsScreen';
import VerifyEmailScreen from '../features/user/screens/VerifyEmailScreen';
import FAQScreen from '../features/user/screens/faqScreen';
import TermsConditionsScreen from '../features/user/screens/TermsConditionsScreen';
import PrivacyPolicy from '../features/user/screens/PrivacyPolicyScreen'




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
      <Stack.Screen name="TravelPreferences" component={TravelPreferencesScreen} />
      <Stack.Screen
        name="ItineraryPreview"
        component={ItineraryPreviewScreen}
        options={{ title: 'Itinerary Preview' }}
      /> 
      
      <Stack.Screen
        name="ItineraryDetails"
        component={ItineraryDetailsScreen}
        options={{
          title: "Itinerary Details",
          headerTintColor: "#0f37f1",
          headerStyle: { backgroundColor: "#fff" },
        }}
      />
            <Stack.Screen
        name="ArchivedItineraries"
        component={ArchivedItinerariesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ title: "Settings" }} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: "Help & Support" }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: "Email Verification" }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} options={{ title: "Privacy Policy" }} />
      <Stack.Screen
        name="FAQScreen"
        component={FAQScreen}
        options={{
          title: "Frequently Asked Questions",
          headerTintColor: "#0f37f1",
          headerStyle: { backgroundColor: "#fff" },
        }}
      />
      <Stack.Screen
        name="TermsConditionScreen"
        component={TermsConditionsScreen}
        options={{
          title: "Terms & Conditions",
          headerTintColor: "#0f37f1",
          headerStyle: { backgroundColor: "#fff" },
        }}
      />
    </Stack.Navigator>
  );
  
};

export default LoginNavigator;
