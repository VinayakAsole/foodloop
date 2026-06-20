import { useState, Fragment, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../Logo';
import { 
  Home, 
  ShoppingBag, 
  User, 
  Bell, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Compass,
  LayoutDashboard,
  BarChart3,
  Sparkles,
  UserCheck,
  MapPin,
  Users,
  UserX,
  Gift,
  AlertCircle,
  ClipboardList,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const Navbar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'));

  useEffect(() => {
    const checkAdmin = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (location.pathname.startsWith('/admin')) {
        setAdminOpen(true);
      }
    };
    checkAdmin();
  }, [location.pathname]);

  const isAuthPage = location.pathname === '/auth';

  if (isAuthPage || !user) return null;

  const isActive = (path) => {
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      return location.pathname === pathname && location.search.includes(search);
    }
    if (path === '/') {
      return location.pathname === '/' && !location.search.includes('map=true') && !location.search.includes('showLedger=true');
    }
    return location.pathname === path;
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const navItems = [];
  if (user.role === 'buyer') {
    navItems.push({ label: 'Browse Food', path: '/', icon: Home });
    navItems.push({ label: 'Explore Map', path: '/?map=true', icon: Compass });
    navItems.push({ label: 'My Orders', path: '/orders', icon: ShoppingBag });
    navItems.push({ label: 'Eco Impact', path: '/?showLedger=true', icon: Sparkles });
  } else if (user.role === 'seller') {
    navItems.push({ label: 'Dashboard', path: '/seller-dashboard', icon: LayoutDashboard });
    navItems.push({ label: 'Orders', path: '/seller-dashboard?tab=orders', icon: ShoppingBag });
    navItems.push({ label: 'Analytics', path: '/seller-analytics', icon: BarChart3 });
  } else if (user.role === 'admin') {
    navItems.push({ 
      label: 'Admin Portal', 
      path: '/admin', 
      icon: ShieldAlert,
      subItems: [
        { label: 'Pending Approval', path: '/admin?tab=registrations', icon: UserCheck },
        { label: 'Location Changes', path: '/admin?tab=relocations', icon: MapPin },
        { label: 'All Users', path: '/admin?tab=users', icon: Users },
        { label: 'Trust Watchlist', path: '/admin?tab=watchlist', icon: UserX },
        { label: 'Analytics', path: '/admin?tab=analytics', icon: BarChart3 },
        { label: 'Coupons', path: '/admin?tab=coupons', icon: Gift },
        { label: 'Disputes', path: '/admin?tab=disputes', icon: AlertCircle },
        { label: 'Audit Log', path: '/admin?tab=audit', icon: ClipboardList },
        { label: 'Reports', path: '/admin?tab=reports', icon: FileText },
      ]
    });
  }
  navItems.push({ label: 'Profile', path: '/profile', icon: User });
  navItems.push({ label: 'Notifications', path: '/notifications', icon: Bell });

  return (
    <>
      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────────── */}
      <aside className={`hidden md:flex fixed top-0 left-0 bottom-0 bg-[#0b0c10]/60 backdrop-blur-xl border-r border-white/10 flex-col justify-between p-4 z-50 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="space-y-6">
          {/* Logo & Toggle Header */}
          <div className="flex items-center justify-center px-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="flex items-center space-x-2 hover:opacity-95 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none min-w-0"
            >
              <Logo showAi={!collapsed} iconSize="w-9 h-9" textSize={collapsed ? 'hidden' : 'text-xl'} />
            </button>
          </div>

          {/* User Profile Card */}
          {collapsed ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-center cursor-pointer" title={`${user.name || 'User'} (${user.role})`}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
                <User size={20} />
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
                <User size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-black text-white block truncate">{user.name || 'User'}</span>
                <span className="text-[9px] uppercase tracking-wider text-primary-500 font-extrabold px-1.5 py-0.5 bg-primary-500/15 border border-primary-500/20 rounded-md w-fit block mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Fragment key={item.path}>
                  {collapsed ? (
                    <Link
                      to={item.path}
                      onClick={() => {
                        if (item.subItems) setAdminOpen(!adminOpen);
                      }}
                      title={item.label}
                      className={`flex items-center justify-center p-3.5 rounded-2xl transition-all duration-300 border ${
                        active
                          ? 'text-primary-500 bg-primary-500/10 border-primary-500/20 shadow-md scale-105'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105 border-transparent'
                      }`}
                    >
                      <Icon size={20} />
                    </Link>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={() => {
                        if (item.subItems) setAdminOpen(!adminOpen);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                        active
                          ? 'text-primary-500 bg-primary-500/10 border border-primary-500/20 shadow-md translate-x-1'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-0.5'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </div>
                      {item.subItems && (
                        adminOpen ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />
                      )}
                    </Link>
                  )}

                  {/* Render subItems if they exist and sub-menu is toggled open */}
                  {item.subItems && adminOpen && (
                    <div className={`flex flex-col space-y-1 ${collapsed ? 'pl-0 mt-1 mb-3' : 'pl-6 border-l border-white/5 ml-6 mt-1 mb-2'}`}>
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subActive = isActive(subItem.path);
                        
                        if (collapsed) {
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              title={subItem.label}
                              className={`flex items-center justify-center p-2 rounded-xl transition-all duration-300 border ${
                                subActive
                                  ? 'text-primary-500 bg-primary-500/5 border-primary-500/10 shadow-sm scale-105'
                                  : 'text-gray-500 hover:text-white hover:bg-white/5 hover:scale-105 border-transparent'
                              }`}
                            >
                              <SubIcon size={16} />
                            </Link>
                          );
                        }
                        
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                              subActive
                                ? 'text-primary-500 bg-primary-500/5 border border-primary-500/10 shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <SubIcon size={14} />
                            <span>{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div>
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex items-center justify-center p-3.5 rounded-2xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── MOBILE TOP NAVBAR ─────────────────────────────────────────── */}
      <nav className="md:hidden sticky top-0 z-50 glass-panel border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to={user.role === 'seller' ? '/seller-dashboard' : '/'} className="flex items-center space-x-2 hover:opacity-95 transition-opacity">
            <Logo showAi={true} iconSize="w-8 h-8" textSize="text-lg" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col space-y-2 animate-fade-in">
            {/* Mobile User Tag */}
            <div className="px-4 py-2 flex items-center gap-3 bg-white/5 rounded-xl border border-white/5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
                <User size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">{user.name || 'User'}</span>
                <span className="text-[8px] uppercase tracking-wider text-primary-500 font-extrabold px-1 py-0.2 bg-primary-500/15 border border-primary-500/20 rounded-md w-fit block mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Fragment key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (item.subItems) {
                        setAdminOpen(!adminOpen);
                      } else {
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      active
                        ? 'text-primary-500 bg-primary-500/10 border border-primary-500/20'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                    {item.subItems && (
                      adminOpen ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    )}
                  </Link>
                  {item.subItems && adminOpen && (
                    <div className="flex flex-col space-y-1 pl-6 border-l border-white/5 ml-6 mb-2">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subActive = isActive(subItem.path);
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                              subActive
                                ? 'text-primary-500 bg-primary-500/5 border-primary-500/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <SubIcon size={14} />
                            <span>{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Fragment>
              );
            })}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
