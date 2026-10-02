import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import {
  Compass,
  AlertTriangle,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Play,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { safePercent, safeNumber } from '../utils/formatters';

export const OverviewView: React.FC = () => {
  const { setActiveTab, setGlobeOpen, setAssistantOpen } = useAppStore();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [datasetSummary, setDatasetSummary] = useState<any | null>(null);
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);

  useEffect(() => {
    api.getSurveys().then(setSurveys).catch(() => {});
    api.getDatasetSummary().then(setDatasetSummary).catch(() => {});
    api.getTelemetry().then(setTelemetry).catch(() => {});
    api.getReviewQueue('hazard').then(setReviewQueue).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-ocean-900 via-[#05223d] to-ocean-950 border border-cyan-500/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-400/30 text-cyan-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Operational Mission Control Room
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            AquaSentinel Marine Intelligence Command
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Autonomous Side-Scan Sonar (SSS) processing with acoustic shadow trigonometry,
            10,000-image dataset pipeline, human-in-the-loop verification, and real-time GPU inference.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => setActiveTab('sonar-intelligence')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-2 shadow-glow-cyan"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Sonar Intelligence</span>
            </button>
            <button
              onClick={() => setActiveTab('mission-simulator')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#031322] hover:bg-slate-800 border border-cyan-900/60 text-slate-200 transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Start AUV Mission</span>
            </button>
            <button
              onClick={() => setActiveTab('seabed-3d')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#031322] hover:bg-slate-800 border border-cyan-900/60 text-slate-200 transition-all flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Environmental Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Verified Dataset Images */}
        <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Verified Sonar Dataset</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {datasetSummary ? `${datasetSummary.verified_unique_images} / ${datasetSummary.target_minimum}` : '10,030 Target'}
          </div>
          <div className="text-[11px] text-cyan-400 font-semibold mt-2 flex items-center gap-1">
            <span>SubPipe 10K + AI4Shipwrecks Catalog</span>
          </div>
        </div>

        {/* Metric 2: Active Surveys */}
        <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active Swath Surveys</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{surveys.length} Missions</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Interleaved Swath Coverage</span>
          </div>
        </div>

        {/* Metric 3: Current Seabed Profile */}
        <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Current Seabed Profile</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-extrabold text-white">
            Sandy / Sedimentary
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center justify-between">
            <span>94% Confidence</span>
            <span className="text-slate-400 font-normal">Smooth • Low Noise</span>
          </div>
        </div>

        {/* Metric 4: AI Inference Engine */}
        <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>AI Inference Engine</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">AquaYOLO-v8s</div>
          <div className="text-[11px] text-cyan-300 font-semibold mt-2">
            16.8ms • RTX 4050 (CUDA 13.1)
          </div>
        </div>
      </div>

      {/* Main Grid: Left Recent Missions + Right High Priority Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Surveys Table */}
        <div className="lg:col-span-7 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Active Acoustic Survey Records
            </h3>
            <button
              onClick={() => setActiveTab('ocean-explorer')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {surveys.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveTab('ocean-explorer')}
                className="p-3.5 rounded-xl bg-[#020b14]/70 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{s.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {s.survey_code} • {s.platform}
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-1">
                    {s.sensor_model} ({s.frequency_khz} kHz, {s.range_meters}m Swath)
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {s.status}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                    {s.latitude?.toFixed(3)}°N, {s.longitude?.toFixed(3)}°E
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Urgent Human Review Queue */}
        <div className="lg:col-span-5 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Human-in-the-Loop Queue
              </h3>
              <button
                onClick={() => setActiveTab('review-queue')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <span>Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {reviewQueue.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  onClick={() => setActiveTab('review-queue')}
                  className="p-3 rounded-xl bg-[#020b14]/70 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{d.class_name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Conf: <span className="text-cyan-300 font-mono">{safePercent(d.confidence)}</span> • Uncertainty:{' '}
                      <span className="text-amber-400 font-mono">{safePercent(d.uncertainty_score)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (d.hazard_score || 0) >= 0.8
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      Hazard {safeNumber((d.hazard_score || 0) * 10, 1)}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Human review seals cryptographic SHA-256 evidence chain</span>
            <button
              onClick={() => setActiveTab('review-queue')}
              className="text-cyan-400 font-bold hover:underline"
            >
              Verify Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
