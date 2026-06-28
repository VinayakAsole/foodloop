import { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Receipt
} from 'lucide-react';

export const PaymentGatewayModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  itemName, 
  quantity, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const [txnRefId] = useState(() => `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [upiMethod, setUpiMethod] = useState('qr'); // 'qr' | 'vpa'
  const [vpaAddress, setVpaAddress] = useState('');
  
  // Card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  // Processing States
  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
  const [loadingText, setLoadingText] = useState('Securing gateway connection...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (status === 'processing') {
      const timers = [
        setTimeout(() => setLoadingText('Contacting peer merchant bank...'), 1000),
        setTimeout(() => setLoadingText('Authenticating tokenized handshake...'), 2200),
        setTimeout(() => setLoadingText('Authorizing escrow transaction ledger...'), 3400),
        setTimeout(() => {
          // 85% success rate for mock payments
          const isSuccessful = Math.random() > 0.15;
          if (isSuccessful) {
            setStatus('success');
            setTimeout(() => {
              if (onPaymentSuccess) onPaymentSuccess();
            }, 1800);
          } else {
            setStatus('failed');
            setErrorMessage('Insufficient balance or gateway timeout. Please retry.');
            if (onPaymentError) onPaymentError('Gateway payment failed.');
          }
        }, 4600)
      ];

      return () => timers.forEach(clearTimeout);
    }
  }, [status, onPaymentSuccess, onPaymentError]);

  if (!isOpen) return null;

  const handlePay = (e) => {
    e.preventDefault();
    if (paymentMethod === 'upi' && upiMethod === 'vpa' && !vpaAddress.includes('@')) {
      alert('Please enter a valid VPA Address (e.g. user@okhdfc)');
      return;
    }
    if (paymentMethod === 'card' && (cardNumber.replace(/\s/g, '').length < 16 || cardCvv.length < 3)) {
      alert('Please enter a complete 16-digit card number and 3-digit CVV.');
      return;
    }
    setStatus('processing');
  };

  const handleMockFailure = () => {
    setStatus('processing');
    // Force a failure
    setTimeout(() => {
      setStatus('failed');
      setErrorMessage('Mock simulation: Transaction declined by card issuer.');
    }, 1500);
  };

  // Format Card Number with Spaces
  const handleCardNumberChange = (e) => {
    const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(v);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div 
        className="absolute inset-0 bg-[#090a0f]/40 pointer-events-none" 
        onClick={() => status !== 'processing' && status !== 'success' && onClose()}
      />
      
      <div className="relative w-full max-w-lg glass-panel border border-[#00F5FF]/20 rounded-[2.5rem] p-6 shadow-[0_0_50px_rgba(0,245,255,0.1)] overflow-hidden animate-scale-up z-10 bg-[#0b0c10]/90">
        
        {/* Neon decorative mesh grids */}
        <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-br from-[#00F5FF]/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-gradient-to-tr from-primary-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#00F5FF]/10 border border-[#00F5FF]/20 p-2.5 rounded-2xl text-[#00F5FF] shrink-0">
              <Receipt size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">FoodLoop Pay Gateway</h3>
              <p className="text-[10px] text-[#00F5FF] font-semibold tracking-wider uppercase">Secure peer-to-peer escrow</p>
            </div>
          </div>
          {status !== 'processing' && status !== 'success' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 border border-white/5 transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Processing State */}
        {status === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-[#00F5FF]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#00F5FF] rounded-full animate-spin"></div>
              <div className="absolute inset-2 bg-[#00F5FF]/5 rounded-full flex items-center justify-center">
                <ShieldCheck size={28} className="text-[#00F5FF] animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Authorizing Payment...</h4>
              <p className="text-xs text-gray-400 font-mono animate-pulse">{loadingText}</p>
            </div>
            <div className="text-[10px] text-gray-500 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span>🔒 256-bit SSL encrypted transit</span>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-full text-emerald-400 animate-bounce">
              <CheckCircle2 size={54} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-white">Transaction Complete!</h4>
              <p className="text-xs text-gray-400 max-w-xs">
                ₹{amount} for {quantity} portions of {itemName} has been securely authorized.
              </p>
            </div>
            <div className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-2xl font-mono">
              Ref ID: {txnRefId}
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-full text-rose-400 animate-pulse">
              <AlertTriangle size={50} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white">Payment Declined</h4>
              <p className="text-xs text-rose-300 max-w-xs bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl">
                {errorMessage}
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-sm pt-4">
              <button
                onClick={() => setStatus('idle')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 text-xs transition cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 font-bold rounded-full text-xs transition cursor-pointer"
              >
                Cancel Checkout
              </button>
            </div>
          </div>
        )}

        {/* Normal Form UI (Idle) */}
        {status === 'idle' && (
          <form onSubmit={handlePay} className="space-y-5 animate-fade-in">
            
            {/* Order Brief */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Item Details</span>
                <span className="text-white font-extrabold">{itemName}</span>
                <span className="text-gray-400 text-xs block">{quantity} x Plates</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Amount Due</span>
                <span className="text-xl font-black text-[#00F5FF]">₹{amount}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-[#00F5FF] bg-[#00F5FF]/10 text-white'
                    : 'border-white/5 bg-white/3 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <QrCode size={16} />
                <span>UPI Pay</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-[#00F5FF] bg-[#00F5FF]/10 text-white'
                    : 'border-white/5 bg-white/3 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <CreditCard size={16} />
                <span>Credit/Debit</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'netbanking'
                    ? 'border-[#00F5FF] bg-[#00F5FF]/10 text-white'
                    : 'border-white/5 bg-white/3 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone size={16} />
                <span>Net Banking</span>
              </button>
            </div>

            {/* UPI Payment panel */}
            {paymentMethod === 'upi' && (
              <div className="space-y-4 bg-white/2 border border-white/5 p-4 rounded-2xl animate-slide-in">
                <div className="flex justify-center gap-4 text-xs border-b border-white/5 pb-3">
                  <button
                    type="button"
                    onClick={() => setUpiMethod('qr')}
                    className={`pb-1 px-1 border-b-2 font-bold transition ${
                      upiMethod === 'qr' ? 'border-[#00F5FF] text-white' : 'border-transparent text-gray-500'
                    }`}
                  >
                    Scan QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMethod('vpa')}
                    className={`pb-1 px-1 border-b-2 font-bold transition ${
                      upiMethod === 'vpa' ? 'border-[#00F5FF] text-white' : 'border-transparent text-gray-500'
                    }`}
                  >
                    Enter UPI ID
                  </button>
                </div>

                {upiMethod === 'qr' ? (
                  <div className="flex flex-col items-center justify-center py-2 space-y-3">
                    <div className="relative p-3 bg-white rounded-2xl border-4 border-[#00F5FF]/30 shadow-lg shadow-[#00F5FF]/5 animate-pulse">
                      {/* Fake QR code SVG */}
                      <svg width="120" height="120" viewBox="0 0 24 24" className="text-slate-900 fill-current">
                        <path d="M3 3h6v6H3zm2 2v2h2V5zm8-2h6v6h-6zm2 2v2h2V5zM3 15h6v6H3zm2 2v2h2v-2zm13-2h2v2h-2zm-3 2h2v2h-2zm3 2h2v2h-2zm-3 2h2v2h-2zm-4-4h2v2h-2zm2-2h2v2h-2zm-2-2h2v2h-2zm8 0h2v2h-2z" />
                      </svg>
                      {/* Holographic scanner line overlay */}
                      <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 top-1/2 animate-bounce shadow-[0_0_8px_#22d3ee]"></div>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center max-w-xs">
                      Scan QR using GPay, PhonePe, Paytm, or BHIM. The system will auto-detect authorization.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Virtual Payment Address (VPA)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. mobileNumber@upi, username@paytm"
                      value={vpaAddress}
                      onChange={(e) => setVpaAddress(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 focus:border-[#00F5FF] rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Credit Card panel */}
            {paymentMethod === 'card' && (
              <div className="space-y-3 bg-white/2 border border-white/5 p-4 rounded-2xl animate-slide-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#00F5FF] rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength="19"
                    placeholder="4532 7182 9381 0021"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#00F5FF] rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Expiry MM/YY</label>
                    <input
                      type="text"
                      required
                      maxLength="5"
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                        setCardExpiry(val);
                      }}
                      className="w-full bg-black/40 border border-white/10 focus:border-[#00F5FF] rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none text-xs font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Secure CVV</label>
                    <input
                      type="password"
                      required
                      maxLength="3"
                      placeholder="***"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-black/40 border border-white/10 focus:border-[#00F5FF] rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net banking panel */}
            {paymentMethod === 'netbanking' && (
              <div className="space-y-2 bg-white/2 border border-white/5 p-4 rounded-2xl animate-slide-in">
                <label className="text-[10px] font-bold uppercase text-gray-400">Select Banking Institution</label>
                <select 
                  required
                  className="w-full bg-black/40 border border-white/10 focus:border-[#00F5FF] rounded-xl p-3 text-white focus:outline-none text-xs cursor-pointer"
                >
                  <option value="sbi">State Bank of India</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleMockFailure}
                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/15 font-bold rounded-xl text-xs transition cursor-pointer text-center"
              >
                Decline Test
              </button>
              
              <button
                type="submit"
                className="flex-[2] py-3 bg-gradient-to-r from-primary-500 to-[#00F5FF] hover:from-primary-600 hover:to-cyan-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00F5FF]/10 hover:scale-[1.01]"
              >
                <span>Authorize Payment ₹{amount}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="text-[10px] text-gray-500 text-center font-mono pt-1">
              FoodLoop P2P Escrow holds funds securely until OTP handoff.
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default PaymentGatewayModal;
