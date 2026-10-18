import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RotateCcw, 
  ShoppingBag, 
  ChevronRight 
} from 'lucide-react';

interface RecommendedProduct {
  product_id: number;
  product_name: string;
  price: number;
  material: string;
  color: string;
  category: string;
  image: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestions?: string[];
  products?: RecommendedProduct[];
  action_tab?: string;
}

const STARTER_PROMPTS = [
  { label: '🛋️ Browse Sofas & Tables', query: 'Show me popular dining tables and sofas' },
  { label: '🪵 Have My Own Timber', query: 'I have my own timber wood. How do I book on-site carpentry or workshop fabrication?' },
  { label: '📐 Custom Furniture Guide', query: 'How do I design custom bespoke furniture in the Create studio?' },
  { label: '🪚 Wood Fabrication', query: 'What wood cutting and CNC fabrication services do you offer?' },
  { label: '🛠️ Book On-Site Carpenter', query: 'How do I book an artisan for furniture repair or assembly?' },
  { label: '🚚 Delivery & Tracking', query: 'How does shipping and order tracking work?' },
  { label: '🏷️ Available Discounts', query: 'Are there any discount coupon codes available?' },
];

export const CustomerAssistantTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: "👋 **Hello! I am RetailSphere AI Assistant.**\n\nI can help you discover luxury handcrafted furniture, configure bespoke custom pieces in the **CREATE** studio, book **on-site master carpenters** for your own timber, submit **wood fabrication & cutting** requests, or track your live dispatches!\n\nHow may I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        "Show popular furniture",
        "I have my own timber",
        "Design custom furniture",
        "Book an on-site carpenter"
      ]
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendQueryToAssistant = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userText = queryText.trim();
    setInputMsg('');

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/customer-assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.response || "I'm here to help! Feel free to ask about RetailSphere AI furniture, bespoke custom designs, precision timber fabrication, or on-site services.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: data.suggestions || [],
          products: data.products || [],
          action_tab: data.action_tab
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: "I'm sorry, I couldn't process that request right now. Please try asking again or explore our catalog, custom studio, and on-site services.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: ["Browse Ready-Made Furniture", "Design Custom Furniture", "Book On-Site Carpenter"]
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('Chatbot request issue:', err);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendQueryToAssistant(inputMsg);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: '1',
        sender: 'bot',
        text: "👋 **Hello! I am RetailSphere AI Assistant.**\n\nI can help you discover luxury handcrafted furniture, configure bespoke custom pieces in the **CREATE** studio, guide you in registering your **own timber logs**, book on-site artisan carpenters, or track your live dispatches!\n\nHow may I assist you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          "Show popular furniture",
          "How do I use my own wood?",
          "Design custom furniture",
          "Book an on-site carpenter"
        ]
      },
    ]);
  };

  // Helper to render basic markdown formatting: **bold**, bullets, linebreaks
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5">
        {lines.map((rawLine, lIdx) => {
          const trimmed = rawLine.trim();
          if (!trimmed) return <div key={lIdx} className="h-1" />;
          
          const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
          const lineContent = isBullet ? trimmed.replace(/^[•\-*]\s+/, '') : rawLine;

          // Parse bold parts
          const parts = lineContent.split(/(\*\*.*?\*\*)/g);
          const renderedParts = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-extrabold text-[#2C241D]">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div key={lIdx} className="flex items-start gap-1.5 pl-1">
                <span className="text-[#38A132] font-bold text-sm leading-tight">•</span>
                <span className="flex-1">{renderedParts}</span>
              </div>
            );
          }

          return <p key={lIdx}>{renderedParts}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Full-Width Focused Chat Window */}
      <div className="bg-white/95 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col justify-between min-h-[680px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#38A132] to-[#2E8B29] text-white flex items-center justify-center shadow-lg shadow-[#38A132]/25">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[#2C241D]">RetailSphere AI Assistant</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                  Live Chat
                </span>
              </div>
              <p className="text-[11px] text-[#38A132] font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#38A132] animate-ping" />
                <span>Connected & Context-Aware</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleResetChat}
            title="Reset Chat Session"
            className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#E2D7CB]/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        {/* Message Trajectory */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 max-h-[480px] px-1 scrollbar-thin">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[90%] sm:max-w-[80%] p-4 rounded-3xl text-xs leading-relaxed space-y-2 shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-[#38A132] text-white rounded-br-none font-semibold shadow-[#38A132]/20'
                    : 'bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] rounded-bl-none font-medium'
                }`}
              >
                {renderFormattedText(m.text)}

                {/* Recommended Products Mini-Cards */}
                {m.products && m.products.length > 0 && (
                  <div className="pt-2 border-t border-[#E2D7CB]/60 mt-2 space-y-2">
                    <div className="text-[10px] font-extrabold uppercase text-[#7A6C5E] flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-[#38A132]" />
                      <span>Matching Catalog Items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.products.map((p) => (
                        <div
                          key={p.product_id}
                          className="bg-white p-2.5 rounded-2xl border border-[#E2D7CB] flex items-center gap-2.5 hover:shadow-md transition-all group"
                        >
                          <img
                            src={p.image}
                            alt={p.product_name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-[#2C241D] text-[11px] truncate group-hover:text-[#38A132]">
                              {p.product_name}
                            </div>
                            <div className="text-[10px] text-[#7A6C5E] truncate">
                              {p.material}
                            </div>
                            <div className="font-extrabold text-[#38A132] text-xs mt-0.5">
                              ₹{p.price.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`text-[9px] pt-1 flex items-center justify-between ${m.sender === 'user' ? 'text-white/80' : 'text-[#7A6C5E]'}`}>
                  <span>{m.timestamp}</span>
                </div>
              </div>

              {/* Clickable Follow-up Suggestion Chips */}
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%] sm:max-w-[80%]">
                  {m.suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      disabled={isLoading}
                      onClick={() => sendQueryToAssistant(sug)}
                      className="px-3 py-1 bg-white hover:bg-emerald-50 border border-[#E2D7CB] hover:border-emerald-300 rounded-full text-[11px] font-bold text-[#2C241D] hover:text-[#38A132] transition-all cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                    >
                      <span>{sug}</span>
                      <ChevronRight className="w-3 h-3 text-[#7A6C5E]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#FAF7F2] border border-[#E2D7CB] px-4 py-3 rounded-2xl text-xs text-[#7A6C5E] font-bold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#38A132] animate-ping" />
                <span>AI is formulating guidance...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Starter Prompts Bar */}
        <div className="pt-3 border-t border-[#E2D7CB]/60 space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STARTER_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => sendQueryToAssistant(item.query)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-white border border-[#E2D7CB] text-[10px] font-extrabold text-[#7A6C5E] hover:text-[#2C241D] hover:border-[#38A132] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex-shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Ask about furniture, customer timber, custom specs, repairs, or tracking..."
              className="flex-1 p-3.5 rounded-2xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-semibold text-[#2C241D] placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMsg.trim()}
              className="p-3.5 rounded-2xl bg-[#38A132] hover:bg-[#2E8B29] text-white transition-all shadow-md shadow-[#38A132]/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
