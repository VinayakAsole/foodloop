import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, 
  ShoppingBag, 
  PlusCircle, 
  Map, 
  MoreHorizontal, 
  User, 
  Bell, 
  LogOut, 
  ChefHat,
  Sparkles
} from 'lucide-react';

export const BottomNav = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // If no user is logged in, do not show bottom navigation
  if (!user) return null;

  const handleLogout = async () => {
    setShowMoreMenu(false);
    await logout();
    navigate('/auth');
  };

  // Helper to check active tab
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/orders' || path === '/seller-dashboard') return 'listings';
    if (path === '/profile') return 'more';
    if (path === '/notifications') return 'more';
    return '';
  };

  const activeTab = getActiveTab();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f111c]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 shadow-[0_-10px_35px_rgba(0,0,0,0.6)]">
      
      {/* Popover "More" Menu */}
      {showMoreMenu && (
        <div className="absolute bottom-16 right-4 w-48 bg-[#16192b]/95 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col space-y-1 z-50 animate-slide-up">
          {user.role === 'buyer' && (
            <Link
              to="/?showLedger=true"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 transition"
            >
              <Sparkles size={15} className="text-amber-400 animate-pulse" />
              <span>Eco-Hero Ledger</span>
            </Link>
          )}
          <Link
            to="/profile"
            onClick={() => setShowMoreMenu(false)}
            className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <User size={15} className="text-primary-500" />
            <span>Profile</span>
          </Link>
          <Link
            to="/notifications"
            onClick={() => setShowMoreMenu(false)}
            className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <Bell size={15} className="text-secondary-500" />
            <span>Notifications</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition text-left cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Backdrop overlay for More menu */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Bottom Nav Links */}
      <div className="flex justify-around items-center h-12 relative z-50">
        
        {/* HOME TAB */}
        <Link
          to="/"
          onClick={() => setShowMoreMenu(false)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group ${
            activeTab === 'home' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Home size={20} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] font-black uppercase tracking-wider mt-1">Home</span>
          {activeTab === 'home' && (
            <div className="absolute top-[-10px] w-8 h-1 rounded-full bg-primary-500 shadow-[0_0_10px_#FF6B35]" />
          )}
        </Link>

        {/* MY LISTINGS / MY ORDERS TAB */}
        <Link
          to={user.role === 'seller' ? '/seller-dashboard' : '/orders'}
          onClick={() => setShowMoreMenu(false)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group ${
            activeTab === 'listings' ? 'text-secondary-500' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShoppingBag size={20} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] font-black uppercase tracking-wider mt-1 whitespace-nowrap">
            {user.role === 'seller' ? 'Listings' : 'Orders'}
          </span>
          {activeTab === 'listings' && (
            <div className="absolute top-[-10px] w-8 h-1 rounded-full bg-secondary-500 shadow-[0_0_10px_#2EC4B6]" />
          )}
        </Link>

        {/* ADD MEAL TAB */}
        <button
          onClick={() => {
            setShowMoreMenu(false);
            if (user.role === 'seller') {
              navigate('/seller-dashboard?add=true');
            } else {
              alert("Only chefs can list surplus food. Go to your Profile page to register as a chef cook! 🍳");
            }
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 text-gray-400 hover:text-gray-200 transition-all duration-200 relative group cursor-pointer"
        >
          <div className="bg-gradient-to-tr from-primary-500 to-primary-700 p-2.5 rounded-full text-slate-950 font-bold shadow-md shadow-primary-500/20 relative top-[-16px] border-[4px] border-[#0f111c] transition-transform group-active:scale-90">
            <PlusCircle size={22} className="text-white" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider absolute bottom-1 whitespace-nowrap">Add Meal</span>
        </button>

        {/* MAP TAB */}
        <button
          onClick={() => {
            setShowMoreMenu(false);
            navigate('/?map=true');
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 text-gray-400 hover:text-gray-200 transition-all duration-200 relative group cursor-pointer"
        >
          <Map size={20} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] font-black uppercase tracking-wider mt-1">Map</span>
        </button>

        {/* MORE TAB */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group cursor-pointer ${
            activeTab === 'more' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MoreHorizontal size={20} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] font-black uppercase tracking-wider mt-1">More</span>
          {activeTab === 'more' && (
            <div className="absolute top-[-10px] w-8 h-1 rounded-full bg-primary-500 shadow-[0_0_10px_#FF6B35]" />
          )}
        </button>

      </div>
    </div>
  );
};

export default BottomNav;
