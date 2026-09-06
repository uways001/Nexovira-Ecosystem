import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAffiliateProfileFromFirestore } from '../lib/firestoreService';
import { ShieldCheck, UserCheck, ShieldAlert, ChevronDown, ChevronUp, Bug, LogOut, Sparkles } from 'lucide-react';

interface AuthDebugDiagnosticsProps {
  activeView: string;
}

export const AuthDebugDiagnostics: React.FC<AuthDebugDiagnosticsProps> = ({ activeView }) => {
  const { user, userProfile, isAdmin, isSeller, isAffiliate, loading, loginAsPresetUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAffiliateDoc, setHasAffiliateDoc] = useState<boolean | null>(null);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      getAffiliateProfileFromFirestore(user.uid)
        .then(aff => setHasAffiliateDoc(!!aff))
        .catch(() => setHasAffiliateDoc(false));
    } else {
      setHasAffiliateDoc(false);
    }
  }, [user?.uid]);

  const handleSwitch = async (role: 'admin' | 'seller' | 'affiliate' | 'customer') => {
    setSwitchingRole(role);
    try {
      await loginAsPresetUser(role);
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setSwitchingRole(null);
    }
  };

  // Show only in non-production or when explicitly toggled
  return (
    <div className="fixed bottom-4 left-4 z-50 text-xs font-mono">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all"
          title="Open Authentication Inspector"
        >
          <Bug className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[10px]">Auth Diagnostics</span>
          <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400' : 'bg-rose-500'}`} />
        </button>
      ) : (
        <div className="w-80 bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-3 backdrop-blur-xl text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
              <Bug className="w-4 h-4" />
              <span>NEXOVIRA Auth Inspector</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Auth status:</span>
              <span className={`font-bold ${user ? 'text-emerald-400' : 'text-rose-400'}`}>
                {loading ? 'Checking...' : user ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">User ID:</span>
              <span className="font-mono text-[10px] text-cyan-300 truncate max-w-[140px]">
                {user ? user.uid : 'null'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Session:</span>
              <span className="font-bold text-slate-200">
                {user ? 'PRESENT' : 'MISSING'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Profile:</span>
              <span className={`font-bold ${userProfile ? 'text-emerald-400' : 'text-amber-400'}`}>
                {userProfile ? 'FOUND' : 'MISSING'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Database Role:</span>
              <span className="font-extrabold uppercase text-cyan-400">
                {userProfile?.role || 'customer'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Affiliate Profile:</span>
              <span className={`font-bold ${hasAffiliateDoc ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasAffiliateDoc === null ? 'Checking...' : hasAffiliateDoc ? 'FOUND (affiliates/)' : 'MISSING'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Current Route:</span>
              <span className="font-bold text-amber-400">
                /{activeView}
              </span>
            </div>
          </div>

          {/* Instant Role Switcher */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Switch Test Persona</span>
              </span>
              {user && (
                <button
                  onClick={() => logout()}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" /> Logout
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => handleSwitch('admin')}
                disabled={switchingRole !== null}
                className={`px-2 py-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                  userProfile?.role === 'admin'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-200 font-bold'
                    : 'bg-slate-900 border-slate-800 hover:border-purple-500/40 text-slate-300'
                }`}
              >
                👑 Admin Master
              </button>
              <button
                onClick={() => handleSwitch('seller')}
                disabled={switchingRole !== null}
                className={`px-2 py-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                  userProfile?.role === 'seller'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold'
                    : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40 text-slate-300'
                }`}
              >
                🏪 Seller Store
              </button>
              <button
                onClick={() => handleSwitch('affiliate')}
                disabled={switchingRole !== null}
                className={`px-2 py-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                  userProfile?.role === 'affiliate'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold'
                    : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                🤝 Affiliate
              </button>
              <button
                onClick={() => handleSwitch('customer')}
                disabled={switchingRole !== null}
                className={`px-2 py-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                  userProfile?.role === 'customer'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-200 font-bold'
                    : 'bg-slate-900 border-slate-800 hover:border-blue-500/40 text-slate-300'
                }`}
              >
                🛍️ Shopper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
