import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Alert, Modal, TouchableOpacity
} from 'react-native';
import { auth, db } from '../../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import profile from '../../../../assets/profile.png'

const UserProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);


  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        console.log('No user data found!');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);


  const handleLogout = () => {
  setLogoutModalVisible(true);
};

  const confirmLogout = async () => {
  try {
    setLogoutModalVisible(false);
    await signOut(auth);
    navigation.replace('Login');
  } catch (error) {
    Alert.alert('Logout Failed', error.message);
  }
};


  if (!userData) {
    return (
      <View style={styles.centered}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Image
          source={profile}
          style={styles.avatar}
        />
        <View style={styles.textColumn}>
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <MenuItem label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
        <MenuItem label="Settings" onPress={() => Alert.alert('STILL UNDER DEVELOPRMENT')} />
        <MenuItem label="Terms & Conditions" onPress={() => Alert.alert('STILL UNDER DEVELOPRMENT')} />
        <MenuItem label="Privacy Policy" onPress={() => Alert.alert('STILL UNDER DEVELOPRMENT')} />
        <MenuItem label="Help" onPress={() => Alert.alert('STILL UNDER DEVELOPRMENT')} />
        <MenuItem label="Logout" onPress={handleLogout} isLogout />
      </ScrollView>

      <Modal
  transparent
  visible={logoutModalVisible}
  animationType="fade"
  onRequestClose={() => setLogoutModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Confirm Logout</Text>
      <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>

      <View style={styles.modalButtons}>
        <TouchableOpacity onPress={() => setLogoutModalVisible(false)} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmLogout} style={styles.logoutConfirmButton}>
          <Text style={styles.logoutConfirmText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </View>
  );
};

const MenuItem = ({ label, onPress, isLogout }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.menuItem,
      isLogout && styles.logoutItem,
      pressed && { opacity: 0.8 },
    ]}
  >
    <Text style={[styles.menuText, isLogout && styles.logoutText]}>{label}</Text>
    <Ionicons
      name="chevron-forward"
      size={20}
      color={isLogout ? '#fff' : '#555'}
    />
  </Pressable>
);

export default UserProfileScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0FF',
  },
headerBox: {
  backgroundColor: '#1badf9',
  height: 220,               
  paddingHorizontal: 20,
  flexDirection: 'row',      
  alignItems: 'center',      
  
},
avatar: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: '#ccc',
  marginRight: 20,
},
textColumn: {
  justifyContent: 'center',  
},
name: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: 5,
},
email: {
  fontSize: 16,
  color: '#f0f0f0',
},


  scrollContainer: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  menuItem: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 14,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  logoutItem: {
    backgroundColor: '#FF3B30',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 20,
  alignItems: 'center',
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
},
modalMessage: {
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 20,
},
modalButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
},
cancelButton: {
  flex: 1,
  paddingVertical: 10,
  marginRight: 10,
  backgroundColor: '#ccc',
  borderRadius: 5,
  alignItems: 'center',
},
cancelText: {
  fontSize: 16,
  color: '#333',
},
logoutConfirmButton: {
  flex: 1,
  paddingVertical: 10,
  backgroundColor: '#FF3B30',
  borderRadius: 5,
  alignItems: 'center',
},
logoutConfirmText: {
  fontSize: 16,
  color: '#fff',
  fontWeight: 'bold',
},

});
