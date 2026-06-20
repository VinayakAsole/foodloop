import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import { X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

// Lazy-loaded pages for code splitting — each route loads only when visited
const Home = React.lazy(() => import('./pages/Home'));
const Auth = React.lazy(() => import('./pages/Auth'));
const SellerDashboard = React.lazy(() => import('./pages/SellerDashboard'));
const FoodDetail = React.lazy(() => import('./pages/FoodDetail'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const SellerProfile = React.lazy(() => import('./pages/SellerProfile'));
const SellerAnalytics = React.lazy(() => import('./pages/SellerAnalytics'));
const EcoImpactWidget = React.lazy(() => import('./components/EcoImpactWidget'));
const ProfileSetup = React.lazy(() => import('./pages/ProfileSetup'));

// Shared loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#090a0f]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      <span className="text-sm font-semibold tracking-wider text-primary-500/70 animate-pulse uppercase">Loading...</span>
    </div>
  </div>
);

// Protected Route wrapper component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-primary-500">
        <span className="text-sm font-semibold tracking-wider animate-pulse uppercase">Loading Session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Intercept incomplete seller profiles and force onboarding redirect
  if (
    user.role === 'seller' && 
    !user.profileCompleted && 
    location.pathname !== '/profile-setup'
  ) {
    return <Navigate to="/profile-setup" replace />;
  }

  // If a complete seller tries to access the profile-setup page, send them back to dashboard
  if (
    user.role === 'seller' &&
    user.profileCompleted &&
    location.pathname === '/profile-setup'
  ) {
    return <Navigate to="/seller-dashboard" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect role mismatch
    if (user.role === 'seller') return <Navigate to="/seller-dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

// Route controller for Root path '/'
const RootRoute = () => {
  const { user } = useAuthContext();
  
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'seller') return <Navigate to="/seller-dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Home />;
};

const AppContent = () => {
  const { user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const showLedger = searchParams.get('showLedger') === 'true';

  // ── Easter Egg state ──────────────────────────────────────────────────
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const konamiCode = [
      'ArrowUp', 'ArrowUp', 
      'ArrowDown', 'ArrowDown', 
      'ArrowLeft', 'ArrowRight', 
      'ArrowLeft', 'ArrowRight', 
      'b', 'a'
    ];
    const swipeKonamiCode = [
      'SwipeUp', 'SwipeUp',
      'SwipeDown', 'SwipeDown',
      'SwipeLeft', 'SwipeRight',
      'SwipeLeft', 'SwipeRight'
    ];

    let sequence = [];
    let touchSequence = [];
    let intervalId;
    let countdownId;

    const triggerEasterEgg = () => {
      setShowEasterEgg(true);
      setCountdown(10);

      // Confetti rain
      const duration = 10 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      intervalId = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(intervalId);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      countdownId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => {
        setShowEasterEgg(false);
        clearInterval(intervalId);
        clearInterval(countdownId);
      }, 10000);
    };

    const handleKeyDown = (e) => {
      const key = e.key;
      sequence.push(key);
      
      if (sequence.length > konamiCode.length) {
        sequence.shift();
      }

      const isMatch = sequence.every((val, index) => {
        const target = konamiCode[index];
        if (target === 'b') return val.toLowerCase() === 'b';
        if (target === 'a') return val.toLowerCase() === 'a';
        return val === target;
      });

      if (isMatch && sequence.length === konamiCode.length) {
        sequence = []; // Reset sequence
        triggerEasterEgg();
      }
    };

    // Mobile touch swipe listener
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const diffX = endX - startX;
        const diffY = endY - startY;
        const threshold = 40; // minimum touch travel to detect a swipe in pixels

        let swipeDir = null;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          if (Math.abs(diffX) > threshold) {
            swipeDir = diffX > 0 ? 'SwipeRight' : 'SwipeLeft';
          }
        } else {
          if (Math.abs(diffY) > threshold) {
            swipeDir = diffY > 0 ? 'SwipeDown' : 'SwipeUp';
          }
        }

        if (swipeDir) {
          touchSequence.push(swipeDir);
          if (touchSequence.length > swipeKonamiCode.length) {
            touchSequence.shift();
          }

          const isMatch = touchSequence.every((val, index) => val === swipeKonamiCode[index]);
          if (isMatch && touchSequence.length === swipeKonamiCode.length) {
            touchSequence = []; // Reset touch sequence
            triggerEasterEgg();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      clearInterval(intervalId);
      clearInterval(countdownId);
    };
  }, []);

  return (
    <div className={`min-h-screen text-gray-100 flex flex-col relative overflow-hidden transition-colors duration-500 ${
      isAuthPage ? 'bg-[#090a0f]' : 'bg-moody bg-fixed'
    }`}>
      {/* Global Darkening Overlay (disabled on Auth page to prevent double overlays) */}
      {!isAuthPage && <div className="absolute inset-0 bg-overlay pointer-events-none z-0"></div>}

      {/* Background decorative glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-primary-500/8 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-secondary-500/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-[35%] right-[20%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-tertiary-500/4 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Navbar />
      <main className="flex-grow pb-28 md:pb-12 relative z-10">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public/Auth Route */}
          <Route path="/auth" element={<Auth />} />

          {/* Dynamic Root Route */}
          <Route path="/" element={<RootRoute />} />

          {/* Protected Buyer Routes */}
          <Route 
            path="/food/:id" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <FoodDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/favorites" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <Favorites />
              </ProtectedRoute>
            } 
          />

          {/* Protected Seller Routes */}
          <Route 
            path="/profile-setup" 
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <ProfileSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller-analytics" 
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerAnalytics />
              </ProtectedRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } 
          />

          {/* General Protected Routes */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller/:sellerId" 
            element={
              <ProtectedRoute>
                <SellerProfile />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      <BottomNav />

      {/* Global Eco-Hero Ledger Overlay Modal */}
      {showLedger && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" 
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('showLedger');
              setSearchParams(newParams, { replace: true });
            }} 
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0b0c10]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl z-10">
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('showLedger');
                setSearchParams(newParams, { replace: true });
              }}
              className="absolute top-4 right-4 p-2 bg-slate-950/50 hover:bg-slate-950 text-gray-400 hover:text-white rounded-full border border-white/10 transition z-50 cursor-pointer"
            >
              <X size={18} />
            </button>
            <Suspense fallback={<PageLoader />}>
              <EcoImpactWidget userId={user.uid} userName={user.name || 'Food Saver'} />
            </Suspense>
          </div>
        </div>
      )}

      {/* ── Easter Egg Overlay ── */}
      {showEasterEgg && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl transition-all duration-500 select-none scanline">
          {/* Moving scanline and rainbow text color CSS keyframe definitions */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanlineMove {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100vh); }
            }
            @keyframes gradientFlow {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes textGlow {
              0%, 100% { filter: drop-shadow(0 0 15px rgba(255, 107, 53, 0.5)) drop-shadow(0 0 30px rgba(46, 196, 182, 0.3)); }
              50% { filter: drop-shadow(0 0 30px rgba(255, 107, 53, 0.9)) drop-shadow(0 0 50px rgba(46, 196, 182, 0.5)); }
            }
            .scanline::after {
              content: '';
              position: absolute;
              top: 0; left: 0;
              width: 100%;
              height: 120px;
              background: linear-gradient(to bottom, rgba(255,107,53,0), rgba(255,107,53,0.08), rgba(255,107,53,0));
              animation: scanlineMove 6s linear infinite;
              pointer-events: none;
            }
            .animated-name {
              font-size: 3rem;
              font-weight: 900;
              background: linear-gradient(to right, #ff6b35, #ffbf69, #2ec4b6, #ff6b35);
              background-size: 300% 300%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: gradientFlow 4s ease infinite, textGlow 2s ease-in-out infinite;
              letter-spacing: -0.025em;
              line-height: 1.1;
            }
            @media (min-width: 768px) {
              .animated-name {
                font-size: 4.8rem;
              }
            }
          `}} />

          {/* CRT lines filter */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
              backgroundSize: '100% 4px, 6px 100%'
            }}
          />

          {/* Holographic Grid */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'linear-gradient(to right, #ffffff10 1px, transparent 1px), linear-gradient(to bottom, #ffffff10 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative max-w-xl text-center space-y-6 z-10 p-8 rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_50px_rgba(255,107,53,0.15)] backdrop-blur-md transition-all duration-300">
            <div className="flex items-center justify-center gap-2 text-primary-500 text-xs font-mono tracking-widest uppercase animate-pulse">
              <Sparkles size={16} className="animate-spin" />
              <span>Secret Developer Panel Unlocked</span>
              <Sparkles size={16} className="animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="animated-name">
                Vinayak Asole
              </h2>
              <p className="text-xs text-gray-300 font-mono">
                Lead Creator & Full-Stack Architect
              </p>
            </div>

            <div className="border-y border-white/10 py-4 font-mono text-[11px] text-gray-400 space-y-2">
              <p>PROJECT: FoodLoop Zero-Food-Waste Community Platform</p>
              <p>
                GITHUB: <a 
                  href="https://github.com/VinayakAsole" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary-400 hover:text-primary-300 underline font-bold transition-colors cursor-pointer"
                >
                  @VinayakAsole
                </a>
              </p>
              <p className="text-emerald-400 font-bold uppercase animate-pulse">
                STATUS: 30 Lives & Infinite Eco-Shield Granted!
              </p>
            </div>

            <div className="text-xs text-gray-500 font-mono">
              Secure connection closing in <span className="text-primary-500 font-black text-sm">{countdown}s</span>...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
