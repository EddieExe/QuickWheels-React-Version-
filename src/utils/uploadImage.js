// src/utils/uploadImage.js

export async function uploadToCloudinary(file, onProgress) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "dealer_cars");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url:       data.secure_url,   // https URL to use as image src
          publicId:  data.public_id,    // store this to delete later
        });
      } else {
        // Try to surface Cloudinary's actual error message instead of just
        // the generic HTTP status text, so future debugging is faster.
        let detail = xhr.statusText;
        try {
          const errBody = JSON.parse(xhr.responseText);
          detail = errBody?.error?.message || detail;
        } catch {
          // response wasn't JSON, fall back to statusText
        }
        reject(new Error(`Upload failed: ${detail}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed: network error")));

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(formData);
  });
}

export async function deleteFromCloudinary(publicId) {
  // Deletion requires server-side signing — skip for now
  // Images stay in Cloudinary but that's fine for free tier
  // You can clean up manually from Cloudinary dashboard
  console.log("Image to clean up:", publicId);
}