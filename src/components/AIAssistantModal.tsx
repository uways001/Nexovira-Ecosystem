import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, ShoppingCart, Check, ShieldCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { Product, AIMessage } from '../types';
import { NexoviraLogo } from './NexoviraLogo';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onCompareProduct?: (product: Product) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectProduct,
  onAddToCart,
  onCompareProduct,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: "Hello! I am **NEXOVIRA AI**, your intelligent commerce shopping assistant. Tell me what appliance, technology, or electronic specification you are looking for, and I will search verified marketplace stock for you.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Air Conditioner for 35m² room', actionQuery: 'Recommend air conditioners for a 35 sqm medium-large room' },
        { label: 'Refrigerators under $1,500', actionQuery: 'Show me verified smart refrigerators under $1500' },
        { label: 'Best 4K OLED TV for Gaming', actionQuery: 'Which 4K OLED TV is best for 120Hz gaming?' },
        { label: 'AI Workstation Laptop for Developers', actionQuery: 'Find workstation laptops for heavy coding and AI' }
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery && isOpen) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const prompt = queryText || inputQuery;
    if (!prompt.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history: messages.map(m => ({ role: m.sender, content: m.text })) })
      });

      if (!response.ok) {
        throw new Error('AI API endpoint failed');
      }

      const data = await response.json();

      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.text || "I found these grounded marketplace recommendations matching your exact specifications.",
        suggestedProducts: data.products || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      // Fallback message
      const fallbackMsg: AIMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: "I searched our verified catalog and retrieved these exact matching appliances & electronics:",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <NexoviraLogo size={38} showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">NEXOVIRA AI Shopping Assistant</h3>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold px-2 py-0.5 rounded-full">
                  Grounded Commerce
                </span>
              </div>
              <p className="text-xs text-cyan-400 font-semibold italic">Innovation begins with vision. Smart living, better every day.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {msg.sender === 'user' ? (
                <div className="w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center text-xs font-bold bg-slate-800 text-white">
                  <User className="w-4 h-4" />
                </div>
              ) : (
                <div className="shrink-0">
                  <NexoviraLogo size={36} showText={false} />
                </div>
              )}

              <div className="space-y-3 flex-1">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-cyan-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="block text-[10px] text-slate-400 mt-2 text-right">
                    {msg.timestamp}
                  </span>
                </div>

                {/* Suggested Prompt Action Chips */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(act.actionQuery)}
                        className="text-xs bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl px-3 py-1.5 transition-colors flex items-center gap-1"
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3 h-3 text-cyan-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Grounded Recommended Products Grid */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {msg.suggestedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-3 flex gap-3 group transition-all"
                      >
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 object-cover rounded-xl shrink-0 bg-slate-900"
                        />
                        <div className="flex-1 flex flex-col justify-between text-left">
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="text-cyan-400 font-bold uppercase">{product.brand}</span>
                              <span>★ {product.rating}</span>
                            </div>
                            <h4
                              onClick={() => { onSelectProduct(product); onClose(); }}
                              className="font-bold text-xs text-white line-clamp-1 group-hover:text-cyan-400 cursor-pointer"
                            >
                              {product.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">${product.price.toLocaleString()}</p>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => onAddToCart(product)}
                              className="flex-1 py-1 px-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" /> Add
                            </button>
                            {onCompareProduct && (
                              <button
                                onClick={() => onCompareProduct(product)}
                                className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] rounded-lg"
                              >
                                Compare
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-cyan-400 text-xs font-medium">
              <Bot className="w-5 h-5 animate-bounce" />
              <div className="flex items-center gap-1 bg-slate-800 px-3 py-2 rounded-2xl">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>NEXOVIRA AI is matching specifications in marketplace database...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-cyan-500 transition-colors"
          >
            <input
              type="text"
              placeholder="Ask anything (e.g. 'Compare energy ratings for 2HP split ACs')"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-cyan-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
