import React, { useState } from 'react';
import { CartItem, Order, CurrencyCode } from '../types';
import { formatCurrency, getCurrencyInfo } from '../lib/currency';
import { getLiveExchangeRate } from '../lib/exchangeRateService';
import { X, CheckCircle2, ShieldCheck, CreditCard, Lock, MessageSquare } from 'lucide-react';
import { 
  createOrderInFirestore, 
  createSellerNotificationInFirestore, 
  getAffiliateProfileByCodeFromFirestore,
  getAffiliateConfigFromFirestore,
  recordOrderFinancialSnapshotsInFirestore,
  recordSellerOrderEarningsInFirestore
} from '../lib/firestoreService';
import { calculateOrderFinancials } from '../lib/affiliateEngine';
import { useAuth } from '../context/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderSuccess: (order: Order) => void;
  currentCurrency?: CurrencyCode;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderSuccess,
  currentCurrency = 'NGN',
}) => {
  const { user, userProfile } = useAuth();
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Address State
  const [fullName, setFullName] = useState(userProfile?.displayName || user?.displayName || 'Amina Bello');
  const [email, setEmail] = useState(user?.email || 'amina.bello@example.com');
  const [street, setStreet] = useState('14 Admiralty Way, Victoria Island');
  const [city, setCity] = useState('Lagos');
  const [country, setCountry] = useState('Nigeria');
  const [phone, setPhone] = useState(userProfile?.phone || '+234 911 044 3054');
  const [paymentProvider, setPaymentProvider] = useState<'paystack' | 'whatsapp' | 'stripe'>('paystack');

  if (!isOpen) return null;

  const isAllDigital = cartItems.length > 0 && cartItems.every(
    (item) => item.product.isDigital || item.product.productType === 'digital_ebook'
  );
  const hasDigitalItem = cartItems.some(
    (item) => item.product.isDigital || item.product.productType === 'digital_ebook'
  );

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingFee = isAllDigital ? 0 : 35;
  const total = subtotal + shippingFee;

  const handleCompleteOrder = async () => {
    setIsProcessing(true);
    try {
      // 1. Validate Attribution Window & Get Ref Code
      const refCode = sessionStorage.getItem('nexovira_ref_code') || localStorage.getItem('nexovira_ref_code');
      const expiresAtStr = localStorage.getItem('nexovira_ref_expires_at');
      const isExpired = expiresAtStr && Date.now() > Number(expiresAtStr);
      const validRefCode = (refCode && !isExpired) ? refCode.trim().toUpperCase() : undefined;

      // 2. Fetch Affiliate Profile & Config
      let affiliateProfile = null;
      if (validRefCode) {
        affiliateProfile = await getAffiliateProfileByCodeFromFirestore(validRefCode);
      }
      const config = await getAffiliateConfigFromFirestore();

      // 3. Authoritative Financial Calculation
      const financials = calculateOrderFinancials(
        cartItems,
        config,
        affiliateProfile,
        user?.uid || null,
        email || null,
        shippingFee,
        0
      );

      const orderPayload: Partial<Order> = {
        customerId: user?.uid || 'guest-shopper',
        customerName: fullName,
        customerEmail: email,
        items: cartItems,
        subtotal: financials.subtotal,
        shippingFee: financials.shippingFee,
        discount: financials.discount,
        total: financials.totalPayable,
        currency: 'USD',
        status: 'Paid',
        paymentMethod: paymentProvider === 'whatsapp' ? 'WhatsApp Desk (+234 812 959 5134)' : 'Paystack Direct / Card',
        shippingAddress: {
          fullName,
          street,
          city,
          country,
          phone
        },
        affiliateId: financials.affiliateId,
        affiliateCode: financials.affiliateCode,
        selfReferral: financials.selfReferral
      };

      // Save order directly into Firestore
      const newOrder = await createOrderInFirestore(orderPayload);
      setCreatedOrder(newOrder);

      // Record permanent financial snapshots and commission records in order_financials, affiliate_commissions & seller_sales_earnings
      try {
        await recordOrderFinancialSnapshotsInFirestore(newOrder.id, financials);
        await recordSellerOrderEarningsInFirestore(newOrder, currency);
      } catch (affErr) {
        console.error('Financial record error:', affErr);
      }

      // Create Seller Order Notifications for each unique seller
      try {
        const sellerItemsMap: Record<string, { sellerName: string; itemTitles: string[] }> = {};
        cartItems.forEach((item) => {
          const sId = item.product.sellerId || 'nexovira-admin';
          if (!sellerItemsMap[sId]) {
            sellerItemsMap[sId] = { sellerName: item.product.sellerName || 'Seller', itemTitles: [] };
          }
          sellerItemsMap[sId].itemTitles.push(`${item.product.title} (x${item.quantity})`);
        });

        for (const [sellerId, data] of Object.entries(sellerItemsMap)) {
          await createSellerNotificationInFirestore({
            userId: sellerId,
            title: 'New Order Received',
            message: `Order #${newOrder.id.slice(0, 8)} placed for ${data.itemTitles.join(', ')} by ${fullName}.`,
            type: 'order',
            orderId: newOrder.id
          });
        }
      } catch (notifErr) {
        console.error('Seller notification error:', notifErr);
      }

      // Send to WhatsApp desk
      if (paymentProvider === 'whatsapp') {
        const liveRate = getLiveExchangeRate();
        const itemDetails = cartItems
          .map((item, i) => `${i + 1}. ${item.product.title} (x${item.quantity}) - ₦${Math.round(item.product.price * item.quantity * liveRate).toLocaleString()}`)
          .join('%0A');

        const msg = `Hello NEXOVIRA Support,%0A%0AI have placed an order on the platform!%0A%0A*Order Ref ID:* ${newOrder.id}%0A*Customer Name:* ${fullName}%0A*Phone:* ${phone}%0A*Delivery Address:* ${street}, ${city}, ${country}%0A%0A*Items Order:*%0A${itemDetails}%0A%0A*Total Amount:* ₦${Math.round(total * liveRate).toLocaleString()} ($${total} USD)%0A%0APlease confirm delivery details. Thank you!`;

        window.open(`https://wa.me/2348129595134?text=${msg}`, '_blank');
      }

      onOrderSuccess(newOrder);
      setStep(4);
    } catch (err) {
      console.error('Checkout creation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl my-8 relative text-left">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        {step < 4 && (
          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-slate-400">
            <span className={step >= 1 ? 'text-cyan-400' : ''}>1. Shipping</span>
            <span>&gt;</span>
            <span className={step >= 2 ? 'text-cyan-400' : ''}>2. Payment</span>
            <span>&gt;</span>
            <span className={step >= 3 ? 'text-cyan-400' : ''}>3. Review</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Shipping Address</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-sm"
            >
              Continue to Payment Method
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Select Payment Provider</h2>
            <div className="space-y-3 text-xs">
              <label
                onClick={() => setPaymentProvider('paystack')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${paymentProvider === 'paystack' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950'}`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="font-bold text-white text-sm">Paystack Instant Debit / Bank Transfer</p>
                    <p className="text-slate-400 text-[11px]">Instant automated NGN checkout for local Nigerian cards</p>
                  </div>
                </div>
                <input type="radio" checked={paymentProvider === 'paystack'} readOnly />
              </label>

              <label
                onClick={() => setPaymentProvider('whatsapp')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${paymentProvider === 'whatsapp' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950'}`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="font-bold text-white text-sm">Direct WhatsApp Order (+234 812 959 5134)</p>
                    <p className="text-slate-400 text-[11px]">Pre-filled WhatsApp message sent to Lagos dispatch team</p>
                  </div>
                </div>
                <input type="radio" checked={paymentProvider === 'whatsapp'} readOnly />
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-sm"
              >
                Review Order Summary
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Review & Confirm Order</h2>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>Subtotal ({cartItems.length} items):</span>
                <span>₦{Math.round(subtotal * getLiveExchangeRate()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-400">
                <span>Lagos Priority Delivery:</span>
                <span>₦{Math.round(shippingFee * getLiveExchangeRate()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-cyan-400 text-sm pt-2 border-t border-slate-800">
                <span>Total Payable:</span>
                <span>₦{Math.round(total * getLiveExchangeRate()).toLocaleString()} (${total.toFixed(2)} USD)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-slate-400">
              <p className="font-bold text-white">Recipient:</p>
              <p>{fullName} • {phone}</p>
              <p>{street}, {city}, {country}</p>
            </div>

            <button
              onClick={handleCompleteOrder}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Recording Order in Firestore...' : 'Place Real Order'}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white">Order Confirmed!</h2>
            <p className="text-slate-400 text-sm">
              Your order has been recorded in our Firestore database with Ref: <span className="text-cyan-400 font-bold">{createdOrder?.id || 'ORD-RECORDED'}</span>.
            </p>
            <p className="text-xs text-slate-500">
              Our Lagos fulfillment center is preparing your delivery.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
