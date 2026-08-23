import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Send, UserCheck, AlertOctagon, TrendingUp, Cpu } from 'lucide-react';

export const ProductionAiSuiteTab: React.FC = () => {
  // Chatbot State
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Production AI Telemetry online. I monitor workshop bottleneck risks, machine availability, and artisan matching scores. How can I assist?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Worker Match Scoring Tool State
  const [stageName, setStageName] = useState('Woodwork & Carpentry');
  const [workerMatches, setWorkerMatches] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  // Bottlenecks Telemetry State
  const [bottlenecks, setBottlenecks] = useState<any>(null);

  const fetchBottlenecks = async () => {
    try {
      const res = await fetch('/api/ai/detect-bottlenecks');
      if (res.ok) {
        const data = await res.json();
        setBottlenecks(data);
      }
    } catch (e) {
      console.error('Bottleneck fetch error:', e);
    }
  };

  useEffect(() => {
    fetchBottlenecks();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    setInputMsg('');

    const newMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/staff-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (e) {
      console.error('Staff Assistant API error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunWorkerMatching = async () => {
    setIsMatching(true);
    try {
      const res = await fetch('/api/ai/match-workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_name: stageName }),
      });

      if (res.ok) {
        const data = await res.json();
        setWorkerMatches(data.recommendations || []);
      }
    } catch (e) {
      console.error('Worker matching error:', e);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B2C] text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            Production Telemetry AI
          </span>
          <h2 className="text-xl font-extrabold mt-2">Manufacturing Intelligence & AI Suite</h2>
          <p className="text-xs text-[#D9CEBF] mt-1">Worker match scoring, bottleneck predictions, and staff AI copilot.</p>
        </div>
      </div>

      {/* Bottleneck Telemetry Alert */}
      {bottlenecks && (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-amber-600 animate-pulse flex-shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold text-amber-900">
                Current Bottleneck Risk: Stage "{bottlenecks.current_bottleneck_stage}" ({bottlenecks.risk_level})
              </h4>
              <p className="text-[11px] text-amber-800 font-medium">{bottlenecks.recommended_action}</p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-xl">
            Queue: {bottlenecks.pending_queue_count} Builds
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intelligent Worker Match Scoring */}
        <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
            <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#48A63E]" /> Intelligent Worker Match Scoring
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Select Stage for Match Analysis</label>
              <select value={stageName} onChange={(e) => setStageName(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-bold text-xs">
                <option value="Woodwork & Carpentry">Woodwork & Carpentry</option>
                <option value="Upholstery">Upholstery</option>
                <option value="Finishing">Finishing & Sanding</option>
                <option value="Assembly">Assembly & Fitting</option>
              </select>
            </div>

            <button
              onClick={handleRunWorkerMatching}
              disabled={isMatching}
              className="w-full py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md cursor-pointer"
            >
              {isMatching ? 'Calculating Artisan Suitability Scores...' : 'Calculate AI Worker Match Scores'}
            </button>

            {workerMatches.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {workerMatches.map((w) => (
                  <div key={w.worker_id} className="p-3 rounded-2xl border border-[#E2D7CB] bg-[#FAF7F2] flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-extrabold text-[#2C241D]">{w.worker_name}</h5>
                      <p className="text-[10px] text-[#7A6C5E] font-semibold">{w.specialization}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#48A63E]">{w.overall_suitability_score}% Match</span>
                      <span className="block text-[9px] text-[#7A6C5E]">Skill: {w.skill_match_percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Staff Assistant Copilot Chat */}
        <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[400px]">
          <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
            <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#48A63E]" /> Production Staff AI Copilot
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3 max-h-[260px] px-1">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                    m.sender === 'user' ? 'bg-[#48A63E] text-white font-semibold' : 'bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D]'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            {isLoading && <div className="text-xs text-[#7A6C5E] font-bold animate-pulse">Copilot analyzing...</div>}
          </div>

          <form onSubmit={handleSendMessage} className="pt-2 border-t border-[#E2D7CB] flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Ask about workforce, bottleneck risks, or telemetry..."
              className="flex-1 p-2.5 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-semibold"
            />
            <button type="submit" className="p-2.5 rounded-xl bg-[#48A63E] text-white cursor-pointer">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
