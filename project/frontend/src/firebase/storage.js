import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload an image (food item or profile photo) and return its public URL
 * @param {File} file 
 * @param {string} path - Folder name e.g., 'foods' or 'profiles'
 */
export const uploadImage = async (file, path = 'foods') => {
  if (!file) return null;

  // Create a 3.5 second timeout promise to prevent hanging uploads on slow connections
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Upload timeout")), 3500);
  });

  const uploadPromise = (async () => {
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${filename}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  })();

  try {
    // Race the upload against the timeout
    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return downloadUrl;
  } catch (error) {
    console.warn("Firebase Storage upload failed or timed out, falling back to thumbnail:", error);
    
    // Graceful fallback: Compress image to a small thumbnail (max 120px)
    // so it doesn't exceed Firestore's 1MB document size limit if cloud upload fails.
    try {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 120;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Tiny compressed DataURL (~5KB)
        };
        img.onerror = () => {
          resolve('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120');
        };
        const reader = new FileReader();
        reader.onloadend = () => {
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    } catch (fallbackErr) {
      console.warn("Fallback compression failed:", fallbackErr);
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120';
    }
  }
};
