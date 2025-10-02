import "dotenv/config";

export default {
  expo: {
    name: "Toures",
    slug: "Toures",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY, // Key for JS access
      eas: {
        "projectId": "f16a4958-27af-4e66-9f9f-f4d8208cee88"
      }
    },
    android: {
      package: "com.anonymous.Toures",
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY, // Key for native Android manifest
        },
      },
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    ios: {
      supportsTablet: true,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
  },
};
