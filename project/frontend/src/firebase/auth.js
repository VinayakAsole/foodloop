import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

/**
 * Register a new user in Firebase Auth & Firestore
 */
export const signUpUser = async (
  email, 
  password, 
  name, 
  mobile, 
  role, 
  latitude, 
  longitude, 
  kitchenName = '', 
  kitchenAddress = '', 
  foodCategories = [], 
  profilePhoto = null,
  username = ''
) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  await updateProfile(user, { displayName: name });
  
  const userData = {
    uid: user.uid,
    name,
    username: username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, ''),
    email,
    mobile,
    role,
    status: (role === 'admin' || role === 'buyer') ? 'verified' : 'pending',
    latitude: parseFloat(latitude) || 0,
    longitude: parseFloat(longitude) || 0,
    profilePhoto,
    kitchenName: role === 'seller' ? kitchenName : null,
    kitchenAddress: role === 'seller' ? kitchenAddress : null,
    foodCategories: role === 'seller' ? foodCategories : null,
    trustScore: role === 'seller' ? 100 : null,
    createdAt: new Date().toISOString()
  };

  // Save to Firestore (centralized)
  await setDoc(doc(db, 'users', user.uid), userData);

  // Systematic role-based storage
  if (role === 'seller') {
    const sellerData = {
      uid: user.uid,
      name,
      username: userData.username,
      email,
      mobile,
      role,
      status: userData.status,
      latitude: userData.latitude,
      longitude: userData.longitude,
      profilePhoto,
      kitchenName,
      kitchenAddress,
      foodCategories,
      trustScore: 100,
      createdAt: userData.createdAt
    };
    await setDoc(doc(db, 'sellers', user.uid), sellerData);
  } else if (role === 'buyer') {
    const buyerData = {
      uid: user.uid,
      name,
      username: userData.username,
      email,
      mobile,
      role,
      status: userData.status,
      latitude: userData.latitude,
      longitude: userData.longitude,
      profilePhoto,
      createdAt: userData.createdAt
    };
    await setDoc(doc(db, 'buyers', user.uid), buyerData);
  } else if (role === 'admin') {
    const adminData = {
      uid: user.uid,
      name,
      username: userData.username,
      email,
      mobile,
      role,
      status: userData.status,
      createdAt: userData.createdAt
    };
    await setDoc(doc(db, 'admins', user.uid), adminData);
  }

  return userData;
};

/**
 * Sign in user using Firebase Auth & Firestore profile loading
 */
export const signInUser = async (email, password) => {
  let emailClean = (email || '').trim().toLowerCase();
  
  // Custom support: if user enters just 'vinayak', convert to email format
  if (emailClean === 'vinayak') {
    emailClean = 'vinayak@foodloop.com';
  }

  // Check if it's the requested admin credentials.
  // If so, we want to make sure it works seamlessly in a real world workflow.
  if (emailClean === 'vinayak@foodloop.com' && password === 'Vinayak@123') {
    try {
      // 1. Try signing in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, emailClean, password);
      const userSnapshot = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userSnapshot.exists()) {
        return { uid: userCredential.user.uid, ...userSnapshot.data() };
      } else {
        // Create user document if it got deleted in Firestore
        const adminData = {
          uid: userCredential.user.uid,
          name: 'Vinayak (Admin)',
          email: 'vinayak@foodloop.com',
          mobile: '+91 99999 99999',
          role: 'admin',
          status: 'verified',
          latitude: 19.0760,
          longitude: 72.8777,
          profilePhoto: null,
          trustScore: 100,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), adminData);
        await setDoc(doc(db, 'admins', userCredential.user.uid), {
          uid: adminData.uid,
          name: adminData.name,
          email: adminData.email,
          mobile: adminData.mobile,
          role: adminData.role,
          status: adminData.status,
          createdAt: adminData.createdAt
        });
        return adminData;
      }
    } catch (firebaseErr) {
      // 2. If user doesn't exist in Firebase Auth yet, auto-create the admin user
      if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/invalid-credential' || firebaseErr.code === 'auth/invalid-email') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailClean, password);
          const user = userCredential.user;
          await updateProfile(user, { displayName: 'Vinayak' });
          
          const adminData = {
            uid: user.uid,
            name: 'Vinayak (Admin)',
            email: 'vinayak@foodloop.com',
            mobile: '+91 99999 99999',
            role: 'admin',
            status: 'verified',
            latitude: 19.0760,
            longitude: 72.8777,
            profilePhoto: null,
            trustScore: 100,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), adminData);
          await setDoc(doc(db, 'admins', user.uid), {
            uid: adminData.uid,
            name: adminData.name,
            email: adminData.email,
            mobile: adminData.mobile,
            role: adminData.role,
            status: adminData.status,
            createdAt: adminData.createdAt
          });
          return adminData;
        } catch (createErr) {
          console.error("Auto-creating admin failed:", createErr);
          throw createErr;
        }
      } else {
        throw firebaseErr;
      }
    }
  }

  // Real Firebase login for other users
  const userCredential = await signInWithEmailAndPassword(auth, emailClean, password);
  const userSnapshot = await getDoc(doc(db, 'users', userCredential.user.uid));
  if (userSnapshot.exists()) {
    return { uid: userCredential.user.uid, ...userSnapshot.data() };
  }
  throw new Error("User profile not found in database.");
};

