// src/utils/confirmLogout.js
import { Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

export function confirmLogout() {
  return new Promise((resolve) => {
    Alert.alert(
      'Logout?',
      'Do you want to logout and return to the Welcome screen?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              resolve(true);
            } catch {
              resolve(false);
            }
          },
        },
      ]
    );
  });
}
