// src/utils/pickerShim.js
import { Platform } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

export async function pickSingleImage({ quality = 0.9 } = {}) {
  if (Platform.OS === "web") {
    // Use a hidden <input type="file"> on web to get a real File
    const file = await new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = false;
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return reject(new Error("No image selected"));
        resolve(f);
      };
      input.oncancel = () => reject(new Error("User cancelled picker"));
      input.click();
    });

    const objectUrl = URL.createObjectURL(file);
    return {
      uri: objectUrl,            // blob URL for preview if you need it
      file,                      // real File for upload
      fileName: file.name || "upload.jpg",
      mime: file.type || "image/jpeg",
    };
  }

  // Native path: react-native-image-picker
  return new Promise((resolve, reject) => {
    launchImageLibrary(
      {
        mediaType: "photo",
        selectionLimit: 1,
        includeBase64: false,
        quality, // 0..1 JPEG quality
      },
      (res) => {
        if (res?.didCancel) return reject(new Error("User cancelled picker"));
        if (res?.errorCode) return reject(new Error(res.errorMessage || res.errorCode));
        const asset = res?.assets?.[0];
        if (!asset?.uri) return reject(new Error("No image selected"));
        resolve({
          uri: asset.uri,
          file: null, // no File on native
          fileName: asset.fileName || "upload.jpg",
          mime: asset.type || "image/jpeg",
        });
      }
    );
  });
}
