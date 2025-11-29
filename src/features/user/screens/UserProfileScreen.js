// src/features/user/screens/UserProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import profilePlaceholder from '../../../../assets/profile.png';

export default function UserProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) setUserData(docSnap.data());
      else console.log('No user data found!');
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
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

  const Placeholder = () => (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color="#0f37f1" />
      <Text style={styles.muted}>Loading profile…</Text>
    </View>
  );

  const avatarSrc = userData?.photoURL ? { uri: userData.photoURL } : profilePlaceholder;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#0f37f1', '#1badf9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGrad}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack?.()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>

          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.navigate('Notification')}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <Image source={avatarSrc} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText} numberOfLines={1}>
              {userData?.name || 'Traveler'}
            </Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn} activeOpacity={0.9}>
            <Ionicons name="create-outline" size={18} color="#0f37f1" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <Placeholder />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f37f1']} progressBackgroundColor="#fff" />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <MenuItem icon="settings-outline" label="Account Settings" onPress={() => navigation.navigate('AppSettings')} />
            <MenuItem icon="document-text-outline" label="Terms & Conditions" onPress={() => navigation.navigate('TermsConditionScreen')} />
            <MenuItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
            <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => navigation.navigate('HelpSupport')} />
            <MenuItem icon="log-out-outline" label="Logout" onPress={() => setLogoutModalVisible(true)} isLogout />
          </View>
        </ScrollView>
      )}

      {/* Logout Modal */}
      <Modal transparent visible={logoutModalVisible} animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons name="log-out-outline" size={36} color="#ef4444" />
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setLogoutModalVisible(false)} style={[styles.modalBtn, styles.cancelButton]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmLogout} style={[styles.modalBtn, styles.logoutConfirmButton]}>
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable Menu Item
const MenuItem = ({ label, onPress, isLogout = false, icon = 'chevron-forward' }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.menuItem,
      isLogout && styles.logoutItem,
      pressed && { opacity: 0.85 },
    ]}
  >
    <View style={styles.menuLeft}>
      <View style={[styles.menuIconWrap, isLogout && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
        <Ionicons name={isLogout ? 'log-out-outline' : icon} size={18} color={isLogout ? '#fff' : '#0f37f1'} />
      </View>
      <Text style={[styles.menuText, isLogout && styles.logoutText]}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={isLogout ? '#fff' : '#64748b'} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerGrad: { paddingTop: 8, paddingBottom: 70, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
  profileCard: { marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e2e8f0' },
  nameText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0e7ff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  editBtnText: { color: '#0f37f1', fontWeight: '800' },
  scrollContainer: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 28 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  menuItem: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuIconWrap: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  menuText: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  logoutItem: { backgroundColor: '#ef4444' },
  logoutText: { color: '#fff', fontWeight: '800' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: '#6b7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContainer: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 6 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 10 },
  modalMessage: { fontSize: 14, textAlign: 'center', color: '#334155', marginTop: 6 },
  modalButtons: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#e5e7eb' },
  cancelText: { color: '#111827', fontWeight: '800' },
  logoutConfirmButton: { backgroundColor: '#ef4444' },
  logoutConfirmText: { color: '#fff', fontWeight: '800' },
});
