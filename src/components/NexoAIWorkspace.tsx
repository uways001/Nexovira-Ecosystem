import React, { useState, useEffect, useRef } from 'react';
import { AIMessage, EcosystemIntent, CurrencyCode, Product, TechService, Course, DigitalProduct } from '../types';
import { formatCurrency } from '../lib/currency';
import { NexoviraLogo } from './NexoviraLogo';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShoppingBag, 
  Code2, 
  GraduationCap, 
  BookOpen, 
  Share2, 
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface NexoAIWorkspaceProps {
  initialPrompt?: string;
  currentCurrency: CurrencyCode;
  onAddToCart?: (product: Product) => void;
  onNavigateToView?: (view: string) => void;
}

export const NexoAIWorkspace: React.FC<NexoAIWorkspaceProps> = ({
  initialPrompt = '',
  currentCurrency,
  onAddToCart,
  onNavigateToView,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: 'Welcome to NEXOVIRA — Innovation begins with vision. Smart living, better every day. I am your intelligent AI assistant across physical appliances, tech services, courses, e-books, and digital tools. How can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Recommend AC for medium room', actionQuery: 'Recommend the best inverter air conditioner for a medium-sized bedroom' },
        { label: 'How to learn full-stack dev', actionQuery: 'What is the best course to learn full-stack web development?' },
        { label: 'Hire web developer', actionQuery: 'I need a tech expert to build a custom React web app' },
        { label: 'Start affiliate earning', actionQuery: 'How can I generate affiliate referral links and earn commissions?' }
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          currency: currentCurrency
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response from NEXOVIRA AI server');
      }

      const data = await response.json();

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.replyText || 'I processed your query across the NEXOVIRA ecosystem.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent,
        suggestedProducts: data.suggestedProducts,
        suggestedServices: data.suggestedServices,
        suggestedCourses: data.suggestedCourses,
        suggestedEbooks: data.suggestedEbooks,
        actions: data.actions
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I recommend exploring our NEXOVIRA Marketplace or Academy catalog. Let me know if you would like me to narrow down specific inverter appliances or full-stack courses!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left space-y-6">
      
      {/* Workspace Title */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border border-purple-900/40 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEXOVIRA AI Intelligence Workspace</span>
          </div>
          <h1 className="text-2xl font-black">Ask, Research & Solve Across All 6 Ecosystems</h1>
          <p className="text-xs text-purple-300 font-semibold italic">"Innovation begins with vision. Smart living, better every day."</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-purple-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Grounded Gemini 3.6 Flash Intelligence</span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 min-h-[500px] flex flex-col justify-between">
        <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="shrink-0">
                  <NexoviraLogo size={36} showText={false} />
                </div>
              )}

              <div className={`max-w-2xl space-y-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <div className={`text-[10px] mt-2 font-mono ${msg.sender === 'user' ? 'text-purple-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {/* Suggested Products Card Attachments */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {msg.suggestedProducts.map((p) => (
                      <div key={p.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center gap-3">
                        <img src={p.images[0]} alt={p.title} referrerPolicy="no-referrer" className="w-12 h-12 object-cover rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{p.title}</div>
                          <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5">
                            {formatCurrency(p.price, currentCurrency)}
                          </div>
                          {onAddToCart && (
                            <button
                              onClick={() => onAddToCart(p)}
                              className="mt-1 text-[10px] bg-cyan-500 text-slate-950 px-2 py-0.5 rounded font-bold"
                            >
                              + Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Services */}
                {msg.suggestedServices && msg.suggestedServices.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {msg.suggestedServices.map((s) => (
                      <div key={s.id} className="p-3 rounded-2xl bg-blue-950/60 border border-blue-900/50 text-white flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{s.title}</div>
                          <div className="text-[10px] text-blue-300">By {s.providerName}</div>
                        </div>
                        <div className="text-xs font-mono font-bold text-blue-400">
                          From {formatCurrency(s.startingPrice, currentCurrency)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Courses */}
                {msg.suggestedCourses && msg.suggestedCourses.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {msg.suggestedCourses.map((c) => (
                      <div key={c.id} className="p-3 rounded-2xl bg-amber-950/60 border border-amber-900/50 text-white flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{c.title}</div>
                          <div className="text-[10px] text-amber-300">Instructor: {c.instructor}</div>
                        </div>
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {formatCurrency(c.price, currentCurrency)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Prompts */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {msg.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(act.actionQuery)}
                        className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl px-3 py-1.5 transition-colors text-left"
                      >
                        ⚡ {act.label}
                      </button>
                    ))}
                  </div>
                )}

              </div>

              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-purple-400 font-bold p-3 bg-purple-500/10 rounded-2xl max-w-xs border border-purple-500/20">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>NEXOVIRA AI is analyzing ecosystems...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about products, courses, services, e-books or business plans..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
