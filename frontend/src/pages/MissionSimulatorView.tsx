import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sliders,
  Compass,
  Navigation,
  Wind,
  ShieldAlert,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';

export const MissionSimulatorView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'auv' | 'drift' | 'whatif' | 'route'>('auv');

  // AUV Mission State
  const [auvStep, setAuvStep] = useState(0);
  const [auvTelemetry, setAuvTelemetry] = useState<any | null>(null);

  // Ghost Net Drift State
  const [driftHours, setDriftHours] = useState(24);
  const [driftData, setDriftData] = useState<any | null>(null);

  // What-If State
  const [grazingAngle, setGrazingAngle] = useState(25.0);
  const [frequency, setFrequency] = useState(455.0);
  const [reverb, setReverb] = useState(-18.0);
  const [speckle, setSpeckle] = useState(0.12);
  const [whatIfResults, setWhatIfResults] = useState<any | null>(null);

  // Route Optimizer State
  const [routeData, setRouteData] = useState<any | null>(null);

  useEffect(() => {
    api.getAuvTelemetry(auvStep).then(setAuvTelemetry).catch(() => {});
  }, [auvStep]);

  useEffect(() => {
    api.getGhostNetDrift(driftHours).then(setDriftData).catch(() => {});
  }, [driftHours]);

  useEffect(() => {
    api.runWhatIf({
      grazing_angle_deg: grazingAngle,
      sonar_frequency_khz: frequency,
      seabed_reverberation_db: reverb,
      speckle_noise_sigma: speckle,
    }).then(setWhatIfResults).catch(() => {});
  }, [grazingAngle, frequency, reverb, speckle]);

  useEffect(() => {
    api.getRouteOptimizer().then(setRouteData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#041527] border border-cyan-900/40">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400 mr-2" />
          {[
            { id: 'auv', label: 'AUV Mission Simulator (Cap 21)' },
            { id: 'drift', label: 'Ghost Net Drift Physics (Cap 23)' },
            { id: 'whatif', label: 'What-If Sonar Lab (Cap 24)' },
            { id: 'route', label: 'AI Route Optimizer (Cap 28)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                  : 'bg-[#020b14] border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            HYDRODYNAMIC & ACOUSTIC SIMULATOR
          </span>
          <span className="text-[11px] text-cyan-400 font-mono hidden sm:inline">
            Physics Engine: Lagrangian + Acoustic Ray Acoustics
          </span>
        </div>
      </div>

      {/* Sub-tab 1: AUV Mission Simulator */}
      {activeSubTab === 'auv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                AUV Autonomous Lawnmower Swath Execution
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuvStep((s) => Math.min(20, s + 1))}
                  className="px-3 py-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-all shadow-glow-cyan"
                >
                  Advance AUV (+1 Step)
                </button>
                <button
                  onClick={() => setAuvStep(0)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Waypoints Table */}
            <div className="space-y-2">
              {auvTelemetry?.waypoints.map((wp: any) => {
                const isCurrent = auvTelemetry.current_waypoint === wp.wp;
                return (
                  <div
                    key={wp.wp}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-glow-cyan'
                        : 'bg-[#020b14] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                        {wp.wp}
                      </span>
                      <span className="font-semibold text-white">{wp.leg}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {wp.lat}°N, {wp.lng}°E
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Readout */}
          <div className="lg:col-span-4 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-3">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              AUV Vehicle Telemetry
            </h4>
            {auvTelemetry && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Battery Level:</span>
                  <span className="font-mono text-emerald-400 font-bold">{auvTelemetry.telemetry.battery_pct}%</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Water Depth / Altitude:</span>
                  <span className="font-mono text-white font-bold">{auvTelemetry.telemetry.depth_m}m / {auvTelemetry.telemetry.altitude_m}m</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Swath Coverage Area:</span>
                  <span className="font-mono text-cyan-300 font-bold">{auvTelemetry.telemetry.swath_coverage_sq_km} km²</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Mission Progress:</span>
                  <span className="font-mono text-cyan-400 font-bold">{auvTelemetry.telemetry.completed_pct}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Ghost Net Drift Simulation */}
      {activeSubTab === 'drift' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400" />
                Lagrangian Hydrodynamic Drift Vector Trajectory
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Forecast:</span>
                {[12, 24, 48, 72].map((h) => (
                  <button
                    key={h}
                    onClick={() => setDriftHours(h)}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      driftHours === h ? 'bg-cyan-500 text-slate-950' : 'bg-[#020b14] text-slate-400'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {driftData?.trajectory.map((pt: any) => (
                <div
                  key={pt.hour}
                  className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-cyan-400 font-bold">+{pt.hour}h</span>
                    <span className="text-slate-300">
                      Coords: {pt.lat}°N, {pt.lng}°E
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="text-slate-400">Current: {pt.current_vector_knots} kts</span>
                    <span className={pt.entanglement_risk === 'HIGH' ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                      {pt.entanglement_risk} RISK
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-3">
            <h4 className="text-xs font-bold text-white">Ecological Hazard Advisory</h4>
            <div className="p-3 rounded-xl bg-[#020b14] border border-rose-950 text-xs text-rose-300 leading-relaxed">
              {driftData?.coastal_impact_probability}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Lagrangian particle physics models calculate surface and benthic advection under semi-diurnal tidal cycles.
            </p>
          </div>
        </div>
      )}

      {/* Sub-tab 3: What-If Sonar Laboratory */}
      {activeSubTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Acoustic Physics Parameter Perturbation
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Grazing Angle (°):</span>
                  <span className="text-cyan-300 font-mono">{grazingAngle}°</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={grazingAngle}
                  onChange={(e) => setGrazingAngle(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Acoustic Frequency (kHz):</span>
                  <span className="text-cyan-300 font-mono">{frequency} kHz</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="900"
                  step="50"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Seabed Reverberation (dB):</span>
                  <span className="text-cyan-300 font-mono">{reverb} dB</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="-5"
                  value={reverb}
                  onChange={(e) => setReverb(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-3">
            <h4 className="text-xs font-bold text-white">Theoretical Acoustic Impact</h4>
            {whatIfResults && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Shadow Length Multiplier:</span>
                  <span className="font-mono text-cyan-300 font-bold">{whatIfResults.acoustic_impact.shadow_length_multiplier}x</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Theoretical Resolution:</span>
                  <span className="font-mono text-white font-bold">{whatIfResults.acoustic_impact.theoretical_range_resolution_cm} cm</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Probability of Detection (Pd):</span>
                  <span className="font-mono text-emerald-400 font-bold">{(whatIfResults.acoustic_impact.expected_probability_of_detection * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">False Alarm Rate (Pfa):</span>
                  <span className="font-mono text-amber-400 font-bold">{(whatIfResults.acoustic_impact.expected_probability_of_false_alarm * 100).toFixed(1)}%</span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
                  {whatIfResults.acoustic_impact.interpretation_recommendation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 4: AI Route Optimizer */}
      {activeSubTab === 'route' && (
        <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Boustrophedon Cellular Coverage Path Optimization
            </h3>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              100% Shadow Blindspots Eliminated
            </span>
          </div>

          {routeData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-slate-400">Total Survey Distance:</span>
                <div className="text-base font-bold text-white font-mono mt-1">{routeData.total_transit_distance_km} km</div>
              </div>
              <div className="p-3 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-slate-400">Estimated Mission Time:</span>
                <div className="text-base font-bold text-cyan-300 font-mono mt-1">{routeData.estimated_survey_time_hours} hours</div>
              </div>
              <div className="p-3 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-slate-400">Swath Overlap Guarantee:</span>
                <div className="text-base font-bold text-emerald-400 font-mono mt-1">{routeData.swath_overlap_target_pct}% overlap</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
