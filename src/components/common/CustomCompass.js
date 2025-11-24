import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Assuming you use Expo/Vector Icons

const CustomCompass = ({ style }) => {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    // Set the update interval (e.g., 100 milliseconds)
    Magnetometer.setUpdateInterval(100);

    // Subscribe to magnetometer data
    const subscription = Magnetometer.addListener(data => {
      // Calculate the heading in degrees (0 = North, 90 = East, etc.)
      const angle = Math.atan2(data.y, data.x);
      let degree = angle * (180 / Math.PI) - 90;
      if (degree < 0) {
        degree = 360 + degree;
      }
      // Store the result
      setHeading(Math.round(degree));
    });

    // Clean up subscription on component unmount
    return () => {
      subscription.remove();
    };
  }, []);

  // Use a string to apply the rotation transformation
  const rotationStyle = {
    transform: [{ rotate: `${-heading}deg` }],
  };

  return (
    <View style={[styles.compassContainer, style]}>
      {/* The arrow icon points to the top (North) */}
      <MaterialCommunityIcons 
        name="compass" 
        size={40} 
        color="#333" 
        style={rotationStyle}
      />
      {/* Optional: Show the degree value */}
      <Text style={styles.headingText}>{heading}°</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  compassContainer: {
    width: 50,
    height: 65,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  headingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
});

export default CustomCompass;