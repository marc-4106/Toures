import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Notifications() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Here are your notifications.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	text: {
		fontSize: 18,
		color: '#334155',
	},
});
