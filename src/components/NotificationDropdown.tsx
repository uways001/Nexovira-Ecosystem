import React, { useState, useEffect, useRef } from 'react';
import { PriceAlertNotification, CurrencyCode, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  TrendingDown, 
  CheckCheck, 
  ExternalLink, 
  ShoppingBag, 
  X, 
  Clock, 
  Sparkles,
  Zap,
  Tag
} from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import { 
  getUserPriceNotificationsFromFirestore, 
  markPriceNotificationAsRead 
} from '../lib/priceAlertService';

interface NotificationDropdownProps {
  currentCurrency?: CurrencyCode;
  onNavigate: (path: string) => void;
  onSelectProduct?: (productId: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  currentCurrency = 'NGN',
  onNavigate,
  onSelectProduct,
}) => {
  const { user } = useAuth();
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PriceAlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const notifs = await getUserPriceNotificationsFromFirestore(user.uid);
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  useEffect(() => {
    fetchNotifs();

    // Listen for custom price alert trigger events in real-time
    const handleTriggered = () => {
      fetchNotifs();
    };

    window.addEventListener('nexovira_price_alert_triggered', handleTriggered);
    window.addEventListener('nexovira_price_alerts_changed', handleTriggered);

    return () => {
      window.removeEventListener('nexovira_price_alert_triggered', handleTriggered);
      window.removeEventListener('nexovira_price_alerts_changed', handleTriggered);
    };
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    for (const notif of notifications.filter(n => !n.read)) {
      await markPriceNotificationAsRead(notif.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notif: PriceAlertNotification) => {
    if (!notif.read) {
      await markPriceNotificationAsRead(notif.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    setIsOpen(false);
    if (onSelectProduct) {
      onSelectProduct(notif.productId);
    } else {
      onNavigate(`/product/${notif.productId}`);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-700 dark:text-slate-200 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        aria-label="Price Alerts & Notifications"
        title="Price Drop Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B0F17] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Price Alerts & Updates
                </h4>
                <p className="text-[10px] text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} unread price drop alerts` : 'All alerts up to date'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Tag className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white">No Price Drop Alerts Yet</h5>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Click the bell icon on any product in the Marketplace to set your target budget threshold!
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    !notif.read ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                  }`}
                >
                  <img
                    src={notif.productImage}
                    alt={notif.productTitle}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover rounded-xl shrink-0 border border-slate-200 dark:border-slate-800 bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <TrendingDown className="w-3 h-3" /> Price Drop (-{notif.discountPercent}%)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate mt-1">
                      {notif.productTitle}
                    </h5>

                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-black text-xs text-emerald-500 font-mono">
                        {formatCurrency(notif.newPriceUSD, currency)}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through font-mono">
                        {formatCurrency(notif.oldPriceUSD, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/account');
              }}
              className="text-slate-600 dark:text-slate-300 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Manage Price Alerts</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/marketplace');
              }}
              className="text-cyan-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <span>Explore Marketplace</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
