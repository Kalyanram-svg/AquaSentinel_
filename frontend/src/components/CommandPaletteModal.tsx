import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Search,
  Compass,
  Boxes,
  MapPin,
  FileText,
  Sliders,
  Database,
  Cpu,
  Bot,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { setActiveTab, setAssistantOpen, setGlobeOpen } = useAppStore();

  const commands = [
    { id: 'sonar', name: 'Open Sonar Intelligence & Enhancement', tab: 'sonar-intelligence', icon: Compass, category: 'Core Sonar' },
    { id: 'map', name: 'Interactive Underwater Hazard Map', tab: 'ocean-explorer', icon: MapPin, category: 'Geospatial' },
    { id: 'twin', name: 'Interactive 3D Seabed Digital Twin', tab: 'seabed-3d', icon: Boxes, category: '3D Simulation' },
    { id: 'theater', name: 'Live Sonar Intelligence Theater', tab: 'theater', icon: Activity, category: 'Real-Time Stream' },
    { id: 'simulator', name: 'AUV Mission & Ghost Net Simulator', tab: 'mission-simulator', icon: Sliders, category: 'Simulation' },
    { id: 'review', name: 'Human-in-the-Loop Verification Queue', tab: 'review-queue', icon: Layers, category: 'Quality Assurance' },
    { id: 'training', name: 'AI Research Lab & Training Monitor', tab: 'research-lab', icon: Cpu, category: 'Machine Learning' },
    { id: 'dataset', name: 'Dataset Intelligence Center (10K Target)', tab: 'dataset-center', icon: Database, category: 'Dataset Ops' },
    { id: 'registry', name: 'Model Registry & Edge Arena', tab: 'model-registry', icon: Cpu, category: 'Model Governance' },
    { id: 'reports', name: 'Inspection Reports & Audit Trail', tab: 'reports', icon: FileText, category: 'Compliance' },
    { id: 'globe', name: 'Launch 3D Holographic Globe', action: () => setGlobeOpen(true), icon: Sparkles, category: 'Innovation' },
    { id: 'analyst', name: 'Chat with Conversational Sonar Analyst', action: () => setAssistantOpen(true), icon: Bot, category: 'AI Assistant' },
  ];

  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#041527] border border-cyan-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-cyan-900/50 bg-[#031322]/80">
          <Search className="w-4 h-4 text-cyan-400 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to feature (e.g. 3D Twin, Sonar, Training)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">ESC</span>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No matching commands found.</div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    if (cmd.tab) setActiveTab(cmd.tab);
                    if (cmd.action) cmd.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs text-slate-200 hover:bg-cyan-500/15 hover:text-cyan-300 border border-transparent hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span>{cmd.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{cmd.category}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
