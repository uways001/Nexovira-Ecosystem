import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  UserPlus, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Eye, 
  EyeOff, 
  HelpCircle, 
  Copy, 
  Check, 
  ShoppingBag, 
  Store, 
  Share2,
  Wrench 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NexoviraLogo } from './NexoviraLogo';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  detectMaliciousPayload, 
  sanitizeName, 
  sanitizeEmail, 
  sanitizePhone, 
  logSecurityThreatAttempt 
} from '../lib/sanitization';

interface SignUpViewProps {
  onNavigate: (path: string) => void;
  onSuccessRedirect?: string;
}

const SignUpViewContent: React.FC<SignUpViewProps> = ({ onNavigate, onSuccessRedirect }) => {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('email') || localStorage.getItem('nexovira_pending_auth_email') || '';
    }
    return '';
  });
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Public Role Selection State: Customer, Seller, Affiliate, Tech Expert
  const [selectedRole, setSelectedRole] = useState<'customer' | 'seller' | 'affiliate' | 'expert'>('customer');

  const [error, setError] = useState('');
  const [domainNotice, setDomainNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const formatAuthError = (err: any) => {
    const message = err?.message || String(err);
    if (message.includes('unauthorized-domain') || err?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'preview domain';
      setDomainNotice(currentHost);
      return `Firebase Domain Authorization: The current domain (${currentHost}) is not yet authorized in Firebase Console.`;
    }
    if (message.includes('operation-not-allowed') || err?.code === 'auth/operation-not-allowed') {
      return 'Email/Password Authentication is currently disabled in Firebase Console. Go to Firebase Console → Authentication → Sign-in method, select Email/Password, and enable it.';
    }
    if (message.includes('email-already-in-use')) {
      return 'An account with this email address already exists. Please sign in instead.';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDomainNotice(null);

    // 1. Security Threat Inspection for Injections (XSS, SQLi, NoSQLi, Null Bytes)
    const nameThreat = detectMaliciousPayload(name);
    if (nameThreat.isSuspicious) {
      logSecurityThreatAttempt('Sign Up Form', 'name', nameThreat, name);
      setError(`Security Protection: Suspicious characters blocked in Name (${nameThreat.threatType}).`);
      return;
    }

    const emailThreat = detectMaliciousPayload(email);
    if (emailThreat.isSuspicious) {
      logSecurityThreatAttempt('Sign Up Form', 'email', emailThreat, email);
      setError(`Security Protection: Suspicious payload blocked in Email (${emailThreat.threatType}).`);
      return;
    }

    if (phone) {
      const phoneThreat = detectMaliciousPayload(phone);
      if (phoneThreat.isSuspicious) {
        logSecurityThreatAttempt('Sign Up Form', 'phone', phoneThreat, phone);
        setError(`Security Protection: Suspicious characters blocked in Phone Number.`);
        return;
      }
    }

    // 2. Strict Input Field Sanitization & Validation
    const sanitizedNameResult = sanitizeName(name);
    if (!sanitizedNameResult.isValid) {
      setError(sanitizedNameResult.error || 'Please enter a valid full name.');
      return;
    }

    const sanitizedEmailResult = sanitizeEmail(email);
    if (!sanitizedEmailResult.isValid) {
      setError(sanitizedEmailResult.error || 'Please enter a valid email address.');
      return;
    }

    let sanitizedPhoneVal = '';
    if (phone.trim()) {
      const phoneResult = sanitizePhone(phone);
      if (!phoneResult.isValid) {
        setError(phoneResult.error || 'Please enter a valid phone number.');
        return;
      }
      sanitizedPhoneVal = phoneResult.sanitizedPhone;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await signUpWithEmail(
        sanitizedEmailResult.sanitizedEmail,
        password,
        sanitizedNameResult.sanitizedName,
        sanitizedPhoneVal,
        selectedRole
      );
      
      // STEP 1 & STEP 2 REQUIREMENT: Show "Account Created Successfully" then redirect to Sign In
      setRegisteredSuccess(true);
      setTimeout(() => {
        onNavigate('/signin');
      }, 2500);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setDomainNotice(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onNavigate(onSuccessRedirect || '/account');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#0B0F17]">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <NexoviraLogo size={42} showText={true} showTagline={true} taglineClassName="text-[10px] sm:text-xs font-semibold text-cyan-400 italic mt-0.5" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-2">Create NEXOVIRA Account</h1>
          <p className="text-slate-400 text-xs mt-1">Join Nigeria's flagship digital appliance & e-commerce platform</p>
        </div>

        {/* What are you joining NEXOVIRA as? */}
        <div className="mb-6 p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
          <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider text-center">
            What are you joining NEXOVIRA as?
          </label>
          
          <div className="space-y-2">
            {/* Customer Option */}
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedRole === 'customer'
                  ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 shrink-0">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Customer</span>
                  {selectedRole === 'customer' && (
                    <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  I want to shop, learn, discover digital products and use NEXOVIRA services.
                </div>
              </div>
            </button>

            {/* Seller Option */}
            <button
              type="button"
              onClick={() => setSelectedRole('seller')}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedRole === 'seller'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 shrink-0">
                <Store className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Seller</span>
                  {selectedRole === 'seller' && (
                    <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  I want to sell eligible products and manage my own store.
                </div>
              </div>
            </button>

            {/* Affiliate Option */}
            <button
              type="button"
              onClick={() => setSelectedRole('affiliate')}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedRole === 'affiliate'
                  ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 shrink-0">
                <Share2 className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Affiliate</span>
                  {selectedRole === 'affiliate' && (
                    <span className="text-[10px] text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  I want to promote eligible NEXOVIRA products and earn commissions.
                </div>
              </div>
            </button>

            {/* Tech Expert Option */}
            <button
              type="button"
              onClick={() => setSelectedRole('expert')}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedRole === 'expert'
                  ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 shrink-0">
                <Wrench className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Tech Expert / Engineer</span>
                  {selectedRole === 'expert' && (
                    <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  I want to provide verified engineering, software, and hardware tech services.
                </div>
              </div>
            </button>
          </div>
        </div>

        {registeredSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Account Created Successfully</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your NEXOVIRA account has been created. Redirecting to Sign In page...
            </p>
            <button
              onClick={() => onNavigate('/signin')}
              className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block font-sans">Authentication Error</span>
              <p className="text-xs text-red-300 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {domainNotice && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>How to authorize domain in Firebase Console:</span>
            </div>
            <p className="text-slate-300">
              Go to <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong> and add this domain:
            </p>
            <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
              <span className="truncate">{domainNotice}</span>
              <button
                onClick={handleCopyDomain}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white shrink-0 flex items-center gap-1 text-[10px]"
                title="Copy Domain Name"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chief Emeka Okafor"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 812 000 0000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Password (Min 8 Chars)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-11 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-11 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
            <UserPlus className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase font-semibold">Or continue with</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3 text-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-1.9z"/>
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
          </svg>
          Google Account
        </button>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('/signin')}
            className="text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            Sign In Here <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </p>
      </div>
    </div>
  );
};

export const SignUpView: React.FC<SignUpViewProps> = (props) => (
  <ErrorBoundary
    fallbackTitle="Authentication Protected"
    fallbackMessage="An exception in the sign-up component was isolated safely. You can retry registration safely."
  >
    <SignUpViewContent {...props} />
  </ErrorBoundary>
);

