import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
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
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

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
      <main className="flex-grow pb-12 relative z-10">
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
