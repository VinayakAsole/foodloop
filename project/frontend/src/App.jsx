import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import EcoImpactWidget from './components/EcoImpactWidget';
import Home from './pages/Home';
import { X } from 'lucide-react';
import Auth from './pages/Auth';
import SellerDashboard from './pages/SellerDashboard';
import FoodDetail from './pages/FoodDetail';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';

// Protected Route wrapper component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuthContext();

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

          {/* Protected Seller Routes */}
          <Route 
            path="/seller-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerDashboard />
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

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
            <EcoImpactWidget userId={user.uid} userName={user.name || 'Food Saver'} />
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
