import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  ShieldCheck,
  Database,
  HelpCircle,
  Loader2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { ChatMessage } from '../types';
import { apiClient } from '../api/client';

export const AIAnalystPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hello! I am your **RiskSentinel AI Copilot**.\n\nI am connected directly to your transactions database, abuse ring network graph, anomaly alerts, and model telemetry.\n\nHow can I assist you with return loss prevention today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_actions: [
        'Why was ORD-10239 flagged?',
        'What is our test PR-AUC and net savings?',
        'Tell me about device clusters',
        'Show active anomaly alerts'
      ]
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQueries = [
    "Why was ORD-10239 flagged?",
    "What is our test PR-AUC and net savings?",
    "Tell me about device clusters",
    "Show active anomaly alerts",
    "What is our optimal classification threshold?",
    "How can I bypass fraud detection?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.sendChatMessage(query);
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.reply || 'No response returned.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: res.suggested_actions || []
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `⚠️ **Service Error**: ${err.message || 'Unable to communicate with RiskSentinel assistant.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Defensive Copilot
            </span>
            <span className="text-xs text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected to SQLite DB</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">AI Risk Copilot</h1>
        </div>
      </div>

      {/* Chat Messages Window */}
      <div className="flex-1 overflow-y-auto p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-indigo-400'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-2xl max-w-2xl text-xs space-y-2 leading-relaxed shadow ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line prose-invert">
                {msg.text}
              </div>

              {/* Suggested Actions Buttons */}
              {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {msg.suggested_actions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(act)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition-colors"
                    >
                      {act}
                    </button>
                  ))}
                </div>
              )}

              <div
                className={`text-[10px] text-right font-mono ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3 text-slate-400 text-xs">
            <div className="p-2 rounded-xl bg-slate-800 text-indigo-400 animate-spin">
              <Loader2 className="w-4 h-4" />
            </div>
            <span>RiskSentinel AI is querying database and synthesizing explanation...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 text-xs">
        <span className="text-slate-500 shrink-0 font-medium">Quick Prompts:</span>
        {quickQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            className="px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 whitespace-nowrap transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-2 shrink-0">
        <input
          type="text"
          placeholder="Ask RiskSentinel about orders, models, abuse rings, alerts..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-lg"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
