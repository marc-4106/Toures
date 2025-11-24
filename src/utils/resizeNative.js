// src/utils/resizeNative.js
import ImageResizer from "react-native-image-resizer";

export async function resizeImageNative(uri, { width = 1280, quality = 0.6, format = "JPEG" } = {}) {
  const out = await ImageResizer.createResizedImage(
    uri,
    width,
    width,                         // library keeps aspect ratio internally
    format.toUpperCase() === "PNG" ? "PNG" : "JPEG",
    Math.round(quality * 100),
    0
  );
  return out?.uri || out?.path || uri;
}
