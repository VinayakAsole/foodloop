import { useState } from 'react';
import { ChefHat, Flame, Zap, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { updateKitchenStatus } from '../../firebase/firestore';
import { simulateLocalNotification } from '../../firebase/messaging';

export const KitchenToggle = ({ sellerId, currentStatus = 'ready', onChange }) => {
  const [updating, setUpdating] = useState(false);
  const [activeStatus, setActiveStatus] = useState(currentStatus);

  const statuses = [
    { 
      value: 'ready', 
      label: 'Ready / Open', 
      badge: '🟢 Open to Serve',
      color: 'bg-emerald-500', 
      text: 'text-emerald-400', 
      border: 'border-emerald-500/30', 
      bg: 'bg-emerald-500/10',
      icon: CheckCircle2 
    },
    { 
      value: 'cooking', 
      label: 'Cooking Fresh', 
      badge: '👨‍🍳 Preparing Meals',
      color: 'bg-amber-500', 
      text: 'text-amber-400', 
      border: 'border-amber-500/30', 
      bg: 'bg-amber-500/10',
      icon: Flame 
    },
    { 
      value: 'busy', 
      label: 'High Demand', 
      badge: '⚡ High Demand',
      color: 'bg-[#00F5FF]', 
      text: 'text-[#00F5FF]', 
      border: 'border-[#00F5FF]/30', 
      bg: 'bg-[#00F5FF]/10',
      icon: Zap 
    },
    { 
      value: 'sold_out', 
      label: 'Sold Out / Closed', 
      badge: '🔴 Sold Out Today',
      color: 'bg-rose-500', 
      text: 'text-rose-400', 
      border: 'border-rose-500/30', 
      bg: 'bg-rose-500/10',
      icon: XCircle 
    }
  ];

  const currentObj = statuses.find(s => s.value === (activeStatus || currentStatus)) || statuses[0];

  const handleToggle = async (statusValue) => {
    if (statusValue === activeStatus || updating) return;

    setUpdating(true);
    try {
      if (sellerId) {
        await updateKitchenStatus(sellerId, statusValue);
      }
      setActiveStatus(statusValue);
      if (onChange) {
        onChange(statusValue);
      }

      const updatedObj = statuses.find(s => s.value === statusValue);
      simulateLocalNotification(
        'Live Kitchen Status Updated',
        `Your kitchen is now set to "${updatedObj?.label}". Nearby buyers see this status live!`,
        'success'
      );
    } catch (error) {
      console.error("Failed to update kitchen status:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="responsive-card p-4.5 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl border border-white/10 relative overflow-hidden">
      {/* Live Kitchen Background Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${currentObj.bg} rounded-full blur-3xl pointer-events-none transition-all duration-500`}></div>

      {/* Header & Status Indicator */}
      <div className="flex items-center space-x-3.5">
        <div className={`p-3 rounded-2xl border ${currentObj.border} ${currentObj.bg} ${currentObj.text} shrink-0 relative`}>
          <ChefHat size={22} className={activeStatus === 'cooking' ? 'animate-bounce' : activeStatus === 'busy' ? 'animate-pulse' : ''} />
          <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${currentObj.color} animate-ping`} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-white text-sm">Live Kitchen Status</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentObj.bg} ${currentObj.text} ${currentObj.border}`}>
              {currentObj.badge}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium">Broadcast your live cooking availability instantly to buyers on the map.</p>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
        {statuses.map((s) => {
          const isSelected = (activeStatus || currentStatus) === s.value;
          const IconComp = s.icon;
          return (
            <button
              key={s.value}
              type="button"
              disabled={updating}
              onClick={() => handleToggle(s.value)}
              className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                isSelected
                  ? `${s.text} ${s.bg} ${s.border} shadow-lg shadow-black/40 scale-[1.02]`
                  : 'text-gray-400 bg-white/2 border-white/5 hover:text-white hover:bg-white/5 hover:border-white/10'
              }`}
            >
              {updating && isSelected ? (
                <RefreshCw size={14} className="animate-spin text-white" />
              ) : (
                <IconComp size={14} className={isSelected ? s.text : 'text-gray-500'} />
              )}
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenToggle;
