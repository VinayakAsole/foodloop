import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { verifyOrderPickup } from '../../firebase/firestore';
import confetti from 'canvas-confetti';

export const OTPModal = ({ order, sellerId, onClose, onSuccess }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input box
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Focus previous input box on backspace
    if (e.key === 'Backspace' && e.target.previousSibling && otp[index] === '') {
      e.target.previousSibling.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyOrderPickup(order.id, sellerId, otpCode);
      setSuccess(true);
      
      // Trigger canvas-confetti with Stitch design system colors!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF6B35', '#2EC4B6', '#FFBF69', '#ffffff']
      });

      setTimeout(() => {
        onSuccess(order.id);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md glass-panel border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 overflow-hidden animate-scale-up">
        {/* Success overlay */}
        {success && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
            <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-full text-primary-500 mb-4 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Handoff Verified!</h3>
            <p className="text-sm text-gray-400">The order has been marked as Completed. Good job reducing food waste!</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-primary-500/10 border border-primary-500/20 p-3 rounded-full text-primary-500 mb-3">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-lg font-bold text-white">Verify Order Pickup</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Ask the buyer for the 6-digit secure OTP code shown on their order tracking screen.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                name="otp"
                maxLength="1"
                className="w-12 h-12 text-center text-xl font-bold rounded-lg border border-white/10 bg-white/5 text-white focus:border-primary-500 focus:bg-primary-500/5 focus:outline-none transition-all"
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/5 border border-rose-500/10 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-between items-center text-xs text-gray-400 border-t border-white/5 pt-4">
            <span>Customer: <strong className="text-white">{order.buyerName}</strong></span>
            <span>Food: <strong className="text-white">{order.foodName}</strong></span>
          </div>

          <button
            type="submit"
            disabled={loading || otp.includes('')}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-500/10"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <span>Confirm Handoff</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OTPModal;
