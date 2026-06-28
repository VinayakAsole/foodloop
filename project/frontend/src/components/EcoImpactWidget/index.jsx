import { useState, useEffect } from 'react';
import { 
  Leaf, 
  Award, 
  Compass, 
  Heart, 
  Share2, 
  Sparkles, 
  X, 
  Trophy, 
  Info,
  Smartphone,
  Car,
  Bath,
  CheckCircle2,
  Calendar,
  Gift,
  Users
} from 'lucide-react';
import { getBuyerOrders, getGlobalCompletedPlatesCount } from '../../firebase/firestore';
import EcoTreeSvg from '../EcoTreeSvg';

// ── Interactive 3D Tilt Component ─────────────────────────────────────
const TiltCard = ({ children, className, themeStyle }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    // Limit rotation to max 12 degrees
    const rotateX = -(y / (box.height / 2)) * 12;
    const rotateY = (x / (box.width / 2)) * 12;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => setIsHovered(true);
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${className} transition-transform duration-200 ease-out`}
      style={{
        transform: isHovered 
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.03)` 
          : `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`,
        transformStyle: 'preserve-3d',
        ...themeStyle
      }}
    >
      <div style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </div>
  );
};

export const EcoImpactWidget = ({ userId, userName }) => {
  const [completedPlates, setCompletedPlates] = useState(0);
  const [communityPlates, setCommunityPlates] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [certificateTheme, setCertificateTheme] = useState('Eco'); // 'Eco' | 'Cyberpunk' | 'Cosmic'
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'equivalents'
  
  // Quests completion state
  const [quests, setQuests] = useState({
    breakfast: false,
    weekend: false,
    generous: false,
  });

  useEffect(() => {
    const fetchImpact = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        // Fetch user's completed orders
        const orders = await getBuyerOrders(userId);
        const completed = orders.filter(o => o.status === 'completed');
        const platesCount = completed.reduce((acc, order) => acc + (order.quantity || 0), 0);
        setCompletedPlates(platesCount);

        // Fetch global community completed plates
        const globalCount = await getGlobalCompletedPlatesCount();
        setCommunityPlates(globalCount);

        // Calculate quest criteria dynamically
        const hasBreakfast = completed.some(o => {
          const cat = (o.category || '').toLowerCase();
          const name = (o.foodName || '').toLowerCase();
          return cat.includes('breakfast') || 
                 name.includes('breakfast') || 
                 name.includes('idli') || 
                 name.includes('dosa') || 
                 name.includes('egg') || 
                 name.includes('pancake') || 
                 name.includes('poha') || 
                 name.includes('upma');
        });

        const hasWeekend = completed.some(o => {
          if (!o.createdAt) return false;
          const day = new Date(o.createdAt).getDay();
          return day === 0 || day === 6; // Sunday or Saturday
        });

        const hasGenerous = completed.some(o => {
          return o.isDonation === true || o.totalPrice === 0;
        });

        setQuests({
          breakfast: hasBreakfast,
          weekend: hasWeekend,
          generous: hasGenerous
        });

      } catch (err) {
        console.error('Failed to load eco metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-pulse flex flex-col space-y-3">
        <div className="h-4 bg-white/10 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded h-16"></div>
          <div className="bg-white/10 rounded h-16"></div>
          <div className="bg-white/10 rounded h-16"></div>
        </div>
      </div>
    );
  }

  // Environmental Constants
  const CO2_PER_MEAL = 2.5; // kg of CO2 prevented per meal
  const WATER_PER_MEAL = 150; // Liters of water saved per meal

  const co2Saved = (completedPlates * CO2_PER_MEAL).toFixed(1);
  const waterSaved = completedPlates * WATER_PER_MEAL;
  const treeDays = Math.round(co2Saved / 0.06); // ~60g CO2 absorbed by mature tree/day

  // Real-world Equivalent metrics
  const smartphoneCharges = Math.round(parseFloat(co2Saved) * 122); // 122 charges per kg CO2 saved
  const carKmSaved = (parseFloat(co2Saved) * 4).toFixed(1); // 4 km driven per kg CO2 saved
  const showerSessions = Math.round(waterSaved / 80); // ~80L per average 8-minute shower

  // Determine user rank and milestones
  const getRankDetails = (plates) => {
    if (plates >= 9) {
      return {
        name: "Forest Guardian",
        badge: "Forest Guardian",
        color: "text-primary-500",
        border: "border-primary-500/30",
        bg: "bg-primary-500/10",
        icon: Heart,
        glow: "shadow-primary-500/10",
        nextMilestone: 9,
        percent: 100,
        description: "Supreme protector of natural cooking resources! 🌲"
      };
    }
    if (plates >= 5) {
      return {
        name: "Eco Champion",
        badge: "Eco Champion",
        color: "text-amber-400",
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        icon: Compass,
        glow: "shadow-amber-500/10",
        nextMilestone: 9,
        percent: Math.round(((plates - 5) / 4) * 100),
        description: "Leading the community by rescuing local food! 🧭"
      };
    }
    if (plates >= 2) {
      return {
        name: "Sapling",
        badge: "Sapling",
        color: "text-teal-400",
        border: "border-teal-500/30",
        bg: "bg-teal-500/10",
        icon: Award,
        glow: "shadow-teal-500/10",
        nextMilestone: 5,
        percent: Math.round(((plates - 2) / 3) * 100),
        description: "Firmly rooted in sustainability and waste prevention. 🌱"
      };
    }
    return {
      name: "Seedling",
      badge: "Seedling",
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      icon: Leaf,
      glow: "shadow-emerald-500/10",
      nextMilestone: 2,
      percent: Math.round((plates / 2) * 100),
      description: "Just started the journey to carbon neutral meals. ☘️"
    };
  };

  const rank = getRankDetails(completedPlates);

  // Quest milestone tracking
  const completedQuestsCount = [quests.breakfast, quests.weekend, quests.generous].filter(Boolean).length;
  const isQuestMaster = completedQuestsCount === 3;

  // Global Community progress variables (Target: 500 plates)
  const COMMUNITY_TARGET = 500;
  const communityPercent = Math.min(Math.round((communityPlates / COMMUNITY_TARGET) * 100), 100);

  // Shared Certificate theme options
  const themeConfigs = {
    Eco: {
      bg: "bg-gradient-to-b from-[#072418] via-[#04160f] to-[#010906]",
      border: "border-emerald-500/30",
      glow: "shadow-[0_0_25px_rgba(16,185,129,0.2)]",
      badgeText: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      accent: "text-emerald-400",
      subAccent: "text-teal-300",
      title: "Bio-Preservation Certificate",
      style: {}
    },
    Cyberpunk: {
      bg: "bg-gradient-to-b from-[#1b0022] via-[#0d0012] to-[#050009]",
      border: "border-pink-500/30",
      glow: "shadow-[0_0_25px_rgba(236,72,153,0.25)]",
      badgeText: "text-pink-400 bg-pink-500/10 border-pink-500/20",
      accent: "text-pink-500",
      subAccent: "text-cyan-400",
      title: "Cyber-Eco Stewardship Ledger",
      style: {}
    },
    Cosmic: {
      bg: "bg-gradient-to-b from-[#0c0d21] via-[#050612] to-[#010206]",
      border: "border-purple-500/30",
      glow: "shadow-[0_0_25px_rgba(139,92,246,0.25)]",
      badgeText: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      accent: "text-purple-400",
      subAccent: "text-amber-400",
      title: "Cosmic Stewardship Passport",
      style: {}
    }
  };

  const selectedTheme = themeConfigs[certificateTheme] || themeConfigs.Eco;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/60 shadow-xl relative overflow-hidden space-y-6">
      
      {/* Ambient decorative lighting */}
      <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-10 bg-gradient-to-br from-primary-500 to-secondary-500 pointer-events-none" />

      {/* Main ledger grid */}
      <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
        
        {/* Left Stats & Subpanels */}
        <div className="space-y-5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-primary-500 bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
              Eco-Hero Ledger
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Trophy size={11} className="text-secondary-500" />
              {completedPlates} saved plates
            </span>
            {isQuestMaster && (
              <span className="text-[9px] text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shadow-md shadow-amber-500/5">
                <Sparkles size={10} /> Quest Master
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-black text-white leading-tight">Your Environmental Ledger</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Rescuing home cooked surplus prevents food waste from emitting greenhouse gases in landfills.
            </p>
          </div>

          {/* Tab selectors for Stats view */}
          <div className="flex border-b border-white/5 pb-1">
            <button
              onClick={() => setActiveTab('stats')}
              className={`pb-1.5 px-3 text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'stats' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Direct Stats
            </button>
            <button
              onClick={() => setActiveTab('equivalents')}
              className={`pb-1.5 px-3 text-xs font-black uppercase tracking-wider transition flex items-center gap-1 ${
                activeTab === 'equivalents' ? 'text-secondary-500 border-b-2 border-secondary-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Real-World Equivalents
            </button>
          </div>

          {activeTab === 'stats' ? (
            /* Stats Grid */
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl hover:bg-white/5 transition group relative">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block flex items-center gap-0.5">
                  CO₂ Saved <Info size={9} className="text-gray-600 group-hover:text-primary-500 transition" />
                </span>
                <span className="text-base font-black text-emerald-400">{co2Saved} kg</span>
                {/* Micro hover tooltip */}
                <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-900 border border-white/10 rounded-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition duration-200 z-30 shadow-xl text-[10px] text-gray-300">
                  Equivalent to driving <span className="text-emerald-400 font-bold">{carKmSaved} km</span> in a gas car!
                </div>
              </div>
              
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl hover:bg-white/5 transition group relative">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block flex items-center gap-0.5">
                  Water Saved <Info size={9} className="text-gray-600 group-hover:text-primary-500 transition" />
                </span>
                <span className="text-base font-black text-blue-400">{waterSaved} L</span>
                {/* Micro hover tooltip */}
                <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-900 border border-white/10 rounded-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition duration-200 z-30 shadow-xl text-[10px] text-gray-300">
                  Equivalent to <span className="text-blue-400 font-bold">{showerSessions}</span> average shower sessions!
                </div>
              </div>

              <div className="bg-white/3 border border-white/5 p-3 rounded-xl hover:bg-white/5 transition">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block">Tree Days</span>
                <span className="text-base font-black text-secondary-500">{treeDays} days</span>
              </div>
            </div>
          ) : (
            /* Equivalents visualization cards */
            <div className="grid grid-cols-3 gap-3 animate-fadeIn">
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
                  <Smartphone size={16} />
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-wider block">Smartphones</span>
                  <span className="text-sm font-black text-emerald-400">{smartphoneCharges} charges</span>
                </div>
              </div>

              <div className="bg-white/3 border border-white/5 p-3 rounded-xl flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                  <Car size={16} />
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-wider block">Car Offset</span>
                  <span className="text-sm font-black text-blue-400">{carKmSaved} km</span>
                </div>
              </div>

              <div className="bg-white/3 border border-white/5 p-3 rounded-xl flex items-center gap-2">
                <div className="p-2 bg-secondary-500/10 rounded-lg text-secondary-500 shrink-0">
                  <Bath size={16} />
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-wider block">Shower Sessions</span>
                  <span className="text-sm font-black text-secondary-500">{showerSessions} times</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Virtual Eco-Forest Growing Tree */}
        <div className="w-full md:w-64 flex flex-col items-center justify-center p-4 bg-white/3 border border-white/5 rounded-2xl text-center relative overflow-hidden">
          
          {/* Animated dynamic SVG growth badge */}
          <EcoTreeSvg stage={rank.badge} />

          <span className={`text-base font-black tracking-wide ${rank.color} mt-2`}>{rank.name}</span>
          <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">{rank.description}</span>

          {/* Progress to next rank */}
          {completedPlates < 9 && (
            <div className="w-full mt-3.5 space-y-1">
              <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase">
                <span>Next Milestone</span>
                <span>{completedPlates} / {rank.nextMilestone}</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-secondary-500 transition-all duration-500"
                  style={{ width: `${rank.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Share Trigger */}
          <button
            onClick={() => setShowShareModal(true)}
            className="mt-4 w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 size={12} />
            Share Passport
          </button>
        </div>
      </div>

      {/* ── Active Quests Panel ────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-5 relative z-10">
        <h3 className="text-[10px] text-primary-500 bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block mb-3.5">
          Active Weekly Quests
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Quest 1 */}
          <div className={`p-3 border rounded-xl flex items-start gap-2.5 transition ${
            quests.breakfast ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/3 border-white/5'
          }`}>
            <div className={`p-1.5 rounded-lg shrink-0 ${quests.breakfast ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
              <CheckCircle2 size={15} />
            </div>
            <div>
              <span className={`text-xs font-bold block ${quests.breakfast ? 'text-emerald-400 line-through' : 'text-white'}`}>
                🍳 Breakfast Savior
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5 block">
                Rescue any meal categorized as Breakfast.
              </span>
            </div>
          </div>

          {/* Quest 2 */}
          <div className={`p-3 border rounded-xl flex items-start gap-2.5 transition ${
            quests.weekend ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/3 border-white/5'
          }`}>
            <div className={`p-1.5 rounded-lg shrink-0 ${quests.weekend ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
              <Calendar size={15} />
            </div>
            <div>
              <span className={`text-xs font-bold block ${quests.weekend ? 'text-emerald-400 line-through' : 'text-white'}`}>
                📅 Weekend Warrior
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5 block">
                Complete a surplus food pickup on Sat or Sun.
              </span>
            </div>
          </div>

          {/* Quest 3 */}
          <div className={`p-3 border rounded-xl flex items-start gap-2.5 transition ${
            quests.generous ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/3 border-white/5'
          }`}>
            <div className={`p-1.5 rounded-lg shrink-0 ${quests.generous ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
              <Gift size={15} />
            </div>
            <div>
              <span className={`text-xs font-bold block ${quests.generous ? 'text-emerald-400 line-through' : 'text-white'}`}>
                🎁 Generous Hero
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5 block">
                Rescue a free surplus listing.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Community Shared Milestones ───────────────────────────────── */}
      <div className="border-t border-white/5 pt-5 relative z-10 space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-white flex items-center gap-1.5">
            <Users size={14} className="text-secondary-500" />
            <span>Community Shared Milestones</span>
          </h3>
          <span className="text-[10px] font-mono text-secondary-500 font-bold bg-secondary-500/10 border border-secondary-500/20 px-2 py-0.5 rounded">
            {communityPlates} / {COMMUNITY_TARGET} Plates
          </span>
        </div>
        
        <p className="text-[10px] text-gray-400 leading-normal max-w-xl">
          Global zero-waste goal: rescuing <span className="font-bold text-white">500 plates</span> across all kitchens. Every completed purchase counts!
        </p>

        {/* Milestone progress bar */}
        <div className="space-y-1">
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-secondary-500 to-primary-500 transition-all duration-700 relative"
              style={{ width: `${communityPercent}%` }}
            >
              <div className="absolute right-0 top-0 h-full w-2 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-gray-500 font-semibold uppercase font-mono">
            <span>Platform Launch</span>
            <span>{communityPercent}% towards 500 Plates target!</span>
          </div>
        </div>
      </div>

      {/* ── Customizable 3D Social Passports Modal ────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setShowShareModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col items-center z-10">
            
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <span className="text-[10px] text-primary-500 font-black tracking-widest uppercase mb-1">
              Share Impact Certificate
            </span>
            <h3 className="text-sm font-bold text-white mb-4 text-center">
              Personalize and share your zero-waste accomplishments!
            </h3>

            {/* Theme Selectors */}
            <div className="grid grid-cols-3 gap-2 w-full mb-5 text-[10px] font-black uppercase tracking-wider">
              <button
                onClick={() => setCertificateTheme('Eco')}
                className={`py-1.5 border rounded-lg transition ${
                  certificateTheme === 'Eco' 
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' 
                    : 'border-white/5 text-gray-400 hover:bg-white/5'
                }`}
              >
                Eco Green
              </button>
              <button
                onClick={() => setCertificateTheme('Cyberpunk')}
                className={`py-1.5 border rounded-lg transition ${
                  certificateTheme === 'Cyberpunk' 
                    ? 'border-pink-500 text-pink-400 bg-pink-500/10' 
                    : 'border-white/5 text-gray-400 hover:bg-white/5'
                }`}
              >
                Cyberpunk
              </button>
              <button
                onClick={() => setCertificateTheme('Cosmic')}
                className={`py-1.5 border rounded-lg transition ${
                  certificateTheme === 'Cosmic' 
                    ? 'border-purple-500 text-purple-400 bg-purple-500/10' 
                    : 'border-white/5 text-gray-400 hover:bg-white/5'
                }`}
              >
                Cosmic Dark
              </button>
            </div>

            {/* Immersive 3D Tilt Card Graphic */}
            <TiltCard 
              className={`w-full ${selectedTheme.bg} border ${selectedTheme.border} p-6 rounded-2xl text-center space-y-4 relative ${selectedTheme.glow}`}
            >
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_100%)]" />
              
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <span className="text-lg font-black tracking-tighter text-white">FoodLoop</span>
                  <span className="text-[7px] text-gray-500 uppercase tracking-widest block -mt-1">Eco-Ledger</span>
                </div>
                <div className={`px-2.5 py-1 text-[8px] font-black rounded-lg uppercase ${selectedTheme.badgeText}`}>
                  {rank.name}
                </div>
              </div>

              {/* Center graphic with growing SVG tree */}
              <div className="py-1 flex flex-col items-center justify-center">
                <EcoTreeSvg stage={rank.badge} />
                <h4 className="text-base font-black text-white mt-1">{userName || 'Food Saver'}</h4>
                <p className={`text-[10px] ${selectedTheme.subAccent} font-medium`}>Verified Carbon Neutral Contributor</p>
              </div>

              {/* Stats & Equivalents Grid */}
              <div className="grid grid-cols-2 gap-3 border-t border-b border-white/5 py-4 text-left">
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black block">Carbon Saved</span>
                  <span className={`text-lg font-black ${selectedTheme.accent}`}>{co2Saved} kg CO₂</span>
                  <span className="text-[7px] text-gray-500 block">🚗 {carKmSaved} km offset</span>
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black block">Rescued Meals</span>
                  <span className={`text-lg font-black ${selectedTheme.accent}`}>{completedPlates} plates</span>
                  <span className="text-[7px] text-gray-500 block">🚿 {showerSessions} showers saved</span>
                </div>
              </div>

              {/* Certificate footer with dynamic QR Code */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-left space-y-0.5">
                  <span className="text-[7px] text-gray-500 block">CERTIFICATION CODE</span>
                  <span className="text-[8px] font-mono text-gray-400">FL-{userId ? userId.slice(0, 8).toUpperCase() : 'ANONYMOUS'}</span>
                </div>
                
                {/* Free dynamic QR code showing verified profile link */}
                <div className="p-1 bg-white rounded-lg inline-flex shadow-lg relative group">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=50&50&data=https://foodloop.web.app/profile/${userId || 'guest'}&color=0f172a`} 
                    alt="Verify Status QR" 
                    className="w-10 h-10 object-contain"
                  />
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-950 border border-white/10 text-[7px] text-gray-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    Scan to Verify
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Actions */}
            <div className="w-full grid grid-cols-2 gap-3 mt-5">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`I'm officially a ${rank.name} on FoodLoop! 🌎 I saved ${completedPlates} plates of homemade food, preventing ${co2Saved} kg of CO2 emissions. Join me in wiping out food waste!`);
                  alert("Copied share message to clipboard!");
                }}
                className="py-2.5 bg-primary-500 hover:bg-primary-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Copy Share Text
              </button>
              <button 
                onClick={() => {
                  alert("Certificate passport saved to device! (Downloaded offline layout)");
                  setShowShareModal(false);
                }}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save to Device
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default EcoImpactWidget;