/**
 * Sign out user from Firebase Auth
 */
export const signOutUser = async () => {
  await signOut(auth);
};

/**
 * Get user profile data from Firestore
 */
export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? { uid, ...userDoc.data() } : null;
};

/**
 * Reset password via Firebase Auth
 */
export const resetUserPassword = async (email) => {
  const emailClean = (email || '').trim().toLowerCase();
  await sendPasswordResetEmail(auth, emailClean);
};

/**
 * Setup Recaptcha for Phone Auth
 */
export const setupRecaptcha = (containerId) => {
  return new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': () => {
      // reCAPTCHA solved
    }
  });
};

/**
 * Send OTP Code to Mobile Phone
 */
export const sendOtpToPhone = async (phoneNumber, appVerifier) => {
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  return {
    confirm: async (verificationCode) => {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // Load/create user record in Firestore
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = {
          uid: user.uid,
          name: user.displayName || 'Phone User',
          email: user.email || '',
          mobile: phoneNumber,
          role: 'buyer',
          status: 'verified',
          latitude: 19.0760,
          longitude: 72.8777,
          profilePhoto: null,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), profile);
        await setDoc(doc(db, 'buyers', user.uid), {
          uid: profile.uid,
          name: profile.name,
          email: profile.email,
          mobile: profile.mobile,
          role: profile.role,
          status: profile.status,
          latitude: profile.latitude,
          longitude: profile.longitude,
          profilePhoto: profile.profilePhoto,
          createdAt: profile.createdAt
        });
      }
      return { user: profile };
    }
  };
};

/**
 * Sign in user using Google Provider
 */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  
  // Check if user document exists in Firestore
  let profile = await getUserProfile(user.uid);
  if (!profile) {
    profile = {
      uid: user.uid,
      name: user.displayName || 'Google User',
      username: user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : 'user_' + user.uid.substring(0, 5),
      email: user.email || '',
      mobile: user.phoneNumber || '',
      role: 'buyer', // Default role for new Google sign-ups
      status: 'verified',
      latitude: 19.0760, // Default coordinates
      longitude: 72.8777,
      profilePhoto: user.photoURL || null,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', user.uid), profile);
    await setDoc(doc(db, 'buyers', user.uid), {
      uid: profile.uid,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      mobile: profile.mobile,
      role: profile.role,
      status: profile.status,
      latitude: profile.latitude,
      longitude: profile.longitude,
      profilePhoto: profile.profilePhoto,
      createdAt: profile.createdAt
    });
  }
  return profile;
};
