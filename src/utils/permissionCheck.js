import { Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

/**
 * Checks individual permission statuses.
 * Returns an object: { location: bool, camera: bool, notifications: bool }
 */
export async function getPermissionStatuses() {
  // --- ANDROID LOGIC ---
  if (Platform.OS === 'android') {
    try {
        const P = PermissionsAndroid.PERMISSIONS;
        
        // Check them individually
        const locFine = await PermissionsAndroid.check(P.ACCESS_FINE_LOCATION);
        const camera = await PermissionsAndroid.check(P.CAMERA);
        const notif = await PermissionsAndroid.check(P.POST_NOTIFICATIONS); // Android 13+

        return {
            location: locFine,
            camera: camera,
            notifications: notif
        };
    } catch (err) {
      console.warn(err);
      return { location: false, camera: false, notifications: false };
    }
  } 
  
  // --- IOS LOGIC ---
  else {
    // For iOS with your current packages, we can reliably check Location and Notifications.
    // Checking Camera without triggering it requires extra libraries, so we focus on these two.
    const { status: locStatus } = await Location.getForegroundPermissionsAsync();
    const { status: notiStatus } = await Notifications.getPermissionsAsync();

    return {
        location: locStatus === 'granted',
        notifications: notiStatus === 'granted',
        camera: true // On iOS, ImagePicker handles this automatically, assume true or hide switch
    };
  }
}

/**
 * Helper to request specific permission
 */
export async function requestPermission(type) {
  if (Platform.OS === 'android') {
    const P = PermissionsAndroid.PERMISSIONS;
    let permToRequest;

    if (type === 'location') permToRequest = P.ACCESS_FINE_LOCATION;
    if (type === 'camera') permToRequest = P.CAMERA;
    if (type === 'notifications') permToRequest = P.POST_NOTIFICATIONS;

    if (!permToRequest) return false;

    const result = await PermissionsAndroid.request(permToRequest);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } 
  
  // iOS
  else {
    if (type === 'location') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    }
    if (type === 'notifications') {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    }
    return true; 
  }
}