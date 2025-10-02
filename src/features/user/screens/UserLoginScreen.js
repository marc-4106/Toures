import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../services/firebaseConfig';
import headTitle from '../../../../assets/login/WhiteToures.png';

const UserLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('BottomTab');
    } catch (error) {
      switch (error.code) {
    case 'auth/invalid-email':
      setErrorMessage('Not a valid Email');
      break;
    case 'auth/user-not-found':
      setErrorMessage('User not found');
      break;
    case 'auth/wrong-password':
      setErrorMessage('Invalid email or password');
      break;
    case 'auth/too-many-requests':
      setErrorMessage('Too many attempts. Please try again later');
      break;
    default:
      setErrorMessage('Something went wrong. Please try again');
  }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={headTitle} style={styles.head} resizeMode="contain" />
       <Text style={styles.tagline}>Welcome</Text>

        {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}


      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        textContentType="emailAddress"
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        textContentType="password"
      />

      <View style={styles.optionsRow}>
        <Pressable onPress={() => alert('Forgot Password')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>Login</Text>
        )}
      </Pressable>

      <View style={styles.regLinkContainer}>
        <Text style={styles.forgotText}>Not a member?</Text>
        <Pressable onPress={() => navigation.navigate('Signup')}>
          <Text style={[styles.forgotText, { marginLeft: 5 }]}>Register now</Text>
        </Pressable>
      </View>

      <View style={styles.regLinkContainer}>
        <Text style={styles.forgotText}>or continue with</Text>
      </View>

      <View style={styles.socialContainer}>
        <Pressable
          style={styles.googleButton}
          onPress={() => alert('Google login coming soon')}
        >
          <Image
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/0/09/IOS_Google_icon.png',
            }}
            style={styles.logoIcon}
          />
          <Text style={styles.socialText}>Google</Text>
        </Pressable>

        <Pressable
          style={styles.facebookButton}
          onPress={() => alert('Facebook login coming soon')}
        >
          <Image
            source={{
              uri: 'https://wallpapers.com/images/hd/facebook-logo-icon-mcvl4u1utgmpp34f.png',
            }}
            style={styles.logoIcon}
          />
          <Text style={styles.facebookButtonText}>Facebook</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default UserLoginScreen;

const styles = StyleSheet.create({

  errorText: {
  color: 'red',
  fontSize: 14,
  marginBottom: 10,
  textAlign: 'center',
  maxWidth: 600,
},

  head: {
    width: '100%',
    maxHeight: 150,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 15,
    borderRadius: 5,
    maxWidth: 600,
    width: '80%',
    backgroundColor: '#fff',
  },
  button: {
  backgroundColor: "#0f37f1", // main button color
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 25,
  width: 600,
  maxWidth: "60%",
  shadowColor: "#0f37f1",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 6,
  borderBottomWidth: 2,
  borderRightWidth: 2,
  borderBottomColor: "#0d30c7", 
  borderRightColor: "#0d30c7",
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderTopColor: "#3c5efb", 
  borderLeftColor: "#3c5efb",
  marginBottom: 10,
},
  buttonPressed: {
    opacity: 0.6,
  },
  text: {
      fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    textAlign:'center',
  },
  optionsRow: {
    flexDirection: 'row',
    width: '80%',
    maxWidth: 600,
    marginBottom: 30,
    justifyContent: 'flex-end',
  },
  forgotText: {
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
    width: '60%',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    justifyContent: 'center',
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '60%',
    justifyContent: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  facebookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  tagline: {
    fontSize: 40,
    fontWeight: "400",
    color: "#0f37f1",
    marginTop: 6,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
