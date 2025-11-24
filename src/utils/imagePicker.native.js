// src/utils/imagePicker.native.js
import { Platform, PermissionsAndroid } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

function getApiLevel() {
  // On Android, Platform.Version is the API level number (e.g. 34)
  return Platform.OS === "android" ? Number(Platform.Version) : 0;
}

async function ensureGalleryPermissionLegacy() {
  // Only needed on Android 12 and below (API <= 32)
  const perm = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const has = await PermissionsAndroid.check(perm);
  if (has) return true;
  const res = await PermissionsAndroid.request(perm);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export async function pickSingleImage({ quality = 0.9, maxWidth = 1280, maxHeight = 1280 } = {}) {
  if (Platform.OS === "android") {
    const api = getApiLevel();
    if (api <= 32) {
      const ok = await ensureGalleryPermissionLegacy();
      if (!ok) throw new Error("Gallery permission denied");
    }
    // api >= 33: Android Photo Picker -> no permission needed
  }

  const res = await launchImageLibrary({
    mediaType: "photo",
    selectionLimit: 1,
    includeBase64: false,
    quality,
    maxWidth,
    maxHeight,
  });

  if (res?.didCancel) throw new Error("User cancelled");
  if (res?.errorCode) throw new Error(res.errorMessage || res.errorCode);

  const asset = res?.assets?.[0];
  if (!asset?.uri) throw new Error("No image selected");

  return {
    uri: asset.uri,
    fileName: asset.fileName || "upload.jpg",
    mime: asset.type || "image/jpeg",
  };
}
