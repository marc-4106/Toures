import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../features/admin/screens/AdminLoginScreen';
import DrawerNav from './AdminDrawerNavigator';

const Stack = createNativeStackNavigator();

const AdminLoginNavigator = () => {
  const { user, role } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="AdminLogin" component={LoginScreen} />
      ) : role === 'admin' || role === 'superadmin' ? (
        <Stack.Screen
          name="AdminDrawer"
          // 👇 pass role as prop
          children={(props) => <DrawerNav {...props} role={role} />}
        />
      ) : (
        <Stack.Screen name="AdminLogin" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AdminLoginNavigator;
