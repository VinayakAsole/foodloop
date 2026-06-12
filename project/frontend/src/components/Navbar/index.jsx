import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, 
  ShoppingBag, 
  User, 
  Bell, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  ChefHat 
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  
  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const navItems = [];
  if (user) {
    if (user.role === 'buyer') {
      navItems.push({ label: 'Browse Food', path: '/', icon: Home });
      navItems.push({ label: 'My Orders', path: '/orders', icon: ShoppingBag });
    } else if (user.role === 'seller') {
      navItems.push({ label: 'Seller Panel', path: '/seller-dashboard', icon: ChefHat });
    } else if (user.role === 'admin') {
      navItems.push({ label: 'Admin Portal', path: '/admin', icon: ShieldAlert });
    }
    navItems.push({ label: 'Profile', path: '/profile', icon: User });
    navItems.push({ label: 'Notifications', path: '/notifications', icon: Bell });
  }

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to={user?.role === 'seller' ? '/seller-dashboard' : '/'} className="flex items-center space-x-2">
          <div className="bg-gradient-to-tr from-primary-500 to-primary-700 p-2 rounded-xl text-slate-950 font-bold shadow-md shadow-primary-500/20">
            <ChefHat size={22} className="text-white animate-pulse" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary-500 to-primary-100 bg-clip-text text-transparent">
            FoodLoop<span className="text-white text-xs font-semibold ml-1 px-1.5 py-0.5 bg-primary-500/10 rounded-full border border-primary-500/20">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'text-primary-500 bg-primary-500/10 border border-primary-500/20'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 transition-all duration-200"
            >
              Login / Register
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col space-y-2 animate-fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  isActive(item.path)
                    ? 'text-primary-500 bg-primary-500/10 border border-primary-500/20'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-base font-semibold"
            >
              Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
