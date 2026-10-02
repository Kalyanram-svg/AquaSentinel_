import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api, clearAuthToken } from '../services/api';
import {
  Search,
  Bot,
  Bell,
  Trophy,
  Cpu,
  LogOut,
  Moon,
  Sun,
  Shield,
  Activity,
  Sparkles,
} from 'lucide-react';

interface HeaderNavProps {
  onLogout: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ onLogout }) => {
  const {
    user,
    setAssistantOpen,
    setCommandPaletteOpen,
    setChallengeOpen,
    themeMode,
    toggleThemeMode,
  } = useAppStore();

  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    api.getTelemetry().then(setTelemetry).catch(() => {});
    api.getNotifications().then(setNotifications).catch(() => {});
    const interval = setInterval(() => {
      api.getTelemetry().then(setTelemetry).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#041527]/90 backdrop-blur-xl border-b border-cyan-900/40 px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-[1.5px] shadow-glow-cyan">
            <div className="w-full h-full rounded-[10px] bg-[#041527] flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
                <path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                Aqua<span className="text-cyan-400">Sentinel</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                v1.0 • 50 CAPABILITIES
              </span>
            </div>
            <div className="text-[10px] text-slate-400">SIH26057 • Ministry of Earth Sciences (MoES)</div>
          </div>
        </div>
      </div>

      {/* Center: Live GPU Telemetry Quick Pill */}
      {telemetry && (
        <div className="hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-full bg-[#020b14]/70 border border-cyan-900/60 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 text-cyan-300 font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>RTX 4050 (CUDA 13.1)</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-1 font-mono">
            <span className="text-slate-400">Latency:</span>
            <span className="text-emerald-400 font-semibold">{telemetry.inference_pipeline.avg_latency_ms}ms</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-1 font-mono">
            <span className="text-slate-400">Throughput:</span>
            <span className="text-cyan-400 font-semibold">{telemetry.inference_pipeline.current_throughput_fps} FPS</span>
          </div>
        </div>
      )}

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Global Search Button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#031322] border border-cyan-900/60 hover:border-cyan-500/40 text-slate-300 text-xs transition-all"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">Command Palette</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">⌘K</kbd>
        </button>

        {/* Sonar Challenge Button */}
        <button
          onClick={() => setChallengeOpen(true)}
          title="Interactive Sonar Challenge"
          className="w-9 h-9 rounded-xl bg-[#031322] border border-cyan-900/60 hover:border-amber-400 text-amber-400 flex items-center justify-center transition-all"
        >
          <Trophy className="w-4 h-4" />
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={() => setAssistantOpen(true)}
          title="Conversational Sonar Analyst"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs transition-all shadow-glow-cyan"
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline font-medium">Analyst AI</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-xl bg-[#031322] border border-cyan-900/60 hover:border-cyan-400 text-slate-300 flex items-center justify-center relative transition-all"
          >
            <Bell className="w-4 h-4" />
            {notifications.some((n) => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#041527] border border-cyan-500/30 shadow-2xl p-3 z-50">
              <div className="text-xs font-bold text-white mb-2 pb-2 border-b border-cyan-900/40">
                System Alerts & Notices
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-xl bg-[#020b14] border border-slate-800 text-xs">
                    <div className="font-semibold text-cyan-300 text-[11px]">{n.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-cyan-900/50">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-white">{user?.full_name || 'Dr. Vikram Sen'}</div>
            <div className="text-[10px] text-cyan-400 font-medium">{user?.role || 'Lead Marine Scientist'}</div>
          </div>
          <button
            onClick={() => {
              clearAuthToken();
              onLogout();
            }}
            title="Sign Out"
            className="w-9 h-9 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 flex items-center justify-center transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
