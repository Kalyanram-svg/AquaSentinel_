import React from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  LayoutDashboard,
  Compass,
  MapPin,
  Layers,
  Boxes,
  Activity,
  Sliders,
  Cpu,
  Database,
  ShieldCheck,
  FileText,
  Sparkles,
} from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sonar-intelligence', label: 'Analyze Sonar', icon: Compass },
    { id: 'seabed-3d', label: 'Environmental Profile', icon: Boxes },
    { id: 'ocean-explorer', label: 'Survey Map', icon: MapPin },
    { id: 'review-queue', label: 'Review Queue', icon: Layers },
    { id: 'reports', label: 'Reports & History', icon: FileText },
    { id: 'dataset-center', label: 'Dataset Center (10K)', icon: Database },
    { id: 'model-registry', label: 'Model Registry', icon: ShieldCheck },
    { id: 'mission-simulator', label: 'Mission Simulator', icon: Sliders },
    { id: 'theater', label: 'Sonar Theater', icon: Activity },
    { id: 'research-lab', label: 'AI Research Lab', icon: Cpu },
    { id: 'showcase', label: 'Innovation Showcase', icon: Sparkles },
  ];

  return (
    <aside className="w-64 bg-[#031322]/95 border-r border-cyan-900/40 p-4 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400/80">
          Command Center Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#041527]/70 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-[#020b14] border border-cyan-950 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white text-[11px]">System Status</span>
        </div>
        <div className="text-[10px] text-slate-400">All 50 Capabilities Active • MoES AI Online</div>
      </div>
    </aside>
  );
};
