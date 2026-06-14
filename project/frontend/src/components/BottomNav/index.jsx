import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, 
  ShoppingBag, 
  PlusCircle, 
  Map, 
  Heart,
  User, 
  Bell, 
  LogOut, 
  ChefHat,
  Sparkles,
  LayoutDashboard,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Star,
  Shield,
  Activity,
  UtensilsCrossed,
  Compass
} from 'lucide-react';

export const BottomNav = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close popover on route change
  useEffect(() => {
    setShowProfileMenu(false);
  }, [location.pathname, location.search]);

  // If no user is logged in, do not show bottom navigation
  if (!user) return null;

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/auth');
  };

  const role = user.role;

  // =====================================================
  // ROLE-SPECIFIC TAB DEFINITIONS
  // =====================================================
  
  const getActiveTab = () => {
    const path = location.pathname;
    const search = location.search;

    if (role === 'buyer') {
      if (path === '/' && !search.includes('map=true')) return 'home';
      if (path === '/orders') return 'orders';
      if (path === '/' && search.includes('map=true')) return 'explore';
      if (path === '/favorites') return 'saved';
      if (path === '/profile' || path === '/notifications') return 'profile';
      return '';
    }

    if (role === 'seller') {
      if (path === '/seller-dashboard' && !search.includes('tab=orders') && !search.includes('add=true')) return 'dashboard';
      if (path === '/seller-dashboard' && search.includes('tab=orders')) return 'orders';
      if (path === '/seller-dashboard' && search.includes('add=true')) return 'add';
      if (path === '/seller-analytics') return 'analytics';
      if (path === '/profile' || path === '/notifications') return 'profile';
      return '';
    }

    if (role === 'admin') {
      if (path === '/admin' && !search.includes('tab=')) return 'dashboard';
      if (path === '/admin' && search.includes('tab=users')) return 'users';
      if (path === '/admin' && search.includes('tab=registrations')) return 'verify';
      if (path === '/admin' && search.includes('tab=reports')) return 'reports';
      if (path === '/profile') return 'settings';
      return '';
    }

    return '';
  };

  const activeTab = getActiveTab();

  // =====================================================
  // TAB RENDERING HELPERS
  // =====================================================

  const NavTab = ({ to, icon: Icon, label, tabKey, color = 'primary', onClick = null }) => {
    const isActive = activeTab === tabKey;
    const colorMap = {
      primary: { text: 'text-primary-500', glow: 'bg-primary-500 shadow-[0_0_10px_#FF6B35]' },
      secondary: { text: 'text-secondary-500', glow: 'bg-secondary-500 shadow-[0_0_10px_#2EC4B6]' },
      tertiary: { text: 'text-tertiary-500', glow: 'bg-tertiary-500 shadow-[0_0_10px_#FFBF69]' },
      rose: { text: 'text-rose-400', glow: 'bg-rose-400 shadow-[0_0_10px_#fb7185]' },
    };
    const c = colorMap[color] || colorMap.primary;

    const content = (
      <>
        <Icon size={20} className="transition-transform group-active:scale-90" />
        <span className="text-[9px] font-black uppercase tracking-wider mt-1">{label}</span>
        {isActive && (
          <div className={`absolute top-[-10px] w-8 h-1 rounded-full ${c.glow}`} />
        )}
      </>
    );

    if (onClick) {
      return (
        <button
          onClick={onClick}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group cursor-pointer ${
            isActive ? c.text : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {content}
        </button>
      );
    }

    return (
      <Link
        to={to}
        onClick={() => setShowProfileMenu(false)}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group ${
          isActive ? c.text : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        {content}
      </Link>
    );
  };

  const CenterFAB = ({ icon: Icon, label, onClick, gradientFrom = 'from-primary-500', gradientTo = 'to-primary-700' }) => (
    <button
      onClick={() => {
        setShowProfileMenu(false);
        onClick();
      }}
      className="flex flex-col items-center justify-center flex-1 py-1 text-gray-400 hover:text-gray-200 transition-all duration-200 relative group cursor-pointer"
    >
      <div className={`bg-gradient-to-tr ${gradientFrom} ${gradientTo} p-2.5 rounded-full text-slate-950 font-bold shadow-md shadow-primary-500/20 relative top-[-16px] border-[4px] border-[#0f111c] transition-transform group-active:scale-90 group-hover:scale-105`}>
        <Icon size={22} className="text-white" />
      </div>
      <span className="text-[9px] font-black uppercase tracking-wider absolute bottom-1 whitespace-nowrap">{label}</span>
    </button>
  );

  // =====================================================
  // POPOVER MENU ITEMS PER ROLE
  // =====================================================

  const renderPopoverMenu = () => {
    const menuItems = [];

    if (role === 'buyer') {
      menuItems.push(
        { to: '/profile', icon: User, label: 'Profile', color: 'text-primary-500' },
        { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-secondary-500' },
        { to: '/?showLedger=true', icon: Sparkles, label: 'Eco-Hero Ledger', color: 'text-amber-400', highlight: true },
        { to: '/profile', icon: Settings, label: 'Settings', color: 'text-gray-400' },
      );
    }

    if (role === 'seller') {
      menuItems.push(
        { to: '/profile', icon: User, label: 'Profile', color: 'text-primary-500' },
        { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-secondary-500' },
        { to: '/profile', icon: Star, label: 'Reviews', color: 'text-tertiary-500' },
        { to: '/profile', icon: UtensilsCrossed, label: 'Kitchen Settings', color: 'text-gray-400' },
      );
    }

    if (role === 'admin') {
      menuItems.push(
        { to: '/profile', icon: User, label: 'Profile', color: 'text-primary-500' },
        { to: '/admin?tab=reports', icon: Shield, label: 'Audit Log', color: 'text-secondary-500' },
        { to: '/admin', icon: Activity, label: 'System Health', color: 'text-tertiary-500' },
      );
    }

    return (
      <div className="absolute bottom-16 right-4 w-52 bg-[#16192b]/95 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col space-y-1 z-50 animate-slide-up">
        {menuItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.to}
            onClick={() => setShowProfileMenu(false)}
            className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              item.highlight
                ? `${item.color} bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10`
                : `text-gray-300 hover:text-white hover:bg-white/5`
            }`}
          >
            <item.icon size={15} className={item.highlight ? `${item.color} animate-pulse` : item.color} />
            <span>{item.label}</span>
          </Link>
        ))}
        
        {/* Divider */}
        <div className="border-t border-white/5 my-1" />
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition text-left cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    );
  };

  // =====================================================
  // BUYER NAV: Home | Orders | Explore (FAB) | Saved | Profile
  // =====================================================
  const renderBuyerNav = () => (
    <>
      <NavTab to="/" icon={Home} label="Home" tabKey="home" color="primary" />
      <NavTab to="/orders" icon={ShoppingBag} label="Orders" tabKey="orders" color="secondary" />
      <CenterFAB
        icon={Compass}
        label="Explore"
        gradientFrom="from-secondary-500"
        gradientTo="to-secondary-600"
        onClick={() => navigate('/?map=true')}
      />
      <NavTab to="/favorites" icon={Heart} label="Saved" tabKey="saved" color="tertiary" />
      <NavTab
        icon={User}
        label="Profile"
        tabKey="profile"
        color="primary"
        onClick={() => setShowProfileMenu(!showProfileMenu)}
      />
    </>
  );

  // =====================================================
  // SELLER NAV: Dashboard | Orders | Add Meal (FAB) | Analytics | Profile
  // =====================================================
  const renderSellerNav = () => (
    <>
      <NavTab to="/seller-dashboard" icon={LayoutDashboard} label="Dashboard" tabKey="dashboard" color="primary" />
      <NavTab to="/seller-dashboard?tab=orders" icon={ShoppingBag} label="Orders" tabKey="orders" color="secondary" />
      <CenterFAB
        icon={PlusCircle}
        label="Add Meal"
        gradientFrom="from-primary-500"
        gradientTo="to-primary-700"
        onClick={() => navigate('/seller-dashboard?add=true')}
      />
      <NavTab to="/seller-analytics" icon={BarChart3} label="Analytics" tabKey="analytics" color="tertiary" />
      <NavTab
        icon={User}
        label="Profile"
        tabKey="profile"
        color="primary"
        onClick={() => setShowProfileMenu(!showProfileMenu)}
      />
    </>
  );

  // =====================================================
  // ADMIN NAV: Dashboard | Users | Verify (FAB) | Reports | Settings
  // =====================================================
  const renderAdminNav = () => (
    <>
      <NavTab to="/admin" icon={BarChart3} label="Dashboard" tabKey="dashboard" color="primary" />
      <NavTab to="/admin?tab=users" icon={Users} label="Users" tabKey="users" color="secondary" />
      <CenterFAB
        icon={CheckCircle2}
        label="Verify"
        gradientFrom="from-secondary-500"
        gradientTo="to-secondary-600"
        onClick={() => navigate('/admin?tab=registrations')}
      />
      <NavTab to="/admin?tab=reports" icon={AlertTriangle} label="Reports" tabKey="reports" color="rose" />
      <NavTab
        icon={Settings}
        label="Settings"
        tabKey="settings"
        color="primary"
        onClick={() => setShowProfileMenu(!showProfileMenu)}
      />
    </>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f111c]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 shadow-[0_-10px_35px_rgba(0,0,0,0.6)]">
      
      {/* Popover Profile/Settings Menu */}
      {showProfileMenu && renderPopoverMenu()}

      {/* Backdrop overlay for popover */}
      {showProfileMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {/* Bottom Nav Links */}
      <div className="flex justify-around items-center h-12 relative z-50">
        {role === 'buyer' && renderBuyerNav()}
        {role === 'seller' && renderSellerNav()}
        {role === 'admin' && renderAdminNav()}
      </div>
    </div>
  );
};

export default BottomNav;
