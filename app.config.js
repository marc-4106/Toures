import "dotenv/config";

export default {
  expo: {
    name: "Toures",
    slug: "Toures",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/toures.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/toures.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    plugins: ["expo-notifications"],
    

    extra: {
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      eas: { projectId: "f16a4958-27af-4e66-9f9f-f4d8208cee88" }
    },

    android: {
      package: "com.anonymous.Toures",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "READ_MEDIA_IMAGES",      // Android 13+ photos
        "READ_EXTERNAL_STORAGE",  // Android 12 and below
        "CAMERA",
        "POST_NOTIFICATIONS",                 
      ],
      "notification": {
        "icon": "./assets/notification-icon.png",
        "color": "#0f37f1",
        "channelId": "trip-reminders"
      },
      config: {
        googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
      },
      adaptiveIcon: {
        foregroundImage: "./assets/adaptiveIcon.png",
        backgroundColor: "#ffffff",
      },
      statusBar: {
        backgroundColor: "#ffffff",
        barStyle: "dark-content",
        hidden: false,
        translucent: false,
      },
    },

    ios: {
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Allow Toures to access your photos to set a profile picture.",
        NSCameraUsageDescription: "Allow Toures to use your camera for profile photos."
      }
    },

    web: {
      favicon: "./assets/touresicon.png",
    },
  },
};
