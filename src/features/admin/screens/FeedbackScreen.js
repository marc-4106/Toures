import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FeedbackScreen() {
   return (
      <View style={styles.container}>
        <Text style={styles.title}>Under Development</Text>
        <Text style={styles.subtitle}>
          This feature is currently under development. Please check back later!
        </Text>
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f5f5f5",
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: "#333",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: "#555",
      textAlign: "center",
    },
  });
  
  