import React, { useState } from 'react';
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
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../services/firebaseConfig'; 
import { doc, setDoc } from 'firebase/firestore';
import headTitle from '../../../../assets/login/WhiteToures.png';

const UserRegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email: user.email,
        role: 'user',
        isActive: true, 
        createdAt: new Date(),
      });

      Alert.alert('Signup successful!');
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Signup failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header Image */}
      <Image source={headTitle} style={styles.head} resizeMode="contain" />

      {/* Scrollable Form Below Header */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Signup</Text>
            <Text style={styles.subtitle}>
              Create an account and explore Negros with us
            </Text>

            <TextInput
              placeholder="Name"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              placeholder="Confirm Password"
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSignup}
            >
              <Text style={styles.text}>Signup</Text>
            </Pressable>

            <View style={styles.regLinkContainer}>
              <Text style={styles.textlink}>Already a member?</Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.textlink}> Login</Text>
              </Pressable>
            </View>

            <View style={styles.regLinkContainer}>
              <Text style={styles.textlink}>or continue with</Text>
            </View>

            <View style={styles.socialContainer}>
              <Pressable style={styles.googleButton} onPress={() => alert('Google')}>
                <Image
                  source={{
                    uri: 'https://upload.wikimedia.org/wikipedia/commons/0/09/IOS_Google_icon.png',
                  }}
                  style={styles.logoIcon}
                />
                <Text style={styles.socialText}>Sign up with Google</Text>
              </Pressable>

              <Pressable
                style={styles.facebookButton}
                onPress={() => alert('Facebook')}
              >
                <Image
                  source={{
                    uri: 'https://wallpapers.com/images/hd/facebook-logo-icon-mcvl4u1utgmpp34f.png',
                  }}
                  style={styles.logoIcon}
                />
                <Text style={[styles.socialText, { color: '#fff' }]}>
                  Sign up with Facebook
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default UserRegisterScreen;

const styles = StyleSheet.create({
  head: {
    width: '100%',
    maxHeight: 150,
    marginBottom: 20,
    marginTop: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F0FF',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 60,
  },
  formContainer: {
    width: '80%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 15,
    borderRadius: 5,
    maxWidth: 600,
    width: '100%',
  },
  button: {
    backgroundColor: '#0f37f1',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    width: 400,
    maxWidth: '80%',
    marginVertical: 35,
    alignSelf: 'center',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  textlink: {
    color: '#1badf9',
    fontSize: 16,
  },
  regLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    maxWidth: 600,
    marginBottom: 30,
  },
  socialContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '80%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    justifyContent: 'center',
    maxWidth: 400,
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '80%',
    justifyContent: 'center',
    maxWidth: 400,
  },
  logoIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  socialText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
});
