// ForgotPasswordModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../../services/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordModal = ({ visible, onClose, prefillIdentifier }) => {
  const [identifier, setIdentifier] = useState(prefillIdentifier || '');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!identifier.trim()) {
      Alert.alert('Forgot Password', 'Please enter your email or username.');
      return;
    }

    let emailToUse = identifier.trim().toLowerCase();
    setLoading(true);

    try {
      if (!EMAIL_RE.test(emailToUse)) {
        const q = query(collection(db, 'users'), where('username', '==', identifier.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          Alert.alert('Forgot Password', 'Username not found.');
          setLoading(false);
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }

      await sendPasswordResetEmail(auth, emailToUse);
      Alert.alert(
        'Password Reset',
        `A password reset email has been sent to ${emailToUse}. Check your inbox.`
      );
      onClose();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.message}>
              Enter your email or username to receive a password reset link.
            </Text>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                placeholder="Email or Username"
                placeholderTextColor="#9aa3af"
                style={styles.input}
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
                autoFocus
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Reset Password</Text>
                </>
              )}
            </Pressable>

            <Pressable style={{ marginTop: 12 }} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ForgotPasswordModal;

const MODAL_W = '85%';
const INPUT_BTN_W = '100%';


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
  width: MODAL_W, // modal width
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 25,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  elevation: 6,
},

  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 15 },
  inputWrap: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#cbd5e1',
  borderRadius: 12,
  backgroundColor: '#f9f9f9',
  width: INPUT_BTN_W, // full width of modal card
  height: 48,
  marginBottom: 15,
  paddingHorizontal: 12, // icon spacing
  ...Platform.select({
    android: { elevation: 1 },
    ios: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
    },
  }),
},
input: {
  flex: 1, // take remaining space in inputWrap
  color: '#0f172a',
  paddingVertical: 12,
  paddingHorizontal: 0, // remove extra horizontal padding
},
button: {
  backgroundColor: '#0f37f1',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 12,
  borderRadius: 12,
  width: INPUT_BTN_W, // full width same as inputWrap
},
  icon: { marginRight: 8 },
 
  buttonPressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  cancelText: { color: '#1badf9', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
