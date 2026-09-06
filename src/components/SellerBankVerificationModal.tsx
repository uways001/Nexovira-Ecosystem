import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  X, 
  ExternalLink,
  ChevronRight,
  Search,
  History,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  SellerBankAccount, 
  NigerianBankItem, 
  ProviderStatusResponse, 
  SellerBankAccountAuditLog 
} from '../types';
import { 
  fetchBankVerificationProviderStatus,
  fetchNigerianBanksList,
  verifyNigerianBankAccount,
  saveSellerBankAccountInFirestore,
  fetchSellerBankAccountAuditLogs
} from '../lib/firestoreService';

interface SellerBankVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  currentBankAccount: SellerBankAccount | null;
  onBankAccountUpdated: (updatedBank: SellerBankAccount) => void;
}

export const SellerBankVerificationModal: React.FC<SellerBankVerificationModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  currentBankAccount,
  onBankAccountUpdated
}) => {
  // Provider status state
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse>({
    configured: false,
    provider: 'Paystack',
    message: 'Checking provider status...'
  });
  const [loadingProvider, setLoadingProvider] = useState(true);

  // Bank list state
  const [banksList, setBanksList] = useState<NigerianBankItem[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

  // Form input state
  const [selectedBank, setSelectedBank] = useState<NigerianBankItem | null>(null);
  const [accountNumber, setAccountNumber] = useState('');

  // Verification process state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    status?: string;
    accountName: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    maskedAccountNumber: string;
    provider: string;
    providerReference: string;
    verifiedAt: string;
    nameMatchStatus: 'compatible' | 'mismatch' | 'unchecked';
    nameMatchScore: number;
    nameMatchNotes: string;
    message: string;
    errorCode?: string;
    missingCredentials?: string[];
  } | null>(null);

  // UI view state: 'form' | 'confirm' | 'audit_history'
  const [viewMode, setViewMode] = useState<'form' | 'confirm' | 'audit_history'>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SellerBankAccountAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize or re-initialize on open
  useEffect(() => {
    if (isOpen) {
      loadProviderAndBanks();
      if (currentBankAccount && currentBankAccount.verificationStatus === 'verified') {
        setSelectedBank({
          name: currentBankAccount.bankName,
          code: currentBankAccount.bankCode || '058'
        });
        setAccountNumber(currentBankAccount.accountNumber || '');
      } else {
        setVerificationResult(null);
        setViewMode('form');
      }
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, sellerId]);

  const loadProviderAndBanks = async () => {
    setLoadingProvider(true);
    setLoadingBanks(true);
    try {
      const status = await fetchBankVerificationProviderStatus();
      setProviderStatus(status);

      const bankData = await fetchNigerianBanksList();
      if (bankData.success && bankData.banks.length > 0) {
        setBanksList(bankData.banks);
        if (!selectedBank && bankData.banks[0]) {
          // Default selection if none exists
          setSelectedBank(bankData.banks[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to connect to interbank verification provider.');
    } finally {
      setLoadingProvider(false);
      setLoadingBanks(false);
    }
  };

  const loadAuditHistory = async () => {
    setLoadingAudit(true);
    try {
      const logs = await fetchSellerBankAccountAuditLogs(sellerId);
      setAuditLogs(logs);
      setViewMode('audit_history');
    } catch (err) {
      console.error('Failed to load bank audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleBankSelect = (bank: NigerianBankItem) => {
    setSelectedBank(bank);
    setIsBankDropdownOpen(false);
    // Invalidate previous verification result immediately
    setVerificationResult(null);
    setViewMode('form');
    setErrorMessage('');
  };

  const handleAccountNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(clean);
    // Invalidate previous verification result immediately
    setVerificationResult(null);
    setViewMode('form');
    setErrorMessage('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) {
      setErrorMessage('Please select a Nigerian bank.');
      return;
    }
    if (accountNumber.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit NUBAN account number.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsVerifying(true);

    try {
      const result = await verifyNigerianBankAccount(
        selectedBank.name,
        selectedBank.code,
        accountNumber,
        sellerName,
        sellerId
      );

      setVerificationResult(result);

      if (result.verified && result.accountName) {
        // Switch to Confirmation Step
        setViewMode('confirm');
      } else {
        setErrorMessage(result.message || 'Bank verification failed. Please check your bank and account number.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification service encountered an unexpected error.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!verificationResult || !verificationResult.verified || !verificationResult.accountName) {
      setErrorMessage('Please complete NUBAN verification first.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const saved = await saveSellerBankAccountInFirestore(
        sellerId,
        {
          bankName: verificationResult.bankName,
          bankCode: verificationResult.bankCode,
          accountNumber: verificationResult.accountNumber,
          maskedAccountNumber: verificationResult.maskedAccountNumber,
          accountName: verificationResult.accountName, // Genuine provider name
          verificationStatus: 'verified',
          provider: verificationResult.provider,
          providerReference: verificationResult.providerReference,
          verifiedAt: verificationResult.verifiedAt,
          nameMatchStatus: verificationResult.nameMatchStatus,
          nameMatchScore: verificationResult.nameMatchScore,
          nameMatchNotes: verificationResult.nameMatchNotes
        },
        sellerName
      );

      setSuccessMessage('Verified Nigerian Bank Account successfully linked to your payout profile!');
      onBankAccountUpdated(saved);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save verified bank account to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForChange = () => {
    setVerificationResult(null);
    setViewMode('form');
    setErrorMessage('');
    setSuccessMessage('');
  };

  if (!isOpen) return null;

  const filteredBanks = banksList.filter(b => 
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    b.code.includes(bankSearch)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 text-left pr-8">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>REAL NIGERIAN BANK VERIFICATION</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {viewMode === 'audit_history' 
              ? 'Bank Verification Audit Logs' 
              : viewMode === 'confirm' 
                ? 'Confirm Official Bank Account' 
                : 'Link Verified Bank Account'}
          </h2>
          <p className="text-xs text-slate-400">
            NEXOVIRA validates Nigerian NUBAN accounts via live interbank lookup. Seller earnings and withdrawals are strictly disbursed to verified accounts.
          </p>
        </div>

        {/* Provider Status Ribbon */}
        <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
          providerStatus.configured 
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="mt-0.5 shrink-0">
            {providerStatus.configured ? (
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wide">
                Active Provider: {providerStatus.provider} Interbank Engine
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                providerStatus.configured 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {providerStatus.configured ? 'LIVE LOOKUP ACTIVE' : 'CREDENTIALS REQUIRED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {providerStatus.message}
            </p>
          </div>
        </div>

        {/* Error / Success Alerts */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Verification Error</span>
              <p className="text-[11px] text-rose-300 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Success</span>
              <p className="text-[11px] text-emerald-300">{successMessage}</p>
            </div>
          </div>
        )}

        {/* VIEW 1: BANK INPUT FORM */}
        {viewMode === 'form' && (
          <form onSubmit={handleVerify} className="space-y-5 text-left">
            
            {/* Bank Selector */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-extrabold uppercase text-slate-300 flex items-center justify-between">
                <span>Select Nigerian Bank</span>
                {loadingBanks && <span className="text-[10px] text-cyan-400 font-mono">Loading live bank list...</span>}
              </label>

              {/* Custom Searchable Dropdown Button */}
              <div 
                onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold">
                    {selectedBank ? selectedBank.name : 'Select a Nigerian Bank'}
                  </span>
                  {selectedBank && (
                    <span className="font-mono text-[10px] text-slate-400">
                      (Code: {selectedBank.code})
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isBankDropdownOpen ? 'rotate-90' : ''}`} />
              </div>

              {/* Bank Search & Options Dropdown */}
              {isBankDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-2xl max-h-60 overflow-y-auto space-y-1">
                  <div className="p-2 border-b border-slate-800 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search bank name or code..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="divide-y divide-slate-800/40">
                    {filteredBanks.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        {loadingBanks ? 'Fetching banks from provider...' : 'No matching banks found.'}
                      </div>
                    ) : (
                      filteredBanks.map((b) => (
                        <button
                          key={`${b.code}-${b.name}`}
                          type="button"
                          onClick={() => handleBankSelect(b)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                            selectedBank?.code === b.code 
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <span>{b.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">#{b.code}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 10-Digit NUBAN Account Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-300 flex items-center justify-between">
                <span>10-Digit NUBAN Account Number</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {accountNumber.length}/10 digits
                </span>
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-base font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Enter the standard 10-digit Nigerian NUBAN account number.
              </p>
            </div>

            {/* Paystack Key Guidance Callout if not configured */}
            {!providerStatus.configured && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-300">Paystack Key Notice:</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Live NUBAN resolution requires a <strong>Paystack Secret Key</strong> (starts with <span className="font-mono text-cyan-300">sk_live_</span> or <span className="font-mono text-cyan-300">sk_test_</span>). Please configure <span className="font-mono text-cyan-300">PAYSTACK_SECRET_KEY</span> in the platform Settings with your Secret Key from Paystack Dashboard &gt; Settings &gt; API Keys &amp; Webhooks.
                  </p>
                </div>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isVerifying || accountNumber.length !== 10 || !selectedBank}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Resolving Account with {providerStatus.provider}...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Nigerian Bank Account</span>
                </>
              )}
            </button>

            {/* History link */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={loadAuditHistory}
                className="hover:text-cyan-400 font-bold flex items-center gap-1 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Bank Audit Logs</span>
              </button>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Non-editable official name
              </span>
            </div>
          </form>
        )}

        {/* VIEW 2: CONFIRMATION STEP (Provider returned official account holder name) */}
        {viewMode === 'confirm' && verificationResult && (
          <div className="space-y-6 text-left">
            <div className="p-5 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Interbank Lookup Succeeded</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black">
                  {verificationResult.provider} VERIFIED
                </span>
              </div>

              {/* Official Account Name (Locked & High-Contrast) */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400">
                  Official Account Holder Name (From Provider)
                </label>
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="font-mono font-black text-emerald-400 text-base sm:text-lg tracking-wide">
                    {verificationResult.accountName}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                    <Lock className="w-3 h-3 text-slate-400" /> Locked
                  </div>
                </div>
              </div>

              {/* Bank & Masked Account Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Bank Name</div>
                  <div className="font-black text-white mt-0.5">{verificationResult.bankName}</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Account Number</div>
                  <div className="font-mono font-black text-cyan-400 mt-0.5">{verificationResult.maskedAccountNumber}</div>
                </div>
              </div>

              {/* Provider Reference Metadata */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Provider Reference:</span>
                  <span className="text-slate-200">{verificationResult.providerReference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verification Time:</span>
                  <span className="text-slate-200">{new Date(verificationResult.verifiedAt).toLocaleString('en-NG')}</span>
                </div>
              </div>

              {/* Name Match Guidance */}
              {verificationResult.nameMatchNotes && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  verificationResult.nameMatchStatus === 'compatible' 
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}>
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Identity Check:</span>
                    <p className="text-[11px] leading-relaxed">{verificationResult.nameMatchNotes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation Question */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-xs text-cyan-200 space-y-1 text-center font-bold">
              <p>Is this your official registered Nigerian bank account?</p>
              <p className="text-[11px] font-normal text-slate-300">
                Once confirmed, all future store earnings will be disbursed directly to this verified account.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleResetForChange}
                disabled={isSaving}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Change Account / Re-enter
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Payout Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Link Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: AUDIT HISTORY LOGS */}
        {viewMode === 'audit_history' && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className="text-xs text-cyan-400 font-bold hover:underline flex items-center gap-1"
              >
                ← Back to Bank Form
              </button>
              <span className="text-xs text-slate-400">
                {auditLogs.length} audit event(s) recorded
              </span>
            </div>

            {loadingAudit ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading security audit logs...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                No bank verification audit events recorded for this store yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        log.action === 'BANK_ACCOUNT_CONFIRMED' || log.action === 'VERIFICATION_SUCCEEDED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.action === 'VERIFICATION_FAILED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString('en-NG')}
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs">
                      {log.bankName} — <span className="font-mono text-cyan-400">{log.accountNumberMasked}</span>
                    </div>
                    {log.newAccountName && (
                      <div className="text-[11px] text-slate-300">
                        Official Name: <strong className="text-emerald-400">{log.newAccountName}</strong>
                      </div>
                    )}
                    {log.providerReference && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Ref: {log.providerReference}
                      </div>
                    )}
                    {log.reason && (
                      <div className="text-[10px] text-rose-400 italic">
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
