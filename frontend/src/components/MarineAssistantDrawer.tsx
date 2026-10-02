import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Send, Bot, User, Sparkles, HelpCircle, Compass, ShieldAlert } from 'lucide-react';

interface MarineAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId?: number;
}

export const MarineAssistantDrawer: React.FC<MarineAssistantDrawerProps> = ({
  isOpen,
  onClose,
  surveyId,
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; actions?: string[] }>>([
    {
      sender: 'assistant',
      text: 'Greetings. I am your AquaSentinel Conversational Sonar Analyst. How can I assist you with acoustic backscatter interpretation, target shadow measurements, or survey planning today?',
      actions: [
        'How do you calculate object height from sonar shadows?',
        'What are the latest high-hazard detections?',
        'Explain ghost net drift simulation',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg = { sender: 'user' as const, text: q };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.chatAssistant(q, surveyId);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.reply,
          actions: res.suggested_actions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sonar analyst offline or telemetry connection interrupted. Please check backend status.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-[#031322]/95 backdrop-blur-xl border-l border-cyan-500/30 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyan-900/40 bg-[#041527]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Conversational Sonar Analyst
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </h3>
            <p className="text-[10px] text-slate-400">Capabilities 15 & 29 • Acoustic Intelligence AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-glow-cyan'
                  : 'bg-[#04192b] border border-cyan-900/50 text-slate-200 rounded-bl-none'
              }`}
            >
              {m.text}
            </div>

            {/* Suggested Follow-up Actions */}
            {m.actions && m.actions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.actions.map((act, aIdx) => (
                  <button
                    key={aIdx}
                    onClick={() => handleSend(act)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/80 transition-all text-left"
                  >
                    {act}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
            <Bot className="w-4 h-4" />
            <span>Analyzing acoustic parameters...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-cyan-900/40 bg-[#041527]/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask regarding sonar physics, pipelines, hazards..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#020b14] border border-cyan-900/60 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center disabled:opacity-40 transition-all shadow-glow-cyan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
