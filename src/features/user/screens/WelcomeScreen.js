import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import welcomebg from "../../../../assets/welcomebg1.png";

const { width } = Dimensions.get("window");
const scale = width / 375; // base iPhone X width

const WelcomeScreen = ({ navigation }) => {
  return (
    <ImageBackground source={welcomebg} style={styles.background} resizeMode="cover">
      {/* Soft gradient for better contrast */}
      <LinearGradient
        colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.container}>
        {/* Top spacer for breathing room */}
        <View style={{ height: 8 }} />

        {/* Title + Tagline */}
        <View style={styles.textWrap}>
          <Text style={styles.title}>TOURES</Text>
          <Text style={styles.tagline}>Explore Negros with us</Text>
        </View>

        {/* CTA Panel */}
        <View style={styles.ctaWrap}>
          {/* Login (Primary) */}
          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { transform: [{ translateY: 1 }], opacity: 0.95 },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            accessibilityRole="button"
            accessibilityLabel="Login"
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>Login</Text>
          </Pressable>

          {/* Signup (Outline / Ghost) */}
          <Pressable
            onPress={() => navigation.navigate("Signup")}
            style={({ pressed }) => [
              styles.outlineBtn,
              pressed && { transform: [{ translateY: 1 }], opacity: 0.95 },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            accessibilityRole="button"
            accessibilityLabel="Signup"
          >
            <Ionicons name="person-add-outline" size={18} color="#ffffff" />
            <Text style={styles.outlineText}>Signup</Text>
          </Pressable>
        </View>

        {/* Bottom safe padding */}
        <View style={{ height: 8 }} />
      </SafeAreaView>
    </ImageBackground>
  );
};

export default WelcomeScreen;

const MAX_BTN_W = 360;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  // Title
  textWrap: {
    alignItems: "center",
    marginTop: 40,
  },
  title: {
    marginTop: 10,
    fontSize: Math.round(56 * scale),
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 4,
    textAlign: "center",
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: Math.round(18 * scale) + 6,
    fontWeight: "700",
    color: "#e5ecff",
    marginTop: 8,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // CTA area
  ctaWrap: {
    width: "100%",
    alignSelf: "center",
    gap: 12,
    // Responsive: stacked on narrow, side-by-side on wider screens
    flexDirection: width > 430 ? "row" : "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  primaryBtn: {
    backgroundColor: "#0f37f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "90%",
    maxWidth: MAX_BTN_W,
    ...Platform.select({
      android: { elevation: 6 },
      ios: {
        shadowColor: "#0f37f1",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
      },
    }),
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: "#0d30c7",
    borderRightColor: "#0d30c7",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: "#3c5efb",
    borderLeftColor: "#3c5efb",
  },
  primaryText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },

  outlineBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.75)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "90%",
    maxWidth: MAX_BTN_W,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
      },
    }),
  },
  outlineText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
});
