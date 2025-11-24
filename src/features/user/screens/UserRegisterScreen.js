import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../../../services/firebaseConfig';
import { doc, setDoc, serverTimestamp, query, where, getDocs, collection } from 'firebase/firestore';
import headTitle from '../../../../assets/login/WhiteToures.png';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_W = 325;

const BAR_COLORS = ['#f87171', '#fbbf24', '#34d399', '#22c55e'];
const BAR_LABELS = ['Too short', 'Weak', 'Medium', 'Strong'];

const strengthOf = (pw = '') => {
  if (!pw || pw.length < 6) return 0;
  if (pw.length < 8) return 1;
  if (pw.length < 12) return 2;
  return 3;
};

const InputField = ({
  refInput,
  placeholder,
  value,
  onChange,
  error,
  icon,
  secureText,
  trailingIcon,
  onTrailingPress,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
}) => (
  <View style={[styles.inputWrap, error && styles.inputError]}>
    {icon && <Ionicons name={icon} size={18} color="#64748b" style={styles.inputIcon} />}
    <TextInput
      ref={refInput}
      placeholder={placeholder}
      placeholderTextColor="#9aa3af"
      style={styles.input}
      secureTextEntry={secureText}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
    />
    {trailingIcon && (
      <Pressable style={styles.trailingIconBtn} onPress={onTrailingPress} hitSlop={10}>
        <Ionicons name={trailingIcon} size={18} color="#64748b" />
      </Pressable>
    )}
  </View>
);

const UserRegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [invalidUsername, setInvalidUsername] = useState(false);

  const nameRef = useRef(null);
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const pwRef = useRef(null);
  const pw2Ref = useRef(null);

  const pwStrength = useMemo(() => strengthOf(pw), [pw]);

  const pwErrorMsg = useMemo(() => {
    if (!pw) return '';
    const msgs = [];
    if (pw.length < 6) msgs.push('6 characters');
    if (!/[A-Z]/.test(pw)) msgs.push('uppercase letter');
    if (!/[a-z]/.test(pw)) msgs.push('lowercase letter');
    if (!/\d/.test(pw)) msgs.push('number');
    return msgs.length ? 'Password must include ' + msgs.join(', ') : '';
  }, [pw]);

  const borderStyles = {
    borderColor:
      invalidUsername ? '#dc2626' :
      isAvailable ? '#16a34a' :
      '#cbd5e1',
  };

  const validateUsername = useCallback(
    (uname) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(uname),
    []
  );

  const handleUsernameValidation = useCallback(
    async (uname) => {
      const trimmed = uname.trim().toLowerCase();
      if (!trimmed) {
        setInvalidUsername(false);
        setIsAvailable(null);
        return;
      }
      if (!validateUsername(trimmed)) {
        setInvalidUsername(true);
        setIsAvailable(null);
        return;
      }
      setInvalidUsername(false);
      setCheckingUsername(true);
      try {
        const q = query(collection(db, 'users'), where('username', '==', trimmed));
        const snap = await getDocs(q);
        setIsAvailable(snap.empty);
      } catch (e) {
        console.error('Username check failed:', e);
        setIsAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    },
    [validateUsername]
  );

  useEffect(() => {
    const delay = setTimeout(() => {
      if (username) handleUsernameValidation(username);
    }, 700);
    return () => clearTimeout(delay);
  }, [username, handleUsernameValidation]);

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!username.trim()) e.username = 'Username is required.';
    else if (invalidUsername) e.username = 'Invalid username format.';
    else if (isAvailable === false) e.username = 'Username already taken.';
    if (!EMAIL_RE.test(email.trim().toLowerCase())) e.email = 'Enter a valid email address.';

    if (pw.length < 6) e.pw = 'Password must be at least 6 characters.';
    else if (!/[A-Z]/.test(pw)) e.pw = 'Password must include an uppercase letter.';
    else if (!/[a-z]/.test(pw)) e.pw = 'Password must include a lowercase letter.';
    else if (!/\d/.test(pw)) e.pw = 'Password must include a number.';

    if (pw2 !== pw) e.pw2 = 'Passwords do not match.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setErrors({});
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        emailVerified: false,
      });

      await sendEmailVerification(user);

      Alert.alert('Verify Your Email', 'A verification link has been sent. Please verify before logging in.');
      navigation.replace('VerifyEmail');
    } catch (err) {
      console.log('Signup error:', err.code);
      const msgMap = {
        'auth/email-already-in-use': 'Email is already registered',
        'auth/invalid-email': 'Invalid email format',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/network-request-failed': 'Network error, please try again',
      };
      setErrors((e) => ({ ...e, general: msgMap[err.code] || 'Something went wrong. Try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || checkingUsername;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#F0F0FF' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <Image source={headTitle} style={styles.head} resizeMode="contain" />
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Plan and explore Negros with Toures</Text>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            <InputField
              refInput={nameRef}
              placeholder="Full name"
              value={name}
              onChange={(t) => { setName(t); if (errors.name) setErrors((x) => ({ ...x, name: undefined })); }}
              error={errors.name}
              icon="person-outline"
              returnKeyType="next"
              onSubmitEditing={() => usernameRef.current?.focus()}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <View style={[styles.inputWrap, borderStyles]}>
              <Ionicons name="at-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                ref={usernameRef}
                placeholder="Username"
                placeholderTextColor="#9aa3af"
                style={styles.input}
                autoCapitalize="none"
                value={username}
                onChangeText={(text) => { setUsername(text); if (errors.username) setErrors((x) => ({ ...x, username: undefined })); }}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              {checkingUsername && <ActivityIndicator size="small" color="#0f37f1" />}
              {isAvailable === true && !checkingUsername && <Ionicons name="checkmark-circle" size={20} color="#16a34a" />}
              {(invalidUsername || isAvailable === false) && !checkingUsername && <Ionicons name="close-circle" size={20} color="#dc2626" />}
            </View>

            {invalidUsername && <Text style={styles.errorText}>❌ Username must start with a letter (3–20 chars, letters/numbers/._ only)</Text>}
            {isAvailable === false && !invalidUsername && <Text style={styles.errorText}>❌ Username already taken</Text>}
            {isAvailable === true && <Text style={{ color: '#16a34a', fontSize: 12, width: '85%', maxWidth: MAX_W, marginTop: 6 }}>✔ Username available</Text>}

            <InputField
              refInput={emailRef}
              placeholder="Email"
              value={email}
              onChange={(t) => { setEmail(t); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
              error={errors.email}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <InputField
              refInput={pwRef}
              placeholder="Password"
              value={pw}
              onChange={(t) => { setPw(t); if (errors.pw) setErrors((x) => ({ ...x, pw: undefined })); }}
              error={errors.pw}
              icon="lock-closed-outline"
              secureText={!showPw}
              trailingIcon={showPw ? 'eye-off-outline' : 'eye-outline'}
              onTrailingPress={() => setShowPw((s) => !s)}
              returnKeyType="next"
              onSubmitEditing={() => pw2Ref.current?.focus()}
            />
            {errors.pw && <Text style={styles.errorText}>{errors.pw}</Text>}
            {pwErrorMsg && <Text style={styles.errorText}>{pwErrorMsg}</Text>}

            <View style={styles.strengthRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.strengthBar, { backgroundColor: i <= pwStrength - 1 ? BAR_COLORS[pwStrength] : '#e5e7eb' }]} />
              ))}
              <Text style={[styles.strengthLabel, { color: BAR_COLORS[pwStrength] }]}>{BAR_LABELS[pwStrength]}</Text>
            </View>

            <InputField
              refInput={pw2Ref}
              placeholder="Confirm password"
              value={pw2}
              onChange={(t) => { setPw2(t); if (errors.pw2) setErrors((x) => ({ ...x, pw2: undefined })); }}
              error={errors.pw2}
              icon="shield-checkmark-outline"
              secureText={!showPw2}
              trailingIcon={showPw2 ? 'eye-off-outline' : 'eye-outline'}
              onTrailingPress={() => setShowPw2((s) => !s)}
              returnKeyType="go"
              onSubmitEditing={handleSignup}
            />
            {errors.pw2 && <Text style={styles.errorText}>{errors.pw2}</Text>}

            {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

            {/* CREATE ACCOUNT BUTTON */}
            <Pressable
              onPress={handleSignup}
              disabled={disabled}
              style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.8 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> :
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Create account</Text>
                </>
              }
            </Pressable>

            {/* TERMS AND PRIVACY TEXT */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>By signing up, you agree to our </Text>
              <View style={styles.linkRow}>
                <Pressable onPress={() => navigation.navigate('TermsConditionScreen')}>
                  <Text style={styles.linkTextTerms}>Terms of Service</Text>
                </Pressable>
                <Text style={styles.termsText}> and </Text>
                <Pressable onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.linkTextTerms}>Privacy Policy</Text>
                </Pressable>
                <Text style={styles.termsText}>.</Text>
              </View>
            </View>

            <View style={styles.regLinkContainer}>
              <Text style={styles.muted}>Already a member?</Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.linkText, { marginLeft: 6 }]}>Log in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default UserRegisterScreen;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#F0F0FF' },
  head: { width: '100%', maxHeight: 80, marginTop: 40, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 10 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, width: '100%', alignItems: 'center' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    width: '85%',
    maxWidth: MAX_W,
    height: 48,
    marginTop: 12,
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#0f172a', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3 },
    }),
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#0f172a', paddingVertical: 10 },
  inputError: { borderColor: '#fca5a5' },
  errorText: { color: '#b91c1c', fontSize: 12, width: '85%', maxWidth: MAX_W, marginTop: 6 },

  strengthRow: { width: '85%', maxWidth: MAX_W, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  strengthBar: { flex: 1, height: 6, borderRadius: 4, backgroundColor: '#e5e7eb' },
  strengthLabel: { marginLeft: 4, fontSize: 12, fontWeight: '700' },

  trailingIconBtn: { padding: 6, marginLeft: 6 },

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
    maxWidth: MAX_W,
    marginTop: 35,
    shadowColor: '#0f37f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // NEW TERMS STYLES
  termsContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '85%',
    maxWidth: MAX_W,
  },
  termsText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
  },
  linkTextTerms: {
    fontSize: 11,
    color: '#0f37f1',
    fontWeight: '700',
  },

  regLinkContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 25, width: '85%', maxWidth: MAX_W, justifyContent: 'center' },
  linkText: { color: '#1badf9', fontSize: 15, fontWeight: '800' },
});