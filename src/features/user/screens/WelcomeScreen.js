import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  ImageBackground, 
  SafeAreaView, 
  Dimensions
} from "react-native";

import welcomebg from '../../../../assets/welcomebg1.png';

const { width } = Dimensions.get("window");
const scale = width / 375; // 375 = base width for scaling

const WelcomeScreen = ({ navigation }) => {
  return (
    <ImageBackground 
      source={welcomebg} 
      style={styles.background} 
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        
        {/* Title + Tagline */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>TOURES</Text>
          <Text style={styles.tagline}>Explore Negros with us</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.button} 
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
          <Pressable 
            style={styles.button} 
            onPress={() => navigation.navigate("Signup")}
          >
            <Text style={styles.buttonText}>Signup</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  container: {
    flex: 1,
    justifyContent: "space-between", 
    alignItems: "center",
    paddingVertical: 40,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  title: {
    marginTop: 20,
    fontSize: 60 * scale,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 3,
    textAlign: "center",
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 24 * scale,
    fontWeight: "600",
    color: "#fff",
    marginTop: 6, // 👈 closer to title
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
button: {
  backgroundColor: "#0f37f1", // main button color
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 25,
  width: "40%",
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
},

  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    textAlign:'center',
  },
});
