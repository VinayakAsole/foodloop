import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUserFavorites, removeFromFavorites } from '../../firebase/firestore';
import FoodCard from '../../components/FoodCard';
import { Heart, RefreshCw, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Favorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  // Convert favorite item format to food listing format for FoodCard compatibility
  const getFoodItem = (fav) => {
    return {
      id: fav.foodId || fav.id, // Detail page link needs the real foodId
      foodName: fav.foodName,
      description: fav.description,
      price: fav.price,
      isDonation: fav.isDonation,
      imageUrl: fav.imageUrl,
      category: fav.category,
      sellerId: fav.sellerId,
      sellerName: fav.sellerName,
      sellerTrustScore: fav.sellerTrustScore,
      location: fav.location,
      expiryTime: fav.expiryTime,
      remainingQuantity: fav.remainingQuantity
    };
  };

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      setLoading(prev => prev ? prev : true);
      try {
        const list = await getUserFavorites(user.uid);
        setFavorites(list);
      } catch (err) {
        console.error("Failed to load favorites:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleRemove = async (favId) => {
    if (!user) return;
    setRemovingId(favId);
    try {
      await removeFromFavorites(user.uid, favId);
      // Update local state
      setFavorites(prev => prev.filter(item => item.id !== favId));
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060709] pt-20 pb-24 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Heart className="text-primary-500 fill-primary-500/20" size={28} />
              Saved Meals
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Your curated list of delicious food saved for later
            </p>
          </div>

          {loading && (
            <RefreshCw size={18} className="animate-spin text-primary-500" />
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <RefreshCw size={36} className="animate-spin text-primary-500 mb-3" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading favorites...</p>
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => {
              const food = getFoodItem(fav);
              return (
                <div key={fav.id} className="relative group">
                  {/* Floating Remove Button over the card */}
                  <button
                    onClick={() => handleRemove(fav.id)}
                    disabled={removingId === fav.id}
                    className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-rose-500 hover:bg-rose-500 hover:text-white transition duration-200 cursor-pointer shadow-lg active:scale-90"
                    title="Remove from saved"
                  >
                    {removingId === fav.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Heart size={14} className="fill-current" />
                    )}
                  </button>

                  <FoodCard food={food} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="responsive-card p-12 sm:p-20 text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-12 shadow-2xl">
            <div className="p-4 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4 text-primary-500 animate-pulse">
              <Heart size={44} className="stroke-[1.5]" />
            </div>
            <h3 className="text-xl font-bold text-white">No saved meals yet</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
              Explore listings and click the heart icon on any meal to save it here for quick access later.
            </p>
            <Link
              to="/"
              className="mt-6 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-primary-500/20 flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag size={14} />
              Browse Menu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
