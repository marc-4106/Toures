// File: src/features/user/screens/UserExploreScreen.js (Used for web bundling)

import React from "react";
import { View, Text, StyleSheet } from "react-native";

// CRITICAL: No import of react-native-maps here.

const UserExploreScreen = () => {

  
   // This content renders for the Web platform (Admin access)
   return (
     <View style={styles.webContainer}>
       <Text style={styles.webTitle}>Explore Screen</Text>
       <Text style={styles.webSubtitle}>
         This feature is optimized for the mobile application.
       </Text>
     </View>
   );
 };
 
 const styles = StyleSheet.create({
   webContainer: {
     // Must have flex: 1 to fill the screen
     flex: 1, 
     justifyContent: "center", 
     alignItems: "center", 
     // Ensure a contrasting background color
     backgroundColor: "#f5f5f5", 
     paddingHorizontal: 20,
   },
   webTitle: {
     fontSize: 26,
     fontWeight: "bold",
     color: "#333",
     marginBottom: 10,
   },
   webSubtitle: {
     fontSize: 16,
     color: "#555",
     textAlign: "center",
   },
 });
 
 export default UserExploreScreen;
