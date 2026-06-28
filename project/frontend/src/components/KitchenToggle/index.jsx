import { ChefHat } from 'lucide-react';
import { updateKitchenStatus } from '../../firebase/firestore';

export const KitchenToggle = ({ sellerId, currentStatus = 'ready', onStatusChange }) => {
  const statuses = [
    { value: 'ready', label: 'Ready', color: 'bg-secondary-500', text: 'text-secondary-500', border: 'border-secondary-500/20', hover: 'hover:bg-secondary-500/10' },
    { value: 'cooking', label: 'Cooking', color: 'bg-tertiary-500', text: 'text-tertiary-500', border: 'border-tertiary-500/20', hover: 'hover:bg-tertiary-500/10' },
    { value: 'sold_out', label: 'Sold Out', color: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/20', hover: 'hover:bg-rose-500/10' }
  ];

  const handleToggle = async (statusValue) => {
    try {
      await updateKitchenStatus(sellerId, statusValue);
      if (onStatusChange) {
        onStatusChange(statusValue);
      }
    } catch (error) {
      console.error("Failed to update kitchen status:", error);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-white/5 rounded-lg border border-white/10 text-primary-500">
          <ChefHat size={20} className={currentStatus === 'cooking' ? 'animate-spin' : ''} />
        </div>
        <div>
          <h3 className="font-bold text-white">Live Kitchen Status</h3>
          <p className="text-xs text-gray-400">Broadcast your availability instantly to nearby buyers</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 w-full md:w-auto">
        {statuses.map((s) => {
          const isSelected = currentStatus === s.value;
          return (
            <button
              key={s.value}
              onClick={() => handleToggle(s.value)}
              className={`flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                isSelected
                  ? `${s.text} bg-white/5 ${s.border} border-t-2 shadow-md shadow-black/30`
                  : `text-gray-400 bg-transparent border-transparent ${s.hover}`
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.color} ${isSelected ? 'animate-pulse' : 'opacity-60'}`} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenToggle;
