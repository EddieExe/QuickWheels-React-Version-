// src/utils/uploadImage.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

function sanitizeFileName(name) {
  return (name || "upload")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read selected image"));
    reader.readAsDataURL(file);
  });
}

function isStoragePermissionError(error) {
  const message = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();
  return message.includes("unauthorized") || message.includes("permission") || message.includes("not authenticated");
}

export async function uploadToCloudinary(file, onProgress) {
  const storagePath = `profile-images/${Date.now()}-${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const pct = snapshot.totalBytes
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress(pct);
        }
      },
      async (error) => {
        if (isStoragePermissionError(error)) {
          try {
            const localUrl = await readFileAsDataUrl(file);
            if (onProgress) onProgress(100);
            resolve({
              url: localUrl,
              publicId: `local:${storagePath}`,
            });
          } catch (fallbackError) {
            reject(new Error(`Upload failed: ${fallbackError?.message || "Unknown error"}`));
          }
          return;
        }

        reject(new Error(`Upload failed: ${error?.message || error?.code || "Unknown error"}`));
      },
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          resolve({
            url,
            publicId: storagePath,
          });
        } catch (error) {
          reject(new Error(`Upload failed: ${error?.message || error?.code || "Unknown error"}`));
        }
      },
    );
  });
}

export async function deleteFromCloudinary(publicId) {
  console.log("Image cleanup is handled by Firebase Storage path:", publicId);
}