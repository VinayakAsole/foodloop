/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  getUserProfile, 
  signInUser, 
  signUpUser, 
  signOutUser,
  resetUserPassword,
  setupRecaptcha,
  sendOtpToPhone,
  signInWithGoogle
} from '../firebase/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);
        } catch (e) {
          console.error("Failed to load user profile:", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const profileData = await signInUser(email, password);
      setUser(profileData);
      return profileData;
    } catch (e) {
      setLoading(false);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const profileData = await signInWithGoogle();
      setUser(profileData);
      return profileData;
    } catch (e) {
      setLoading(false);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email, 
    password, 
    name, 
    mobile, 
    role, 
    latitude, 
    longitude, 
    kitchenName, 
    kitchenAddress, 
    foodCategories, 
    profilePhoto,
    username = ''
  ) => {
    setLoading(true);
    try {
      const profileData = await signUpUser(
        email, 
        password, 
        name, 
        mobile, 
        role, 
        latitude, 
        longitude, 
        kitchenName, 
        kitchenAddress, 
        foodCategories, 
        profilePhoto,
        username
      );
      setUser(profileData);
      return profileData;
    } catch (e) {
      setLoading(false);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPhone = async (phoneNumber, appVerifier, code) => {
    setLoading(true);
    try {
      const confirmation = await sendOtpToPhone(phoneNumber, appVerifier);
      const result = await confirmation.confirm(code);
      setUser(result.user);
      return result.user;
    } catch (e) {
      setLoading(false);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setUser(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileState = (updatedFields) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    loginWithPhone,
    sendOtpToPhone,
    setupRecaptcha,
    resetPassword: resetUserPassword,
    logout,
    updateProfileState,
    isMockMode: false
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  return context || { user: null, loading: false, login: async () => {}, register: async () => {}, logout: async () => {} };
};
