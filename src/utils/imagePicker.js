// src/utils/imagePicker.web.js
export async function pickSingleImage() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error("No file selected"));
      const url = URL.createObjectURL(f);
      resolve({ uri: url, fileName: f.name, mime: f.type || "image/jpeg", file: f });
    };
    input.click();
  });
}
