import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Code2, 
  GraduationCap, 
  BookOpen, 
  Share2, 
  Mic, 
  MicOff, 
  History,
  Clock,
  X,
  Trash2,
  CornerDownLeft,
  ShoppingBag,
  Bot
} from 'lucide-react';
import { ActiveEcosystemView, CurrencyCode } from '../types';
import { WhatsAppSupportButton } from './WhatsAppSupportButton';
import { 
  getSearchHistory, 
  saveSearchQuery, 
  removeSearchQuery, 
  clearSearchHistory 
} from '../lib/searchHistory';

interface HeroAISearchProps {
  onOpenAI: (query?: string) => void;
  onNavigate: (view: ActiveEcosystemView) => void;
  currentCurrency: CurrencyCode;
  whatsappPhone?: string;
}

export const HeroAISearch: React.FC<HeroAISearchProps> = ({
  onOpenAI,
  onNavigate,
  whatsappPhone = '+2348006392832',
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const recognitionRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Initialize search history from local storage and listen for changes
  useEffect(() => {
    setSearchHistory(getSearchHistory());

    const handleHistoryChange = (e: any) => {
      if (e.detail?.history) {
        setSearchHistory(e.detail.history);
      } else {
        setSearchHistory(getSearchHistory());
      }
    };

    window.addEventListener('nexovira_search_history_changed', handleHistoryChange);
    return () => {
      window.removeEventListener('nexovira_search_history_changed', handleHistoryChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // Exactly three refined suggested search examples
  const suggestedSearches = [
    { label: 'Inverter AC', query: 'Inverter AC' },
    { label: 'Learn Web Development', query: 'Learn Web Development' },
    { label: 'Build My Website', query: 'Build My Website' },
  ];

  const handleExecuteSearch = (queryToRun: string) => {
    const clean = queryToRun.trim();
    if (clean) {
      saveSearchQuery(clean);
      setSearchHistory(getSearchHistory());
      setInputQuery(clean);
      setIsInputFocused(false);
      onOpenAI(clean);
    } else {
      setIsInputFocused(false);
      onOpenAI();
    }
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = removeSearchQuery(item);
    setSearchHistory(updated);
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
    setSearchHistory([]);
  };

  const toggleVoiceSearch = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback('Voice search is not supported in this browser. Please type your query.');
      setTimeout(() => setSpeechFeedback(''), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      setSpeechFeedback('Voice input stopped.');
      setTimeout(() => setSpeechFeedback(''), 3000);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permissionErr: any) {
          if (permissionErr.name === 'NotAllowedError' || permissionErr.name === 'PermissionDeniedError') {
            setIsListening(false);
            setSpeechFeedback('Microphone permission blocked. Please allow mic access in your browser settings.');
            setTimeout(() => setSpeechFeedback(''), 5000);
            return;
          }
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('Listening... Speak your request');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'aborted') {
          setSpeechFeedback('');
          return;
        }
        
        if (event.error === 'no-speech') {
          setSpeechFeedback('No speech detected. Please tap mic and speak again.');
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechFeedback('Microphone access denied. Please grant permission in browser.');
        } else {
          setSpeechFeedback('Speech input closed. Type your search or try again.');
        }
        setTimeout(() => setSpeechFeedback(''), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      recognitionRef.current = null;
      setSpeechFeedback('Speech recognition error. Please type your search.');
      setTimeout(() => setSpeechFeedback(''), 4000);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch(inputQuery);
  };

  // Filter history queries when user types
  const filteredHistory = inputQuery.trim()
    ? searchHistory.filter((item) => item.toLowerCase().includes(inputQuery.trim().toLowerCase()))
    : searchHistory;

  return (
    <section className="relative overflow-hidden bg-[#000000] text-white pt-8 pb-14 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20 border-b border-slate-800/80">
      {/* Background Ambient Glows with official palette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#01213D_0%,#000000_70%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-[#05A9F7]/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#0682F4]/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7 sm:space-y-8">
        
        {/* Subtle Ecosystem Indicator & Support Link */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#01213D]/90 border border-[#05A9F7]/30 text-[#4DDEEA] text-xs font-semibold tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#08E6F9]" />
            <span>Connected AI Commerce & Technology Ecosystem</span>
          </div>
          <WhatsAppSupportButton whatsappNumber={whatsappPhone} variant="hero" />
        </div>

        {/* Main Headline & Supporting Text */}
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
            What do you want to{' '}
            <span className="bg-gradient-to-r from-[#05A9F7] via-[#06C3F8] to-[#08E6F9] bg-clip-text text-transparent">
              do today?
            </span>
          </h1>

          <p className="text-[#CCD2D9] text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-normal leading-relaxed pt-1">
            One intelligent place to discover products, services, learning and more.
          </p>
        </div>

        {/* Centerpiece: AI-Powered Universal Search Bar */}
        <div className="max-w-2xl mx-auto relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative z-20">
            <div 
              className={`relative flex items-center bg-[#01213D]/90 border-2 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
                isListening 
                  ? 'border-[#08E6F9] ring-4 ring-[#08E6F9]/30 shadow-[0_0_30px_rgba(8,230,249,0.25)]' 
                  : isInputFocused 
                  ? 'border-[#05A9F7] ring-4 ring-[#05A9F7]/20 shadow-[0_0_25px_rgba(5,169,247,0.2)]' 
                  : 'border-slate-700/80 hover:border-[#05A9F7]/60'
              }`}
            >
              <div className="p-2.5 sm:p-3 bg-[#05A9F7]/10 text-[#08E6F9] rounded-xl sm:rounded-2xl shrink-0 hidden sm:flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#08E6F9]" />
              </div>

              <input
                type="text"
                value={inputQuery}
                onFocus={() => setIsInputFocused(true)}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "What are you looking for today?"}
                className="w-full bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder:text-slate-400 focus:outline-none"
              />

              {/* Clear typed input button */}
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => setInputQuery('')}
                  className="p-2 text-slate-400 hover:text-white rounded-xl mr-1 transition-colors"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Web Speech API Microphone Toggle Button */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 transition-all mr-1 flex items-center justify-center min-w-[42px] min-h-[42px] ${
                  isListening 
                    ? 'bg-[#0682F4] text-white animate-pulse shadow-lg shadow-[#0682F4]/50 scale-105' 
                    : 'bg-slate-800/90 text-[#CCD2D9] hover:text-[#08E6F9] hover:bg-slate-700/80'
                }`}
                title={isListening ? 'Stop Voice Search' : 'Search using Voice Command'}
              >
                {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Search Action Button with Nexovira Blue-Cyan Gradient */}
              <button
                type="submit"
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0682F4] via-[#05A9F7] to-[#08E6F9] text-[#000000] font-black text-xs sm:text-sm shadow-md shadow-[#05A9F7]/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 flex items-center gap-1.5 sm:gap-2 min-h-[42px]"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Ask NEXOVIRA</span>
              </button>
            </div>
          </form>

          {/* Interactive Search History Dropdown on Focus */}
          {isInputFocused && filteredHistory.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#01213D] border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl z-30 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 px-4 bg-[#000000]/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#CCD2D9]">
                  <Clock className="w-3.5 h-3.5 text-[#08E6F9]" />
                  <span>Recent Searches</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-[#08E6F9] px-1.5 py-0.2 rounded-full">
                    {filteredHistory.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/50">
                {filteredHistory.map((queryText, index) => (
                  <div
                    key={`${queryText}-${index}`}
                    onClick={() => handleExecuteSearch(queryText)}
                    className="p-3 px-4 flex items-center justify-between gap-3 hover:bg-[#05A9F7]/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-[#05A9F7]/20 text-slate-400 group-hover:text-[#08E6F9] shrink-0 transition-colors">
                        <History className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm text-[#CCD2D9] group-hover:text-white font-medium truncate">
                        {queryText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-[#08E6F9] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono">
                        <span>Search</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveHistoryItem(e, queryText)}
                        className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Search Feedback Banner */}
          {speechFeedback && (
            <div className={`mt-2 p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in ${
              isListening ? 'bg-[#0682F4]/20 border border-[#0682F4]/40 text-[#4DDEEA]' : 'bg-[#01213D] border border-[#05A9F7]/30 text-[#4DDEEA]'
            }`}>
              {isListening && <span className="w-2 h-2 rounded-full bg-[#08E6F9] animate-ping" />}
              <span>{speechFeedback}</span>
            </div>
          )}

          {/* Exactly THREE Consistent Suggested Searches */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <span className="text-xs text-slate-400 font-medium">Try searching:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {suggestedSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExecuteSearch(item.query)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#01213D]/60 hover:bg-[#01213D] border border-slate-700/80 hover:border-[#05A9F7]/60 text-xs text-[#CCD2D9] hover:text-white font-medium shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  "{item.label}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Section (Secondary Navigation) */}
        <div className="max-w-3xl mx-auto pt-6 border-t border-slate-800/60">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            QUICK ACTIONS
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            <button
              onClick={() => onNavigate('marketplace')}
              className="p-2.5 rounded-xl bg-[#01213D]/40 hover:bg-[#01213D] border border-slate-800 hover:border-[#05A9F7]/50 text-xs font-medium text-[#CCD2D9] hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group min-h-[44px]"
            >
              <ShoppingBag className="w-4 h-4 text-[#08E6F9] group-hover:scale-110 transition-transform" />
              <span className="truncate">Appliances</span>
            </button>

            <button
              onClick={() => onNavigate('ai')}
              className="p-2.5 rounded-xl bg-[#01213D]/40 hover:bg-[#01213D] border border-slate-800 hover:border-[#05A9F7]/50 text-xs font-medium text-[#CCD2D9] hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group min-h-[44px]"
            >
              <Bot className="w-4 h-4 text-[#08E6F9] group-hover:scale-110 transition-transform" />
              <span className="truncate">Talk to AI</span>
            </button>

            <button
              onClick={() => onNavigate('academy')}
              className="p-2.5 rounded-xl bg-[#01213D]/40 hover:bg-[#01213D] border border-slate-800 hover:border-[#05A9F7]/50 text-xs font-medium text-[#CCD2D9] hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group min-h-[44px]"
            >
              <GraduationCap className="w-4 h-4 text-[#08E6F9] group-hover:scale-110 transition-transform" />
              <span className="truncate">Academy</span>
            </button>

            <button
              onClick={() => onNavigate('library')}
              className="p-2.5 rounded-xl bg-[#01213D]/40 hover:bg-[#01213D] border border-slate-800 hover:border-[#05A9F7]/50 text-xs font-medium text-[#CCD2D9] hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group min-h-[44px]"
            >
              <BookOpen className="w-4 h-4 text-[#08E6F9] group-hover:scale-110 transition-transform" />
              <span className="truncate">E-books</span>
            </button>

            <button
              onClick={() => onNavigate('services')}
              className="p-2.5 rounded-xl bg-[#01213D]/40 hover:bg-[#01213D] border border-slate-800 hover:border-[#05A9F7]/50 text-xs font-medium text-[#CCD2D9] hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group min-h-[44px]"
            >
              <Code2 className="w-4 h-4 text-[#08E6F9] group-hover:scale-110 transition-transform" />
              <span className="truncate">Tech Services</span>
            </button>

            <button
              onClick={() => onNavigate('affiliate')}
              className="p-2.5 rounded-xl bg-[#01213D]/40 hover:bg-[#01213D] border border-slate-800 hover:border-[#05A9F7]/50 text-xs font-medium text-[#CCD2D9] hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group min-h-[44px]"
            >
              <Share2 className="w-4 h-4 text-[#08E6F9] group-hover:scale-110 transition-transform" />
              <span className="truncate">Affiliate</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};


