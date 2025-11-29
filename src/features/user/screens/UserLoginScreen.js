import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Alert,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from '../../../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import headTitle from '../../../../assets/login/WhiteToures.png';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserLoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const pwRef = useRef(null);

const handleLogin = async () => {
  if (!identifier.trim() || !password.trim()) {
    setErrorMessage("Please enter both email/username and password.");
    return;
  }

  setLoading(true);
  setErrorMessage("");

  try {
    let emailToUse = identifier.trim().toLowerCase();

    // 🔍 If not an email → treat as username
    if (!EMAIL_RE.test(emailToUse)) {
      const q = query(collection(db, "users"), where("username", "==", identifier.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setErrorMessage("Username not found.");
        setLoading(false);
        return;
      }
      emailToUse = snap.docs[0].data().email;
    }

    // 🔐 Sign in
    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
    const user = userCredential.user;

    // 🔄 Refresh user status
    await user.reload();

    // ⭐ SAVE emailVerified=true SAFELY
    if (user.emailVerified) {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        // Use merge setDoc (SAFE AND NEVER THROWS)
        await setDoc(userRef, { emailVerified: true }, { merge: true });
      } else {
        console.log("⚠ User Firestore document does NOT exist yet, skipping update.");
      }
    }

    // ❌ STILL not verified → show modal
    if (!user.emailVerified) {
      setShowVerifyModal(true);
      setLoading(false);
      return;
    }

    // 🔥 Now check Firestore record
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      setErrorMessage("User record not found.");
      setLoading(false);
      return;
    }

    const data = docSnap.data();

    if (data.isActive === false) {
      setErrorMessage("This account is disabled.");
      setLoading(false);
      return;
    }

    // 🎉 LOGIN SUCCESS
    navigation.replace("BottomTab");

  } catch (error) {
    console.log("LOGIN ERROR =>", error);

    switch (error.code) {
      case "auth/invalid-email":
        setErrorMessage("Not a valid email.");
        break;
      case "auth/user-not-found":
      case "auth/wrong-password":
        setErrorMessage("Invalid email/username or password.");
        break;
      case "auth/too-many-requests":
        setErrorMessage("Too many attempts. Try again later.");
        break;
      default:
        // We catch ANY error from Firestore update here
        setErrorMessage("Something went wrong. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};


  const handleForgotPassword = async () => {
    setShowForgotModal(true);
  };

  const sendForgotEmail = async () => {
    if (!identifier.trim()) {
      Alert.alert('Forgot Password', 'Please enter your email or username first.');
      return;
    }

    let emailToUse = identifier.trim().toLowerCase();
    setForgotLoading(true);

    try {
      if (!EMAIL_RE.test(emailToUse)) {
        const q = query(collection(db, 'users'), where('username', '==', identifier.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          Alert.alert('Forgot Password', 'Username not found.');
          setForgotLoading(false);
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }

      await sendPasswordResetEmail(auth, emailToUse);
      Alert.alert('Password Reset', `A password reset email has been sent to ${emailToUse}.`);
      setShowForgotModal(false);
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F0F0FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <Image source={headTitle} style={styles.head} resizeMode="contain" />
          <Text style={styles.tagline}>Welcome</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#b91c1c" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={[styles.inputWrap, errorMessage && !identifier ? styles.inputError : null]}>
            <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              placeholder="Email or Username"
              placeholderTextColor="#9aa3af"
              style={styles.input}
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
              autoFocus
            />
          </View>

          <View style={[styles.inputWrap, errorMessage && !password ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              ref={pwRef}
              placeholder="Password"
              placeholderTextColor="#9aa3af"
              style={styles.input}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={10} style={styles.trailingIconBtn}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
            </Pressable>
          </View>

          <View style={styles.optionsRow}>
            <Pressable onPress={handleForgotPassword}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>Login</Text>
              </>
            )}
          </Pressable>

          <View style={styles.regRow}>
            <Text style={styles.muted}>Not a member?</Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.linkText, { marginLeft: 6 }]}>Register now</Text>
            </Pressable>
          </View>

          {/* 🔔 Modal for unverified email */}
          <Modal
            visible={showVerifyModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowVerifyModal(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Email Not Verified</Text>
                <Text style={styles.modalMessage}>
                  Your email is not verified. You can resend the verification email or verify now.
                </Text>

                <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                  {/* Resend Email */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { flex: 1, marginRight: 5 },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={async () => {
                      setModalLoading(true);
                      try {
                        await sendEmailVerification(auth.currentUser);
                        alert('Verification email sent! Check your inbox.');
                        setShowVerifyModal(false);
                      } catch (err) {
                        console.log(err);
                        alert('Failed to send verification email. Try again.');
                      } finally {
                        setModalLoading(false);
                      }
                    }}
                    disabled={modalLoading}
                  >
                    {modalLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="mail-outline" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Resend Email</Text>
                      </>
                    )}
                  </Pressable>

                  {/* Verify Now */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { flex: 1, marginLeft: 5, backgroundColor: '#64748b' },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => {
                      setShowVerifyModal(false);
                      navigation.navigate('VerifyEmail');
                    }}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Verify Now</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* 🔔 Forgot Password Modal */}
          <Modal
            visible={showForgotModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowForgotModal(false)}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalMessage}>
                    Enter your email or username to receive a password reset link.
                  </Text>

                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
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
                    onPress={sendForgotEmail}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="refresh-outline" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Reset Password</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable style={{ marginTop: 12 }} onPress={() => setShowForgotModal(false)}>
                    <Text style={styles.linkText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default UserLoginScreen;

// Styles (keep your previous styles plus modal styles)
const MAX_W = 600;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0FF',
  },

  head: { width: '100%', maxHeight: 120, marginBottom: 8 },
  tagline: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f37f1',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 10,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: MAX_W,
    width: '85%',
  },
  errorText: { color: '#b91c1c', fontSize: 13, flexShrink: 1 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    width: '85%',
    maxWidth: MAX_W,
    height: 48,
    marginTop: 12,
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
  inputIcon: { marginRight: 8 },
  trailingIconBtn: { padding: 6, marginLeft: 6 },

  input: {
    flex: 1,
    color: '#0f172a',
    paddingVertical: 10,
  },
  inputError: {
    borderColor: '#fca5a5',
  },

  optionsRow: {
    width: '85%',
    maxWidth: MAX_W,
    marginTop: 10,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  linkText: { color: '#1badf9', fontSize: 15, fontWeight: '700' },
  muted: { color: '#64748b', fontSize: 15 },

  button: {
    backgroundColor: '#0f37f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '85%',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#0f37f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  regRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    width: '85%',
    maxWidth: MAX_W,
    justifyContent: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
});
