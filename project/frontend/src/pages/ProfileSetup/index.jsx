import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import LocationPickerMap from '../../components/LocationPickerMap';
import { uploadImage } from '../../firebase/storage';
import { 
  User, 
  Phone, 
  MapPin, 
  ChefHat, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  LogOut, 
  Upload, 
  Mail, 
  AlertCircle 
} from 'lucide-react';

export const ProfileSetup = () => {
  const { user, logout, updateProfileState } = useAuth();
  const navigate = useNavigate();

  // Step state: 1 = Contact & Phone OTP, 2 = Permanent Coordinates, 3 = Kitchen details
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [kitchenName, setKitchenName] = useState(user?.kitchenName || '');
  const [kitchenAddress, setKitchenAddress] = useState(user?.kitchenAddress || '');
  const [selectedCats, setSelectedCats] = useState(user?.foodCategories || []);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Map Coordinates state
  const [latitude, setLatitude] = useState(user?.latitude || '');
  const [longitude, setLongitude] = useState(user?.longitude || '');
  const [resolvedAddress, setResolvedAddress] = useState('');

  // Phone Verification details
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(user?.phoneVerified || false);
  const [otpError, setOtpError] = useState(null);
  const [otpNotification, setOtpNotification] = useState(null);

  // Handle Google logins that didn't populate a username
  const username = user?.username || user?.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError(null);
    setOtpNotification(null);

    const phoneClean = mobile.trim();
    if (!phoneClean || phoneClean.length < 10) {
      setOtpError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      // Check if phone number is already registered by another account
      const q = query(
        collection(db, 'users'),
        where('mobile', '==', phoneClean)
      );
      const querySnapshot = await getDocs(q);
      const otherUsers = querySnapshot.docs.filter(d => d.id !== user.uid);

      if (otherUsers.length > 0) {
        setOtpError('This phone number is already registered to another account.');
        setLoading(false);
        return;
      }

      // Simulate OTP generation
      setTimeout(() => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);
        setOtpSent(true);
        setOtpNotification(`[FoodLoop OTP] Verification code: ${code}. (Enter ${code} or 123456 to verify)`);
        setLoading(false);
      }, 800);
    } catch (err) {
      console.error("Phone number check failed:", err);
      setOtpError("Error checking phone number: " + err.message);
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setOtpError(null);

    if (verificationCode === generatedOtp || verificationCode === '123456') {
      setPhoneVerified(true);
      setOtpSent(false);
      setOtpNotification(null);
      setError(null);
    } else {
      setOtpError('Invalid OTP code. Please try again.');
    }
  };

  const handleLocationChange = (loc) => {
    if (loc) {
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
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
      setError("Failed to upload profile image.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const handleSubmitProfile = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!name.trim()) throw new Error("Full name is required.");
      if (!phoneVerified) throw new Error("Please verify your phone number via OTP.");
      if (!latitude || !longitude) throw new Error("Please pin your permanent kitchen coordinates on the map.");
      if (!kitchenName.trim()) throw new Error("Kitchen Name is required.");
      if (!kitchenAddress.trim()) throw new Error("Kitchen physical address is required.");
      if (selectedCats.length === 0) throw new Error("Select at least one food category.");

      const updatedFields = {
        name: name.trim(),
        mobile: mobile.trim(),
        phoneVerified: true,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        kitchenName: kitchenName.trim(),
        kitchenAddress: kitchenAddress.trim(),
        foodCategories: selectedCats,
        profilePhoto,
        profileCompleted: true,
        status: user?.status || 'pending', // Keeps verification pending for security review
        updatedAt: new Date().toISOString()
      };

      // Write to both users and sellers collections
      const userRef = doc(db, 'users', user.uid);
      const sellerRef = doc(db, 'sellers', user.uid);

      await updateDoc(userRef, updatedFields);
      await setDoc(sellerRef, updatedFields, { merge: true });

      // Update local authentication state
      updateProfileState(updatedFields);

      // Redirect to dashboard
      navigate('/seller-dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to finalize profile setup.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!phoneVerified) {
        setError("Please verify your mobile number via OTP first.");
        return;
      }
    }
    if (step === 2) {
      if (!latitude || !longitude) {
        setError("Please select your kitchen location on the map.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative py-16 px-4 bg-moody pt-24 pb-28 md:pb-16">
      <div className="absolute inset-0 bg-overlay pointer-events-none z-0"></div>

      <div className="w-full max-w-xl mx-auto relative z-10 flex flex-col items-center">
        
        {/* Title Block */}
        <header className="text-center mb-8">
          <span className="bg-primary-500/10 text-primary-500 border border-primary-500/25 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-3 inline-block shadow-md">
            Seller Portal Onboarding
          </span>
          <h1 className="text-3xl font-black mb-2 tracking-tight text-white font-display">
            Setup Your Kitchen Profile
          </h1>
          <p className="text-gray-400 text-xs leading-relaxed max-w-md">
            Complete your mandatory profile details and pin your kitchen coordinates to unlock your Home Cook dashboard.
          </p>
        </header>

        {/* Step Progress indicators */}
        <div className="w-full flex items-center justify-between mb-8 px-6 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0"></div>
          
          {[1, 2, 3].map((num) => {
            const isActive = step >= num;
            const isCurrent = step === num;
            return (
              <div key={num} className="relative z-10 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-primary-500 text-slate-950 font-black scale-110 shadow-[0_0_12px_#FF6B35]' 
                    : isActive 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-900 border border-white/10 text-gray-500'
                }`}>
                  {isActive && num < step ? <Check size={14} /> : num}
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider mt-2 transition-colors ${
                  isCurrent ? 'text-primary-500' : isActive ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  {num === 1 ? 'Verify Phone' : num === 2 ? 'Kitchen Pin' : 'Kitchen Details'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Glass Card Container */}
        <div className="w-full glass-card rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-2xl">
          
          {error && (
            <div className="w-full mb-6 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 p-4 rounded-[1.25rem] flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PHONE VERIFICATION */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Phone className="text-primary-500" size={20} />
                <span>Contact Verification</span>
              </h2>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Full Name</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <User className="absolute left-5 text-gray-500" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-1.5 text-left opacity-75">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Email (Registered Account)</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center bg-white/5 border border-white/5">
                    <Mail className="absolute left-5 text-gray-500" size={18} />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-gray-400 focus:outline-none text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Mobile Phone Input & Send OTP */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Mobile Phone Number</label>
                  <div className="flex gap-2">
                    <div className="glass-input-pill rounded-full px-5 flex items-center text-[#2EC4B6] font-black text-sm shrink-0 border border-white/5 bg-white/5">
                      +91
                    </div>
                    <div className="relative glass-input-pill rounded-full overflow-hidden flex-1 flex items-center">
                      <Phone className="absolute left-5 text-gray-500" size={18} />
                      <input
                        type="tel"
                        required
                        disabled={phoneVerified}
                        placeholder="Mobile Number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-transparent border-none py-3.5 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  {phoneVerified && (
                    <span className="text-[11px] text-emerald-400 font-bold ml-1 flex items-center gap-1 mt-1">
                      <Check size={12} /> Phone Verified Successfully
                    </span>
                  )}
                </div>

                {/* OTP Notification Toast */}
                {otpNotification && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-[1.25rem] text-xs font-semibold text-emerald-200/90 leading-relaxed shadow-lg">
                    {otpNotification}
                  </div>
                )}

                {/* Send OTP button */}
                {!phoneVerified && !otpSent && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full py-3.5 bg-white text-black font-bold rounded-full transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : 'Send OTP Verification Code'}
                  </button>
                )}

                {/* Verification Code input form */}
                {otpSent && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2 border-t border-white/5">
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-semibold text-gray-400 ml-1">Enter 6-Digit OTP</label>
                      <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="------"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.trim())}
                          className="w-full bg-transparent border-none py-3.5 text-white placeholder-gray-600 focus:outline-none text-sm text-center font-bold tracking-widest"
                        />
                      </div>
                    </div>
                    {otpError && (
                      <p className="text-[11px] text-rose-400 font-bold text-center">{otpError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpNotification(null); }}
                        className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-full cursor-pointer transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-2 flex-grow py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-full cursor-pointer transition shadow-md shadow-emerald-500/20"
                      >
                        Verify OTP
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PERMANENT COORDINATES PIN */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="text-[#FF6B35]" size={20} />
                  <span>Pin Kitchen Location</span>
                </h2>
                <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ⚠️ NOT CHANGEABLE
                </span>
              </div>

              <p className="text-gray-400 text-xs leading-relaxed">
                Pin your home kitchen coordinates. This will be the locked coordinate for food listings. If you move, you must get admin authorization.
              </p>

              {/* Map view */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg relative">
                <LocationPickerMap
                  initialLocation={
                    latitude && longitude 
                      ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
                      : null
                  }
                  onLocationChange={handleLocationChange}
                  onAddressResolved={setResolvedAddress}
                  height="280px"
                />
              </div>

              {latitude && longitude && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between font-mono text-[11px] text-gray-300">
                    <span>Latitude: <strong className="text-primary-500">{Number(latitude).toFixed(6)}</strong></span>
                    <span>Longitude: <strong className="text-primary-500">{Number(longitude).toFixed(6)}</strong></span>
                  </div>
                  {resolvedAddress && (
                    <p className="text-[11px] text-gray-400 leading-tight">
                      <strong>Address:</strong> {resolvedAddress}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: KITCHEN DETAILS */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ChefHat className="text-primary-500" size={20} />
                <span>Kitchen Profile Details</span>
              </h2>

              <div className="space-y-4">
                {/* Kitchen / Brand Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Kitchen / Brand Name</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grandma's Kitchen"
                      value={kitchenName}
                      onChange={(e) => setKitchenName(e.target.value)}
                      className="w-full bg-transparent border-none py-3.5 px-5 text-white placeholder-gray-600 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Kitchen Physical Address */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Kitchen Physical Address</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="Street name, Appt No, landmark..."
                      value={kitchenAddress}
                      onChange={(e) => setKitchenAddress(e.target.value)}
                      className="w-full bg-transparent border-none py-3.5 px-5 text-white placeholder-gray-600 focus:outline-none text-sm"
                    />
                  </div>
                  {resolvedAddress && (
                    <button
                      type="button"
                      onClick={() => setKitchenAddress(resolvedAddress)}
                      className="text-[10px] text-[#00F5FF] hover:underline block ml-1 font-semibold"
                    >
                      Use Map Resolved Address
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 ml-1">Food Categories Offered</p>
                  <div className="flex flex-wrap gap-2">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(cat => {
                      const isSelected = selectedCats.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCats(selectedCats.filter(c => c !== cat));
                            } else {
                              setSelectedCats([...selectedCats, cat]);
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white border-white text-black shadow-lg shadow-white/5'
                              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                          }`}
                        >
                          {cat} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kitchen / Profile Photo */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 ml-1">Kitchen / Profile Photo</p>
                  <div className="flex items-center space-x-4">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Kitchen Preview"
                        className="w-16 h-16 rounded-2xl border border-white/10 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-gray-500 text-[10px] font-bold shrink-0 bg-black/25">
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
                      <div className="py-3 px-4 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white text-center rounded-full transition-all flex items-center justify-center gap-2">
                        {photoUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{photoUploading ? "Uploading..." : "Upload Photo"}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-2.5">
                  <span className="text-xs mt-0.5">⏳</span>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed font-semibold">
                    Once submitted, your account will be sent to the administrator for verification. You can access the dashboard immediately, but your listings will be active once approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-2 flex-grow py-3.5 bg-white text-black font-bold rounded-full transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-white/5"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitProfile}
                disabled={loading || photoUploading}
                className="flex-2 flex-grow py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-slate-950 font-black rounded-full transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-primary-500/25 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="animate-spin text-slate-950" size={16} />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Confirm &amp; Finalize Profile</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Account Log out Trap escape */}
          <div className="mt-6 text-center border-t border-white/5 pt-4">
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-rose-400 transition-colors font-medium inline-flex items-center gap-1"
            >
              <LogOut size={12} />
              <span>Log out of different account</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
