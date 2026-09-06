import React, { useState } from 'react';
import { CartItem, CurrencyCode } from '../types';
import { formatCurrency } from '../lib/currency';
import { X, ShoppingCart, Trash2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  currentCurrency?: CurrencyCode;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  currentCurrency = 'NGN',
}) => {
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingFee = cartItems.length > 0 ? 35 : 0;
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'NEXO2026' || couponCode.toUpperCase() === 'ECOSAVER') {
      setDiscountAmount(50);
      setCouponApplied(true);
    } else if (couponCode.trim()) {
      alert('Invalid promo code. Try "NEXO2026" or "ECOSAVER"');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between shadow-2xl text-left text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-500" />
            <h3 className="font-extrabold text-base">Your Cart ({cartItems.length})</h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto stroke-1" />
              <p className="font-bold text-sm">Your cart is empty</p>
              <p className="text-xs">Explore marketplace appliances & electronics to get started.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.product.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-3 text-xs">
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-xl shrink-0 bg-slate-200 dark:bg-slate-900"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-[10px] text-cyan-500">{item.product.brand}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.product.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Remove item from cart"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-bold line-clamp-1">{item.product.title}</h4>
                    <span className="font-mono font-bold text-cyan-400">{formatCurrency(item.product.price, currency)}</span>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-slate-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-0.5 font-bold hover:text-cyan-500"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-0.5 font-bold hover:text-cyan-500"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(item.product.price * item.quantity, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-4">
            
            {/* Coupon Code Form */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Promo Code (NEXO2026)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs uppercase font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700"
              >
                Apply
              </button>
            </form>

            {couponApplied && (
              <div className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Promo code applied: -{formatCurrency(50, currency)} Discount
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Express Appliance Delivery</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(shippingFee, currency)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-cyan-500">{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
