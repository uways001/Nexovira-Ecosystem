import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  incidentId: string | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    incidentId: null,
    showDetails: false,
    copied: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    const incidentId = `NX-ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return { hasError: true, error, incidentId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const incidentId = this.state.incidentId || `NX-ERR-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    const diagnosticReport = {
      incidentId,
      timestamp,
      message: error?.message || 'Unknown runtime error',
      name: error?.name || 'Error',
      stack: error?.stack || 'No stack available',
      componentStack: errorInfo?.componentStack || 'No component stack available',
      url: currentUrl,
      userAgent,
    };

    // 1. Console Diagnostic Log
    console.error('🚨 [NEXOVIRA ERROR BOUNDARY INCIDENT]:', diagnosticReport);

    // 2. Persist in local storage audit buffer (up to 20 incidents)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = JSON.parse(localStorage.getItem('nexovira_system_error_logs') || '[]');
        stored.unshift(diagnosticReport);
        localStorage.setItem('nexovira_system_error_logs', JSON.stringify(stored.slice(0, 20)));
      } catch (storageErr) {
        console.warn('Could not cache error in localStorage:', storageErr);
      }
    }

    // 3. Dispatch telemetry report to backend server
    if (typeof fetch !== 'undefined') {
      fetch('/api/v1/security/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REACT_ERROR_BOUNDARY_CAUGHT',
          incidentId,
          report: diagnosticReport,
        }),
      }).catch((fetchErr) => {
        console.warn('Telemetry dispatch failed:', fetchErr);
      });
    }

    this.setState({ errorInfo });
  }

  handleCopyDetails = () => {
    const details = JSON.stringify(
      {
        incidentId: this.state.incidentId,
        timestamp: new Date().toISOString(),
        error: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
      },
      null,
      2
    );

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null, incidentId: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const { incidentId, error, errorInfo, showDetails, copied } = this.state;

      return (
        <div className="min-h-[500px] w-full bg-[#0B0F17] text-white flex flex-col items-center justify-center p-6 sm:p-10 text-center rounded-3xl border border-slate-800 shadow-2xl my-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-cyan-400 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>INCIDENT ID: {incidentId}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mb-2 text-white">
            {fallbackTitle || 'NEXOVIRA Shield Protected the Session'}
          </h1>
          <p className="text-slate-400 max-w-lg text-xs sm:text-sm mb-6 leading-relaxed">
            {fallbackMessage ||
              'A component rendering exception was safely intercepted and isolated by the NEXOVIRA Error Boundary. Your session and sensitive workspace data remain secure.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              onClick={() => {
                this.handleReset();
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return to Home
            </button>

            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Component
            </button>

            <button
              onClick={this.handleCopyDetails}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-slate-800 transition-all cursor-pointer"
              title="Copy technical crash dump for developer inspection"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Incident Logs'}</span>
            </button>
          </div>

          {/* Collapsible Technical Diagnostics */}
          <div className="w-full max-w-2xl text-left">
            <button
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors"
            >
              <span>Technical Diagnostics & Component Stack</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-4 rounded-xl bg-black/60 border border-slate-800/80 text-[11px] font-mono text-slate-300 space-y-3 overflow-x-auto max-h-64 overflow-y-auto">
                <div>
                  <span className="text-cyan-400 font-bold block mb-1">Error Message:</span>
                  <p className="text-red-400">{error?.message || 'No message provided'}</p>
                </div>
                {error?.stack && (
                  <div>
                    <span className="text-cyan-400 font-bold block mb-1">Call Stack:</span>
                    <pre className="text-slate-400 whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <span className="text-cyan-400 font-bold block mb-1">React Component Hierarchy:</span>
                    <pre className="text-slate-500 whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

