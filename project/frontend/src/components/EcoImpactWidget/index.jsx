import React, { useState, useEffect } from 'react';
import { Leaf, Award, Compass, Heart, Share2, Sparkles, X, Trophy } from 'lucide-react';
import { getBuyerOrders } from '../../firebase/firestore';

export const EcoImpactWidget = ({ userId, userName }) => {
  const [completedPlates, setCompletedPlates] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchImpact = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const orders = await getBuyerOrders(userId);
        const completed = orders.filter(o => o.status === 'completed');
        const platesCount = completed.reduce((acc, order) => acc + (order.quantity || 0), 0);
        setCompletedPlates(platesCount);
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
          <div className="h-16 bg-white/10 rounded"></div>
          <div className="h-16 bg-white/10 rounded"></div>
          <div className="h-16 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  // Constants for calculations
  const CO2_PER_MEAL = 2.5; // kg of CO2 emissions prevented per rescued meal
  const WATER_PER_MEAL = 150; // Liters of water preserved per rescued meal

  const co2Saved = (completedPlates * CO2_PER_MEAL).toFixed(1);
  const waterSaved = completedPlates * WATER_PER_MEAL;
  const treeDays = Math.round(co2Saved / 0.06); // 1 mature tree absorbs ~60g CO2 per day

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
  const RankIcon = rank.icon;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/60 shadow-xl relative overflow-hidden">
      
      {/* Dynamic Ambient Glow behind Badge */}
      <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-10 bg-gradient-to-br from-primary-500 to-secondary-500`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
        
        {/* Left Side: Stats & Level */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-primary-500 bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
              Eco-Hero Ledger
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Trophy size={11} className="text-secondary-500" />
              {completedPlates} saved plates
            </span>
          </div>

          <div>
            <h2 className="text-xl font-black text-white leading-tight">Your Environmental Impact</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Every plate rescued from home cooks directly decreases greenhouse gases and conserves clean water resources.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block">CO₂ Avoided</span>
              <span className="text-base font-black text-emerald-400">{co2Saved} kg</span>
            </div>
            <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block">Water Preserved</span>
              <span className="text-base font-black text-blue-400">{waterSaved} L</span>
            </div>
            <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block">Equivalent Tree Days</span>
              <span className="text-base font-black text-secondary-500">{treeDays} days</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tier Display & Action */}
        <div className="w-full md:w-64 flex flex-col items-center justify-center p-4 bg-white/3 border border-white/5 rounded-2xl text-center relative">
          
          <div className={`p-4 ${rank.bg} ${rank.border} rounded-2xl shadow-lg ${rank.glow} mb-2.5 flex items-center justify-center relative group`}>
            <RankIcon size={30} className={`${rank.color} transition-transform group-hover:scale-110`} />
            <Sparkles size={12} className="absolute -top-1.5 -right-1.5 text-secondary-500 animate-pulse" />
          </div>

          <span className={`text-base font-black tracking-wide ${rank.color}`}>{rank.name}</span>
          <span className="text-[10px] text-gray-500 mt-0.5">{rank.description}</span>

          {/* Progress to next milestone */}
          {completedPlates < 9 && (
            <div className="w-full mt-3 space-y-1">
              <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase">
                <span>Milestone progress</span>
                <span>{completedPlates} / {rank.nextMilestone}</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-secondary-500`}
                  style={{ width: `${rank.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="mt-3.5 w-full py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5"
          >
            <Share2 size={11} />
            Share Impact
          </button>
        </div>

      </div>

      {/* Share Impact Card Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setShowShareModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col items-center">
            
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <span className="text-[10px] text-primary-500 font-black tracking-widest uppercase mb-1">Impact Certificate</span>
            <h3 className="text-sm font-bold text-white mb-5 text-center">Show your sustainability achievements!</h3>

            {/* Sharing Poster Graphic */}
            <div className="w-full bg-gradient-to-b from-slate-950 to-slate-900 border border-white/15 p-6 rounded-2xl text-center space-y-5 relative shadow-inner">
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_100%)]" />
              
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <span className="text-lg font-black tracking-tighter text-white">FoodLoop</span>
                  <span className="text-[7px] text-gray-500 uppercase tracking-widest block -mt-1">Eco Impact Ledger</span>
                </div>
                <div className={`px-2.5 py-1 text-[8px] font-black rounded-lg uppercase ${rank.bg} ${rank.border} ${rank.color}`}>
                  {rank.name}
                </div>
              </div>

              <div className="py-2 flex flex-col items-center justify-center">
                <div className={`p-4 ${rank.bg} ${rank.border} rounded-2xl shadow-md inline-flex mb-2`}>
                  <RankIcon size={36} className={rank.color} />
                </div>
                <h4 className="text-base font-black text-white">{userName || 'Food Saver'}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Verified Zero-Waste Contributor</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-b border-white/5 py-4 my-2 text-left">
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black block">Carbon Offset</span>
                  <span className="text-lg font-black text-emerald-400">{co2Saved} kg CO₂</span>
                  <span className="text-[8px] text-gray-500 block">Emissions Prevented</span>
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase font-black block">Rescued Meals</span>
                  <span className="text-lg font-black text-secondary-500">{completedPlates} plates</span>
                  <span className="text-[8px] text-gray-500 block">From Local Home Cooks</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[8px] text-gray-500">
                <span>Preserved {waterSaved}L of clean water</span>
                <span className="font-mono">{new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full grid grid-cols-2 gap-3 mt-5">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`I'm officially a ${rank.name} on FoodLoop! 🌎 I saved ${completedPlates} plates of homemade food, preventing ${co2Saved} kg of CO2 emissions. Join me in wiping out food waste!`);
                  alert("Copied share message to clipboard!");
                }}
                className="py-2.5 bg-primary-500 hover:bg-primary-600 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Copy Share Text
              </button>
              <button 
                onClick={() => {
                  alert("Certificate graphic downloading... (mocked local save)");
                  setShowShareModal(false);
                }}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-xs transition"
              >
                Download Card
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default EcoImpactWidget;
