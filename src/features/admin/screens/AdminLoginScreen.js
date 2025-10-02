import React, { useEffect, useState } from 'react';
import {
	Image,
	View,
	Text,
	TextInput,
	Pressable,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

const AdminLoginScreen = ({ navigation }) => {
	// State variables for input focus
	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);

	// State variables for email and password
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		setLoading(true);
		try {
			const userCredential = await signInWithEmailAndPassword(
				auth,
				email,
				password
			);
			const user = userCredential.user;

			const docRef = doc(db, 'users', user.uid);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				const data = docSnap.data();

				if (data.role === 'admin') {
					alert('Welcome Admin!');
					navigation.replace('AdminDrawer');
				}

				else if (data.role === 'superadmin') {
					alert('WELCOME SUPERADMIN!');
					navigation.navigate('SuperadminDash');
				} else {
					alert('Access Denied: You are not authorized as a superadmin.');
				}
			} else {
				alert('User data not found.');
			}
		} catch (error) {
			if (
				error.code === 'auth/invalid-credential' ||
				error.code === 'auth/wrong-password'
			) {
				alert('Incorrect email or password.');
			} else if (error.code === 'auth/invalid-email') {
				alert('Invalid email format.');
			} else {
				alert('Login failed: ' + error.message);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<Image
					source={require('../../../../assets/login/WhiteToures.png')}
					style={styles.logo}
				/>

				<Text style={styles.logo_text}>ADMIN LOGIN</Text>
				<View
					style={[
						styles.inputWrapper,
						emailFocused && styles.inputWrapperFocused,
					]}>
					<MaterialIcons
						name={email ? 'email' : 'mail-outline'}
						size={20}
						color={emailFocused ? '#0F37F1' : email ? '#0F37F1' : '#90a4ae'}
						style={styles.inputIcon}
					/>
					<TextInput
						placeholder='Email Address'
						placeholderTextColor='#90a4ae'
						style={styles.input}
						autoCapitalize='none'
						value={email}
						onChangeText={setEmail}
						onFocus={() => setEmailFocused(true)}
						onBlur={() => setEmailFocused(false)}
					/>
				</View>

				<View
					style={[
						styles.inputWrapper,
						passwordFocused && styles.inputWrapperFocused,
					]}>
					<MaterialIcons
						name={password ? 'lock' : 'lock-outline'}
						size={20}
						color={
							passwordFocused ? '#0F37F1' : password ? '#0F37F1' : '#90a4ae'
						}
						style={styles.inputIcon}
					/>
					<TextInput
						placeholder='Password'
						placeholderTextColor='#90a4ae'
						secureTextEntry
						style={styles.input}
						value={password}
						onChangeText={setPassword}
						onFocus={() => setPasswordFocused(true)}
						onBlur={() => setPasswordFocused(false)}
					/>
				</View>
				<View style={styles.footerRow}>
					<Pressable onPress={() => alert('Forgot Password')}>
						<Text style={styles.footerText}>Forgot Password ?</Text>
					</Pressable>
				</View>

				{/* Button or Loading Indicator */}
				<Pressable
					style={({ pressed }) => [
						styles.button,
						pressed && styles.buttonPressed,
						loading && { opacity: 8 },
					]}
					onPress={handleLogin}
					disabled={loading}>
					{loading ? (
						<ActivityIndicator color='#ffffff' />
					) : (
						<Text style={styles.text}>Log In</Text>
					)}
				</Pressable>
			</View>
		</View>
	);
};

export default AdminLoginScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#0F37F1', // Deep blue background
	},
	title: {
		fontSize: 24,
		fontWeight: '600',
		marginBottom: 20,
		textAlign: 'center',
		color: '#FBFBFB', // Light text for contrast
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E5E5E5', // Very light input background
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#E5E5E5', // Light border color
		transition: 'border-color 0.3s ease',
	},
	inputWrapperFocused: {
		backgroundColor: '#FFFFFF', // White on focus for clarity
		borderColor: '#0F37F1',
	},
	inputIcon: {
		marginRight: 10,
		//color: '#A6A6A6', // Accent color for icons
	},
	input: {
		flex: 1,
		color: '#011576', // Deep blue text
		fontSize: 16,
		borderWidth: 0,
		outlineStyle: 'none',
		outlineWidth: 0,
		paddingVertical: 10,
		backgroundColor: 'transparent',
	},

	checkbox: {
		width: 20,
		height: 20,
		borderWidth: 2,
		borderColor: '#0F37F1',
		marginRight: 10,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FBFBFB',
	},
	checkboxChecked: {
		backgroundColor: '#0F37F1',
		borderColor: '#0F37F1',
	},
	checkmark: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: 'bold',
	},
	rememberText: {
		fontSize: 14,
		color: '#FBFBFB',
	},
	button: {
		backgroundColor: '#0F37F1', // Accent color for button
		paddingVertical: 14,
		borderRadius: 6,
		alignItems: 'center',
		width: 400,
		maxWidth: '100%',
		marginBottom: 20,
	},
	buttonPressed: {
		opacity: 0.85,
	},
	text: {
		color: '#FFFFFF', // Button text color
		fontSize: 16,
		fontWeight: '700',
	},
	optionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '80%',
		maxWidth: 400,
		marginBottom: 20,
	},
	rememberRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	forgotText: {
		color: '#0F37F1', // Accent color for links
		fontSize: 12,
		fontWeight: '500',
	},
	card: {
		backgroundColor: '#FFFFFF', // Card color
		padding: 30,
		borderRadius: 10,
		width: '85%',
		maxWidth: 400,
		shadowColor: '#011576',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	logo: {
		width: 100,
		height: 100,
		resizeMode: 'contain',
		alignSelf: 'center',
		marginBottom: 20,
	},
	logo_text: {
		color: '#0F37F1', // Accent color for logo text
		fontSize: 26,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 10,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 5,
		marginBottom: 5,
		paddingBottom: 15,
	},
	footerText: {
		color: '#0F37F1', // Accent color for footer link
		fontSize: 14,
		fontWeight: '500',
	},
});
