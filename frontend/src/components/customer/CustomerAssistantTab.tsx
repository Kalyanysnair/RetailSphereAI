import React, { useState } from 'react';
import { Bot, Send, Sparkles, Image as ImageIcon, Ruler, AlertTriangle, Search, Cpu } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  ai_card?: any;
}

export const CustomerAssistantTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: "Hello! I am RetailSphere AI Assistant. I can help you find furniture, design custom pieces, analyze uploaded photos, estimate dimensions, or guide you in registering customer-owned wood! How can I assist you?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // AI Vision Tools Modal State
  const [activeTool, setActiveTool] = useState<'vision' | 'dimension' | 'material' | 'damage' | 'nl_spec' | null>(null);
  const [toolImageUrl, setToolImageUrl] = useState('');
  const [toolInputText, setToolInputText] = useState('');
  const [toolResult, setToolResult] = useState<any>(null);
  const [isToolProcessing, setIsToolProcessing] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
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
      const res = await fetch('/api/ai/customer-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('Chatbot API error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAiTool = async () => {
    setIsToolProcessing(true);
    setToolResult(null);
    try {
      let endpoint = '/api/ai/vision-analysis';
      let payload: any = { image_url: toolImageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc' };

      if (activeTool === 'dimension') {
        endpoint = '/api/ai/estimate-dimensions';
      } else if (activeTool === 'material') {
        endpoint = '/api/ai/inspect-material';
        payload.material_name = 'Customer Teak Wood';
      } else if (activeTool === 'damage') {
        endpoint = '/api/ai/detect-damage';
      } else if (activeTool === 'nl_spec') {
        endpoint = '/api/ai/extract-nl-specs';
        payload = { text_description: toolInputText || '6 seater teak dining table with matte polish' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setToolResult(data);
      }
    } catch (err) {
      console.error('AI Tool Error:', err);
    } finally {
      setIsToolProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Chat Window */}
      <div className="lg:col-span-2 bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[550px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#48A63E] text-white flex items-center justify-center shadow-md shadow-[#48A63E]/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#2C241D]">RetailSphere AI Assistant</h3>
              <p className="text-[10px] text-[#48A63E] font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#48A63E] animate-ping" /> Online & Context-Aware
              </p>
            </div>
          </div>
        </div>

        {/* Message Trajectory */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[400px] px-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed space-y-1 ${
                  m.sender === 'user'
                    ? 'bg-[#48A63E] text-white rounded-br-none shadow-md font-semibold'
                    : 'bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] rounded-bl-none shadow-xs font-medium'
                }`}
              >
                <p>{m.text}</p>
                <span className={`block text-[9px] ${m.sender === 'user' ? 'text-white/80 text-right' : 'text-[#7A6C5E]'}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#FAF7F2] border border-[#E2D7CB] p-3 rounded-2xl text-xs text-[#7A6C5E] font-bold animate-pulse">
                AI is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#E2D7CB] flex items-center gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Ask about custom furniture, customer-owned wood, services, or tracking..."
            className="flex-1 p-3 rounded-2xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
          />
          <button
            type="submit"
            className="p-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white transition-all shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Right AI Intelligent Computer Vision Tools Panel */}
      <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E2D7CB] pb-3">
          <Sparkles className="w-5 h-5 text-[#48A63E]" />
          <div>
            <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">AI Computer Vision Suite</h4>
            <p className="text-[10px] text-[#7A6C5E] font-medium">Test interactive AI tools on photos or text descriptions.</p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => { setActiveTool('vision'); setToolResult(null); }}
            className={`w-full p-3 rounded-2xl text-xs font-extrabold text-left transition-all flex items-center gap-3 border ${
              activeTool === 'vision' ? 'bg-[#48A63E] text-white border-[#48A63E]' : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:border-[#48A63E]'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> 1. Furniture Image Spec Analysis
          </button>

          <button
            onClick={() => { setActiveTool('dimension'); setToolResult(null); }}
            className={`w-full p-3 rounded-2xl text-xs font-extrabold text-left transition-all flex items-center gap-3 border ${
              activeTool === 'dimension' ? 'bg-[#48A63E] text-white border-[#48A63E]' : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:border-[#48A63E]'
            }`}
          >
            <Ruler className="w-4 h-4" /> 2. Image-Based Dimension Estimator
          </button>

          <button
            onClick={() => { setActiveTool('material'); setToolResult(null); }}
            className={`w-full p-3 rounded-2xl text-xs font-extrabold text-left transition-all flex items-center gap-3 border ${
              activeTool === 'material' ? 'bg-[#48A63E] text-white border-[#48A63E]' : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:border-[#48A63E]'
            }`}
          >
            <Cpu className="w-4 h-4" /> 3. Material Condition Inspector
          </button>

          <button
            onClick={() => { setActiveTool('damage'); setToolResult(null); }}
            className={`w-full p-3 rounded-2xl text-xs font-extrabold text-left transition-all flex items-center gap-3 border ${
              activeTool === 'damage' ? 'bg-[#48A63E] text-white border-[#48A63E]' : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:border-[#48A63E]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> 4. Damage Detection & Repair Recommender
          </button>

          <button
            onClick={() => { setActiveTool('nl_spec'); setToolResult(null); }}
            className={`w-full p-3 rounded-2xl text-xs font-extrabold text-left transition-all flex items-center gap-3 border ${
              activeTool === 'nl_spec' ? 'bg-[#48A63E] text-white border-[#48A63E]' : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:border-[#48A63E]'
            }`}
          >
            <Bot className="w-4 h-4" /> 5. Natural Language → Production Spec
          </button>
        </div>

        {/* Selected Tool Action Form & Results Output */}
        {activeTool && (
          <div className="pt-3 border-t border-[#E2D7CB] space-y-3 animate-fadeIn">
            {activeTool !== 'nl_spec' ? (
              <div>
                <label className="block text-[10px] font-extrabold text-[#7A6C5E] uppercase mb-1">Image URL to Analyze</label>
                <input
                  type="text"
                  value={toolImageUrl}
                  onChange={(e) => setToolImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-extrabold text-[#7A6C5E] uppercase mb-1">Describe Furniture Idea</label>
                <textarea
                  value={toolInputText}
                  onChange={(e) => setToolInputText(e.target.value)}
                  rows={3}
                  placeholder="e.g. 6-seater solid teak wood dining table with matte finish..."
                  className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-xs"
                />
              </div>
            )}

            <button
              onClick={handleRunAiTool}
              disabled={isToolProcessing}
              className="w-full py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
            >
              {isToolProcessing ? 'Running AI Vision Analysis...' : 'Execute AI Tool'}
            </button>

            {toolResult && (
              <div className="p-3 bg-white border border-[#E2D7CB] rounded-2xl text-[11px] space-y-2 font-mono text-[#2C241D]">
                <p className="text-[9px] font-extrabold text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                  ⚠️ {toolResult.disclaimer}
                </p>
                <pre className="overflow-x-auto max-h-44 text-[10px] text-slate-800">
                  {JSON.stringify(toolResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
