import React from 'react';
import { CartItem, CurrencyCode } from '../types';
import { formatCurrency } from '../lib/currency';
import { ShoppingCart, Trash2, ArrowRight, ShieldCheck, ArrowLeft, Tag } from 'lucide-react';

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  onNavigate: (path: string) => void;
  currentCurrency?: CurrencyCode;
}

export const CartView: React.FC<CartViewProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onNavigate,
  currentCurrency = 'NGN',
}) => {
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = 35;
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-left space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/marketplace')}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-cyan-500" /> Shopping Cart ({cartItems.length} items)
          </h1>
        </div>

        <button
          onClick={() => onNavigate('/marketplace')}
          className="text-xs font-bold text-cyan-500 hover:underline"
        >
          Continue Shopping
        </button>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <ShoppingCart className="w-16 h-16 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Cart is Currently Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our catalog of inverter air conditioners, french door refrigerators, smart TVs, and solar power stations.
          </p>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="mt-4 px-6 py-3 bg-cyan-500 text-slate-950 font-extrabold text-xs rounded-xl hover:bg-cyan-400 transition-colors"
          >
            Explore Marketplace Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.product.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-4 items-center"
              >
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-100 dark:bg-slate-950 shrink-0"
                />

                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-bold text-cyan-500 uppercase">{item.product.brand}</span>
                  <h4 className="font-bold text-xs line-clamp-2 text-slate-900 dark:text-white">{item.product.title}</h4>
                  <div className="font-mono font-bold text-cyan-400 text-xs">
                    {formatCurrency(item.product.price, currency)}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-white"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs font-mono px-2 text-slate-900 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-white"
                  >
                    +
                  </button>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.product.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Remove item"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary Sidebar */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 h-fit text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Order Summary</h3>

            <div className="space-y-3 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Express Regional Logistics</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(deliveryFee, currency)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                <span>Total Due</span>
                <span className="text-cyan-500 font-mono">{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-sm rounded-xl hover:shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Protected by Paystack & WhatsApp Order Desk</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
