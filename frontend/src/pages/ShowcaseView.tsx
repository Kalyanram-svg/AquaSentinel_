import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Compass,
  Boxes,
  Activity,
  Award,
} from 'lucide-react';

export const ShowcaseView: React.FC = () => {
  const {
    setActiveTab,
    setGlobeOpen,
    setAssistantOpen,
    setChallengeOpen,
    setCommandPaletteOpen,
  } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<'all' | 'core' | 'advanced' | 'innovation'>('all');

  const capabilities = [
    // Core 1-18
    { id: 1, name: 'AI-Powered Sonar Image Detection', cat: 'core', tab: 'sonar-intelligence' },
    { id: 2, name: 'Sonar Image Enhancement (CLAHE & Speckle)', cat: 'core', tab: 'sonar-intelligence' },
    { id: 3, name: 'Multi-Class Object Classification', cat: 'core', tab: 'sonar-intelligence' },
    { id: 4, name: 'Batch Sonar Processing', cat: 'core', tab: 'sonar-intelligence' },
    { id: 5, name: 'Confidence Scoring & False-Positive Filtering', cat: 'core', tab: 'review-queue' },
    { id: 6, name: 'Unknown Anomaly Detection', cat: 'core', tab: 'sonar-intelligence' },
    { id: 7, name: 'Explainable AI (Grad-CAM Saliency)', cat: 'core', tab: 'sonar-intelligence' },
    { id: 8, name: 'Object Measurement (Shadow Trigonometry)', cat: 'core', tab: 'sonar-intelligence' },
    { id: 9, name: 'Interactive Underwater Hazard Map', cat: 'core', tab: 'ocean-explorer' },
    { id: 10, name: 'Geotagged Detection Reports', cat: 'core', tab: 'ocean-explorer' },
    { id: 11, name: 'Survey Coverage Visualization', cat: 'core', tab: 'ocean-explorer' },
    { id: 12, name: 'Human-in-the-Loop Verification', cat: 'core', tab: 'review-queue' },
    { id: 13, name: 'Automated PDF, CSV & JSON Reporting', cat: 'core', tab: 'reports' },
    { id: 14, name: 'Searchable Survey History', cat: 'core', tab: 'reports' },
    { id: 15, name: 'AI Marine Research Assistant', cat: 'core', tab: 'assistant' },
    { id: 16, name: 'Survey Comparison', cat: 'core', tab: 'ocean-explorer' },
    { id: 17, name: 'Detection Prioritization (Hazard Scoring)', cat: 'core', tab: 'review-queue' },
    { id: 18, name: 'Edge AI Optimization (ONNX INT8)', cat: 'core', tab: 'model-registry' },

    // Advanced 19-30
    { id: 19, name: 'Live Sonar Intelligence Theater', cat: 'advanced', tab: 'theater' },
    { id: 20, name: 'Interactive 3D Seabed Digital Twin', cat: 'advanced', tab: 'seabed-3d' },
    { id: 21, name: 'AUV Mission Simulator', cat: 'advanced', tab: 'mission-simulator' },
    { id: 22, name: 'AI Uncertainty & Evidence Explorer', cat: 'advanced', tab: 'review-queue' },
    { id: 23, name: 'Ghost Net Drift Simulation', cat: 'advanced', tab: 'mission-simulator' },
    { id: 24, name: 'What-If Sonar Laboratory', cat: 'advanced', tab: 'mission-simulator' },
    { id: 25, name: 'Self-Improving AI Feedback Loop', cat: 'advanced', tab: 'review-queue' },
    { id: 26, name: 'Intelligent Mission Control Room', cat: 'advanced', tab: 'overview' },
    { id: 27, name: 'Acoustic Evidence Replay', cat: 'advanced', tab: 'theater' },
    { id: 28, name: 'AI Survey Route Optimizer', cat: 'advanced', tab: 'mission-simulator' },
    { id: 29, name: 'Conversational Sonar Analyst', cat: 'advanced', tab: 'assistant' },
    { id: 30, name: 'Edge AI Performance Arena', cat: 'advanced', tab: 'model-registry' },

    // Innovation 31-50
    { id: 31, name: 'Guided AquaSentinel Mission Experience', cat: 'innovation', tab: 'showcase' },
    { id: 32, name: 'Interactive Holographic Globe', cat: 'innovation', tab: 'globe' },
    { id: 33, name: 'AI Detection Evidence Chain (SHA-256)', cat: 'innovation', tab: 'review-queue' },
    { id: 34, name: 'Confidence Calibration Lab (ECE)', cat: 'innovation', tab: 'research-lab' },
    { id: 35, name: 'Sonar Image Forensics Workspace', cat: 'innovation', tab: 'sonar-intelligence' },
    { id: 36, name: 'AI Model Comparison Arena', cat: 'innovation', tab: 'model-registry' },
    { id: 37, name: 'Digital Twin Time Machine (4D Sediment)', cat: 'innovation', tab: 'seabed-3d' },
    { id: 38, name: 'Marine Ecological Impact Explorer', cat: 'innovation', tab: 'mission-simulator' },
    { id: 39, name: 'Mission Scenario Builder', cat: 'innovation', tab: 'mission-simulator' },
    { id: 40, name: 'Interactive Sonar Challenge Mode', cat: 'innovation', tab: 'challenge' },
    { id: 41, name: 'Live System Telemetry (RTX 4050)', cat: 'innovation', tab: 'overview' },
    { id: 42, name: 'Smart Demonstration Mode', cat: 'innovation', tab: 'overview' },
    { id: 43, name: 'Context-Aware Workspace', cat: 'innovation', tab: 'overview' },
    { id: 44, name: 'Global Command Palette (Ctrl+K)', cat: 'innovation', tab: 'palette' },
    { id: 45, name: 'Activity and Audit Center', cat: 'innovation', tab: 'reports' },
    { id: 46, name: 'Dataset Health Center (10K Target)', cat: 'innovation', tab: 'dataset-center' },
    { id: 47, name: 'Accessibility & Multilingual UI', cat: 'innovation', tab: 'overview' },
    { id: 48, name: 'Smart Notification Center', cat: 'innovation', tab: 'overview' },
    { id: 49, name: 'Exportable Mission Presentation', cat: 'innovation', tab: 'reports' },
    { id: 50, name: 'Innovation Showcase Mode', cat: 'innovation', tab: 'showcase' },
  ];

  const filtered = capabilities.filter(
    (c) => activeCategory === 'all' || c.cat === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-cyan-950 via-[#041d33] to-[#020b14] border border-cyan-400/40 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-900/60 border border-cyan-400 text-cyan-300 mb-3">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Smart India Hackathon SIH26057 • Complete 50 Capabilities
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            AquaSentinel Innovation & Compliance Showcase
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Automated underwater marine debris and anomaly detection platform developed for the
            Ministry of Earth Sciences (MoES). Combines 10,000-image dataset architecture, PyTorch GPU AI training,
            trigonometric shadow measurements, and human verification.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setActiveTab('sonar-intelligence')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-2 transition-all shadow-glow-cyan"
            >
              <span>1-Click Evaluator Walkthrough</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#041527] border border-cyan-900/40 w-fit text-xs font-semibold">
        {[
          { id: 'all', label: 'All 50 Capabilities' },
          { id: 'core', label: 'Core Sonar (1–18)' },
          { id: 'advanced', label: 'Advanced & Simulation (19–30)' },
          { id: 'innovation', label: 'Innovation (31–50)' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveCategory(f.id as any)}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === f.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 50 Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => {
              if (c.tab === 'globe') setGlobeOpen(true);
              else if (c.tab === 'assistant') setAssistantOpen(true);
              else if (c.tab === 'challenge') setChallengeOpen(true);
              else if (c.tab === 'palette') setCommandPaletteOpen(true);
              else setActiveTab(c.tab);
            }}
            className="p-3.5 rounded-2xl bg-[#041527] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all flex items-center justify-between group text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 border border-cyan-800">
                {c.id}
              </span>
              <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                {c.name}
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
