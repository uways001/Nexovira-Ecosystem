import React, { useState, useEffect } from 'react';
import { Product, CurrencyCode, PriceAlert } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Sparkles, 
  TrendingDown, 
  ArrowRight, 
  DollarSign, 
  Mail, 
  Zap,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { formatCurrency, convertFromUSD, getCurrencyInfo } from '../lib/currency';
import { 
  createPriceAlertInFirestore, 
  getUserPriceAlertsFromFirestore, 
  deletePriceAlertFromFirestore,
  simulatePriceDropForProduct 
} from '../lib/priceAlertService';

interface SetPriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  currentCurrency?: CurrencyCode;
  onSignInRequired?: () => void;
}

export const SetPriceAlertModal: React.FC<SetPriceAlertModalProps> = ({
  isOpen,
  onClose,
  product,
  currentCurrency = 'NGN',
  onSignInRequired,
}) => {
  const { user, userProfile } = useAuth();
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const currencyInfo = getCurrencyInfo(currency);

  const currentPriceNative = convertFromUSD(product.price, currency);

  // Default target is 10% below current price
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [customTargetUSD, setCustomTargetUSD] = useState<number>(
    Math.round(product.price * 0.9)
  );
  const [targetInputNative, setTargetInputNative] = useState<string>(
    convertFromUSD(Math.round(product.price * 0.9), currency).toString()
  );

  const [existingAlert, setExistingAlert] = useState<PriceAlert | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Check if user already has an active alert on this product
  useEffect(() => {
    if (user && product) {
      getUserPriceAlertsFromFirestore(user.uid).then((alerts) => {
        const found = alerts.find((a) => a.productId === product.id && a.status === 'ACTIVE');
        if (found) {
          setExistingAlert(found);
          setCustomTargetUSD(found.targetPriceUSD);
          setTargetInputNative(convertFromUSD(found.targetPriceUSD, currency).toString());
          const calcDrop = Math.round(((product.price - found.targetPriceUSD) / product.price) * 100);
          if (calcDrop > 0) setDiscountPercent(calcDrop);
        }
      });
    }
  }, [user, product, currency]);

  if (!isOpen) return null;

  const handlePresetPercent = (pct: number) => {
    setDiscountPercent(pct);
    const newTargetUSD = Math.round(product.price * (1 - pct / 100));
    setCustomTargetUSD(newTargetUSD);
    setTargetInputNative(convertFromUSD(newTargetUSD, currency).toString());
    setErrorMsg('');
  };

  const handleNativeInputChange = (valStr: string) => {
    setTargetInputNative(valStr);
    const valNum = parseFloat(valStr);
    if (!isNaN(valNum) && valNum > 0) {
      // Calculate USD equivalent
      const approxUSD = Math.round(valNum / (currencyInfo.rateToUSD || 1));
      setCustomTargetUSD(approxUSD);
      const calcPct = Math.round(((product.price - approxUSD) / product.price) * 100);
      setDiscountPercent(calcPct > 0 ? calcPct : 0);
      setErrorMsg('');
    }
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onSignInRequired) onSignInRequired();
      return;
    }

    if (customTargetUSD >= product.price) {
      setErrorMsg(`Target price must be lower than the current price of ${formatCurrency(product.price, currency)}.`);
      return;
    }

    if (customTargetUSD <= 0) {
      setErrorMsg('Please enter a valid target price threshold.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const nativeAmount = parseFloat(targetInputNative) || convertFromUSD(customTargetUSD, currency);

      const saved = await createPriceAlertInFirestore({
        userId: user.uid,
        userEmail: user.email || 'customer@nexovira.com',
        userName: userProfile?.displayName || user.displayName || 'Valued Shopper',
        productId: product.id,
        productTitle: product.title,
        productImage: product.images[0] || '',
        productCategory: product.categoryId,
        initialPriceUSD: product.price,
        targetPriceUSD: customTargetUSD,
        currency,
        targetPriceNative: nativeAmount,
        status: 'ACTIVE',
        notes: `Notify when price drops by ${discountPercent}% or reaches ${formatCurrency(customTargetUSD, currency)}`,
      });

      setExistingAlert(saved);
      setSuccessMsg(`Target price alert set! We'll notify you the moment ${product.brand || 'this item'} drops to ${formatCurrency(customTargetUSD, currency)}.`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save price alert. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async () => {
    if (!existingAlert) return;
    setSubmitting(true);
    try {
      await deletePriceAlertFromFirestore(existingAlert.id);
      setExistingAlert(null);
      setSuccessMsg('Price alert successfully removed.');
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulatePriceDrop = async () => {
    if (!user) return;
    setIsSimulating(true);
    setErrorMsg('');
    try {
      const res = await simulatePriceDropForProduct(product, discountPercent || 15, user.uid, user.email || '');
      if (res.triggered) {
        setSuccessMsg(`Simulated price drop to ${formatCurrency(res.newPriceUSD, currency)}! Price drop notification dispatched to your notification center.`);
      } else {
        setSuccessMsg(`Simulated test run complete. Your target threshold is ${formatCurrency(customTargetUSD, currency)}.`);
      }
    } catch (err: any) {
      setErrorMsg('Simulation failed: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const potentialSavingsUSD = Math.max(0, product.price - customTargetUSD);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Set Target Price Alert</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Instant Trigger
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Get notified automatically when this item drops to your budget
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Product Snapshot Card */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <img
              src={product.images[0]}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-200 dark:border-slate-800 bg-white"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {product.title}
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                {product.brand} • {product.categoryId}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Current Price:</span>
                <span className="font-extrabold text-xs text-cyan-500">
                  {formatCurrency(product.price, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-400 flex items-start gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs font-bold text-red-400 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!user ? (
            /* Guest Prompt */
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Sign in to Activate Price Drop Tracking
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Registered shoppers receive real-time in-app alerts and notifications when prices drop below their target.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSignInRequired) onSignInRequired();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-lg hover:scale-105 transition-all inline-flex items-center gap-1.5"
              >
                <span>Sign In / Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Active Form */
            <form onSubmit={handleSaveAlert} className="space-y-4">
              {/* Quick Drop Percentage Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Choose Desired Discount Target:</span>
                  <span className="text-[11px] text-cyan-500 font-mono">-{discountPercent}% Target</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => handlePresetPercent(pct)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all border ${
                        discountPercent === pct
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Target Price Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Target Price in {currency} ({currencyInfo.symbol}):
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-slate-400 text-sm">
                    {currencyInfo.symbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={targetInputNative}
                    onChange={(e) => handleNativeInputChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="Enter your target price..."
                  />
                </div>
              </div>

              {/* Savings Breakdown Card */}
              <div className="p-3.5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Potential Savings</span>
                    <span className="font-extrabold text-xs text-emerald-400">
                      Save {formatCurrency(potentialSavingsUSD, currency)} ({discountPercent}%)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Threshold in USD</span>
                  <span className="font-mono font-bold text-xs text-slate-200">
                    ${customTargetUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  <span>{existingAlert ? 'Update Target Alert' : 'Set Price Drop Alert'}</span>
                </button>

                {existingAlert && (
                  <button
                    type="button"
                    onClick={handleDeleteAlert}
                    disabled={submitting}
                    className="py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Remove Alert"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              {/* Simulation Test Button for instant verification */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSimulatePriceDrop}
                  disabled={isSimulating}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSimulating ? 'Testing Trigger...' : '⚡ Test Trigger (Simulate Flash Price Drop)'}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-1">
                  Tests the real-time notification engine by firing a drop event immediately.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
