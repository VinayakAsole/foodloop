import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGeolocation } from '../../hooks/useGeolocation';
import { uploadImage } from '../../firebase/storage';
import Logo from '../../components/Logo';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  ChefHat, 
  ShoppingBag, 
  ShieldAlert, 
  Compass, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export const Auth = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, register, sendOtpToPhone, resetPassword } = useAuth();
  const { coords, loading: geoLoading, getCoordinates, error: geoError } = useGeolocation();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState('buyer'); // 'buyer' or 'seller' or 'admin'
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Phone OTP Login states
  const [isPhoneLogin, setIsPhoneLogin] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Seller extra fields state
  const [kitchenName, setKitchenName] = useState('');
  const [kitchenAddress, setKitchenAddress] = useState('');
  const [selectedSellerCats, setSelectedSellerCats] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Failed attempts rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    if (pwd.length < 5) return 1;
    if (pwd.length < 8) return 2;
    return 3;
  };

  const handleFetchLocation = async () => {
    const fetched = await getCoordinates();
    if (fetched) {
      setLatitude(fetched.latitude.toFixed(6));
      setLongitude(fetched.longitude.toFixed(6));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, 'profiles');
      setProfilePhoto(url);
    } catch (err) {
      setError("Failed to upload profile photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await sendOtpToPhone(phoneNumber.trim(), null);
      setConfirmationResult(result);
      setOtpSent(true);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        if (failedAttempts >= 5) {
          throw new Error("Security Lockout: Too many failed login attempts. Please reset your password.");
        }

        let userProfile;
        if (isPhoneLogin) {
          if (!verificationCode) {
            throw new Error("Verification code is required.");
          }
          const result = await confirmationResult.confirm(verificationCode);
          userProfile = result.user;
        } else {
          userProfile = await login(email, password);
        }

        // Redirect based on role
        if (userProfile.role === 'seller') {
          navigate('/seller-dashboard');
        } else if (userProfile.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        if (!latitude || !longitude) {
          throw new Error("Please set your location coordinates to match food listings nearby.");
        }
        if (role === 'seller' && (!kitchenName || !kitchenAddress)) {
          throw new Error("Kitchen Name and Kitchen Address are required for Home Cooks.");
        }

        // Unique mobile check
        const phoneClean = mobile.trim();
        if (phoneClean) {
          const phoneQ = query(collection(db, 'users'), where('mobile', '==', phoneClean));
          const phoneSnap = await getDocs(phoneQ);
          if (!phoneSnap.empty) {
            throw new Error("This phone number is already registered to another account.");
          }
        }

        const userProfile = await register(
          email,
          password,
          name,
          mobile,
          role,
          parseFloat(latitude),
          parseFloat(longitude),
          role === 'seller' ? kitchenName : '',
          role === 'seller' ? kitchenAddress : '',
          role === 'seller' ? selectedSellerCats : [],
          profilePhoto,
          username || name.toLowerCase().replace(/\s+/g, '_')
        );

        if (userProfile.role === 'seller') {
          navigate('/seller-dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      if (isLogin && !isPhoneLogin) {
        setFailedAttempts(prev => prev + 1);
      }
      let friendlyError = err.message || 'Authentication failed.';
      if (err.code === 'auth/wrong-password') friendlyError = 'Incorrect password.';
      else if (err.code === 'auth/user-not-found') friendlyError = 'No user account found with this email.';
      else if (err.code === 'auth/email-already-in-use') friendlyError = 'This email is already registered.';
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    try {
      await resetPassword(forgotEmail);
      alert(`Simulation: A password recovery link was sent to ${forgotEmail}. Please check your inbox.`);
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      alert("Error sending recovery link: " + err.message);
    } finally {
      setForgotSent(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const profile = await loginWithGoogle();
      if (profile.role === 'seller') {
        navigate('/seller-dashboard', { replace: true });
      } else if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error("Google Login Error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative py-12 px-4 bg-moody">
      {/* Darkening Overlay */}
      <div className="absolute inset-0 bg-overlay pointer-events-none z-0"></div>

      {/* Main content wrapper to sit above overlay */}
      <div className="w-full max-w-[420px] mx-4 relative z-10 flex flex-col items-center">
        
        {/* Logo/Icon Block */}
        <div className="mb-6 flex justify-center scale-110">
          <Logo iconSize="w-10 h-10" textSize="text-2xl" showAi={false} />
        </div>

        {/* Header Typography */}
        <header className="text-center mb-6">
          <h1 className="text-3xl font-black mb-2 tracking-tight text-white font-display">
            {showForgotModal ? "Reset Password" : isLogin ? "Welcome back" : "Create Account"}
          </h1>
          <p className="text-gray-400 text-xs leading-relaxed px-4">
            {showForgotModal 
              ? "Enter your email to recover access to your account."
              : isLogin 
                ? "Connecting kitchens, reducing waste, sharing homemade food near you."
                : "Join the zero-waste community and start saving fresh homemade meals."}
          </p>
        </header>

        {/* Main glass card */}
        <div className="w-full glass-card rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center">
          
          {error && (
            <div className="w-full mb-5 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-[1.25rem]">
              {error}
            </div>
          )}

          {failedAttempts >= 5 && isLogin && !isPhoneLogin && (
            <div className="w-full mb-5 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 p-4 rounded-[1.25rem] flex items-center space-x-3 animate-pulse">
              <ShieldAlert size={20} className="shrink-0 text-rose-500 animate-bounce" />
              <div>
                <p className="font-bold text-white uppercase tracking-wider text-[10px]">Security Lockout Active</p>
                <p className="text-[11px] text-gray-300">Too many failed login attempts. Please reset your password.</p>
              </div>
            </div>
          )}

          {/* SECTION A: LOGIN VIEW */}
          {isLogin && !showForgotModal && (
            <div className="w-full flex flex-col items-center">
              {/* Toggle navigation switcher */}
              <div className="w-full flex p-1 glass-toggle-container rounded-full mb-5">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(null); setShowForgotModal(false); }}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer bg-white text-black shadow-md"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(null); setShowForgotModal(false); }}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-gray-400 hover:text-white"
                >
                  Register
                </button>
              </div>


              {/* Google Social Sign In */}
              {!isPhoneLogin && (
                <>
                  <div className="w-full mb-4">
                    <button 
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full glass-input-pill hover:bg-white/10 transition-colors py-3.5 rounded-full flex items-center justify-center gap-3 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <img 
                        alt="Google logo" 
                        className="w-5 h-5" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQ9ciGGGgdyCvFLGlehMgux21UarUz0UsYXVIK7YvocPXxYUhJoPut3o9eEu5WSYOTgB1yIaopFtfKWIoFaIwlUT1DyZEyGY6zwAfhGr2BWTHrktkBubkMK5WvbBRfBzLv5nuO-6crG7qpkQw-b7cTNAYpzqdMUnxpmzMe-mqpUzZyP2REw6CTMW6i3am4cxpcux9j9m88eaF1ayL_fpGZECiECBbTjB7nrICiTXHuIQcxrBHq_pqZgCUPQvAxlhhPuHzjGO4DVk_1"
                      />
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  <div className="flex items-center w-full mb-5 gap-3">
                    <div className="flex-1 h-[1px] bg-white/10"></div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">or sign in with email</span>
                    <div className="flex-1 h-[1px] bg-white/10"></div>
                  </div>
                </>
              )}

              <form onSubmit={isPhoneLogin && !otpSent ? handleSendOtp : handleSubmit} className="w-full space-y-5">
                {isPhoneLogin ? (
                  /* Phone OTP login inputs */
                  !otpSent ? (
                    <div className="space-y-1.5 text-left w-full">
                      <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="phoneNumber">Mobile Number</label>
                      <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                        <Phone className="absolute left-5 text-gray-500" size={18} />
                        <input
                          id="phoneNumber"
                          type="tel"
                          required
                          placeholder="Mobile Number (+91...)"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 w-full">
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="verificationCode">Verification OTP</label>
                        <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                          <Lock className="absolute left-5 text-gray-500" size={18} />
                          <input
                            id="verificationCode"
                            type="text"
                            required
                            maxLength={6}
                            placeholder="Enter 6-Digit OTP"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm text-center font-bold tracking-widest focus:ring-0"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center">OTP sent to {phoneNumber}. Enter <strong className="text-primary-500 font-bold">123456</strong> for testing.</p>
                    </div>
                  )
                ) : (
                  /* Email login inputs */
                  <>
                    <div className="space-y-1.5 text-left w-full">
                      <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="email">Email Address</label>
                      <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                        <Mail className="absolute left-5 text-gray-500" size={18} />
                        <input
                          id="email"
                          type="text"
                          required
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left w-full">
                      <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="password">Password</label>
                      <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                        <Lock className="absolute left-5 text-gray-500" size={18} />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent border-none py-3.5 pl-12 pr-12 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 text-gray-500 hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center text-xs w-full px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhoneLogin(!isPhoneLogin);
                      setError(null);
                    }}
                    className="text-secondary-500 hover:text-secondary-400 transition-colors font-semibold cursor-pointer"
                  >
                    {isPhoneLogin ? "Sign in with Email" : "Use Mobile OTP Login"}
                  </button>
                  {!isPhoneLogin && (
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[#00F5FF] hover:underline transition-colors font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (failedAttempts >= 5 && !isPhoneLogin)}
                  className="w-full bg-white text-black font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 shadow-lg shadow-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin mx-auto text-black" size={18} />
                  ) : (
                    <>
                      <span>{isPhoneLogin && !otpSent ? 'Send OTP' : 'Sign In'}</span>
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <footer className="mt-6">
                <p className="text-sm text-gray-400">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(false); setError(null); }}
                    className="text-[#00F5FF] font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Create an account
                  </button>
                </p>
              </footer>

              <p className="text-[10px] text-white/30 text-center italic mt-6">
                🔒 Protected by Firebase Authentication | Rate limited login
              </p>
            </div>
          )}

          {/* SECTION B: REGISTER VIEW */}
          {!isLogin && (
            <div className="w-full flex flex-col items-center">
              {/* Toggle navigation switcher */}
              <div className="w-full flex p-1 glass-toggle-container rounded-full mb-5">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(null); setShowForgotModal(false); }}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-gray-400 hover:text-white"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(null); setShowForgotModal(false); }}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer bg-white text-black shadow-md"
                >
                  Register
                </button>
              </div>

              {/* Role selector inside registration form */}
              <div className="w-full space-y-1.5 mb-5 text-left">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Register as a</label>
                <div className="flex p-1 glass-toggle-container rounded-full">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'buyer'
                        ? 'bg-white/10 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🛍️</span> Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'seller'
                        ? 'bg-white/10 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>👨‍🍳</span> Home Cook
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5 text-left w-full">
                  <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="regName">Full Name</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <User className="absolute left-5 text-gray-500" size={18} />
                    <input
                      id="regName"
                      type="text"
                      required
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!username) {
                          setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                        }
                      }}
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5 text-left w-full">
                  <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="regUsername">Username</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <span className="absolute left-5 text-gray-500 text-sm font-bold">@</span>
                    <input
                      id="regUsername"
                      type="text"
                      required
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full bg-transparent border-none py-3.5 pl-10 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm font-mono focus:ring-0"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5 text-left w-full">
                  <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="regEmail">Email Address</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <Mail className="absolute left-5 text-gray-500" size={18} />
                    <input
                      id="regEmail"
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                    />
                  </div>
                </div>

                {/* Mobile Phone with Prefix */}
                <div className="space-y-1.5 text-left w-full">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="glass-input-pill rounded-full px-5 flex items-center text-[#2EC4B6] font-black text-sm shrink-0 border border-white/5 bg-white/5">
                      +91
                    </div>
                    <div className="relative glass-input-pill rounded-full overflow-hidden flex-1 flex items-center">
                      <Phone className="absolute left-5 text-gray-500" size={18} />
                      <input
                        type="tel"
                        required
                        placeholder="Mobile Number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 text-left w-full">
                  <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="regPassword">Password</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <Lock className="absolute left-5 text-gray-500" size={18} />
                    <input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-12 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 text-gray-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password strength indicators */}
                  {password.length > 0 && (
                    <div className="flex gap-1.5 px-2 mt-1">
                      {[1, 2, 3].map((num) => {
                        const strength = getPasswordStrength(password);
                        const active = strength >= num;
                        let colorClass = "bg-white/10";
                        if (active) {
                          colorClass = strength === 1 ? "bg-rose-500" : strength === 2 ? "bg-amber-500" : "bg-emerald-500";
                        }
                        return (
                          <div
                            key={num}
                            className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${colorClass}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-left w-full">
                  <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="regConfirmPassword">Confirm Password</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <Lock className="absolute left-5 text-gray-500" size={18} />
                    <input
                      id="regConfirmPassword"
                      type="password"
                      required
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-rose-400 px-2 mt-1 text-left">Passwords do not match.</p>
                  )}
                </div>

                {/* Geolocation Coordinates */}
                <div className="space-y-1.5 p-4 rounded-[1.5rem] border border-white/5 bg-white/5 w-full text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-gray-400 flex items-center space-x-1">
                      <MapPin size={12} className="text-[#FF6B35]" />
                      <span>Kitchen GPS Pin</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchLocation}
                      disabled={geoLoading}
                      className="text-[10px] font-semibold text-[#00F5FF] hover:text-[#00e1eb] flex items-center space-x-1 focus:outline-none disabled:text-gray-600 cursor-pointer transition-colors"
                    >
                      {geoLoading ? <RefreshCw size={10} className="animate-spin" /> : <Compass size={10} />}
                      <span>Autofill GPS</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Latitude"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/25 text-white placeholder-gray-600 focus:outline-none text-xs focus:ring-1 focus:ring-white/10"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Longitude"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/25 text-white placeholder-gray-600 focus:outline-none text-xs focus:ring-1 focus:ring-white/10"
                    />
                  </div>
                </div>

                {/* Home Cook Seller-Only Fields */}
                {role === 'seller' && (
                  <div className="p-4 glass-card rounded-[1.5rem] space-y-4 text-left w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span>👨‍🍳</span>
                      <h3 className="font-display font-semibold text-white text-sm">Seller Additional Info</h3>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Kitchen / Brand Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Kitchen / Brand Name"
                        value={kitchenName}
                        onChange={(e) => setKitchenName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 px-4 text-white placeholder-gray-600 focus:border-white/20 outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Kitchen Address</label>
                      <input
                        type="text"
                        required
                        placeholder="Kitchen Address"
                        value={kitchenAddress}
                        onChange={(e) => setKitchenAddress(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 px-4 text-white placeholder-gray-600 focus:border-white/20 outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Food Categories</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(cat => {
                          const isSelected = selectedSellerCats.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSellerCats(selectedSellerCats.filter(c => c !== cat));
                                } else {
                                  setSelectedSellerCats([...selectedSellerCats, cat]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-white border-white text-black shadow'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                              }`}
                            >
                              {cat} {isSelected && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Kitchen / Profile Photo</p>
                      <div className="flex items-center space-x-3 mt-1">
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt="Kitchen Preview"
                            className="w-12 h-12 rounded-xl border border-white/10 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-500 text-[9px] font-bold shrink-0">
                            No Photo
                          </div>
                        )}
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <div className="py-2.5 px-3 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white text-center rounded-full transition-all">
                            {photoUploading ? "Reading photo..." : "Add Kitchen Photo"}
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-2.5">
                      <span className="text-[10px] mt-0.5">⏳</span>
                      <p className="text-[10px] text-amber-200/80 leading-relaxed font-medium">
                        Pending Admin Verification after registration. Your profile will be visible once approved.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (confirmPassword !== '' && password !== confirmPassword)}
                  className="w-full bg-white text-black font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 shadow-lg shadow-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin mx-auto text-black" size={18} />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <footer className="mt-6">
                <p className="text-sm text-gray-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(true); setError(null); }}
                    className="text-[#00F5FF] font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Sign In
                  </button>
                </p>
              </footer>
            </div>
          )}

          {/* SECTION C: FORGOT PASSWORD VIEW */}
          {isLogin && showForgotModal && (
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-4 border-b border-white/5 pb-4 text-left w-full">
                <button
                  onClick={() => { setShowForgotModal(false); setForgotEmail(''); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  ←
                </button>
                <h2 className="font-display font-black text-xl text-white">Reset Password</h2>
              </div>

              <div className="space-y-5 w-full mt-5">
                <p className="text-gray-400 text-xs leading-normal text-left px-1">Enter your registered email address to receive a secure password reset link.</p>
                
                <form onSubmit={handleForgotSubmit} className="space-y-5">
                  <div className="space-y-1.5 text-left w-full">
                    <label className="text-xs font-semibold text-gray-400 ml-1" htmlFor="forgotEmail">Email Address</label>
                    <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                      <Mail className="absolute left-5 text-gray-500" size={18} />
                      <input
                        id="forgotEmail"
                        type="email"
                        required
                        placeholder="Enter email address"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotSent}
                    className="w-full bg-white text-black font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 shadow-lg shadow-white/10 cursor-pointer disabled:opacity-50"
                  >
                    {forgotSent ? (
                      <RefreshCw className="animate-spin mx-auto text-black" size={18} />
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;

