import React, { useEffect, useState } from 'react';
import { api, resolveApiUrl } from '../services/api';
import {
  Layers,
  CheckCircle,
  XCircle,
  Edit3,
  ShieldCheck,
  Hash,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Waves,
  ShieldAlert,
  HelpCircle,
  Cpu
} from 'lucide-react';
import {
  safePercent,
  safeNumber,
  safeCoord,
  formatDimension,
  formatReliefHeight
} from '../utils/formatters';

export const ReviewQueueView: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [filterBy, setFilterBy] = useState('uncertainty');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [relabelClass, setRelabelClass] = useState('Subsea Pipeline');
  const [evidenceChain, setEvidenceChain] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const fetchQueue = () => {
    api.getReviewQueue(filterBy).then((res) => {
      setQueue(res);
      if (res.length > 0) {
        setSelectedItem(res[0]);
      } else {
        setSelectedItem(null);
      }
    });
  };

  useEffect(() => {
    fetchQueue();
  }, [filterBy]);

  const handleDecision = async (action: 'confirmed' | 'rejected' | 'relabeled' | 'man_made' | 'natural' | 'unable_to_verify') => {
    if (!selectedItem) return;
    setSubmitting(true);
    setFeedbackBanner(null);
    try {
      const reviewedClass =
        action === 'man_made'
          ? 'Man-Made Object'
          : action === 'natural'
          ? 'Natural / Geological'
          : action === 'unable_to_verify'
          ? 'Unable to Verify'
          : action === 'relabeled'
          ? relabelClass
          : selectedItem.class_name;

      const res = await api.submitReviewDecision({
        detection_id: selectedItem.id,
        action,
        reviewed_class: reviewedClass,
        reviewer_notes: reviewerNotes || `Expert evaluated in ${selectedItem.environmental_profile?.seabed_type || 'benthic'} environment.`,
        add_to_active_learning: true,
      });

      setFeedbackBanner(res.active_learning_message || 'Added to Active Learning Dataset for Environment-Aware Retraining');
      setReviewerNotes('');
      fetchQueue();
    } catch (err) {
      alert('Review submission failed: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectEvidence = async (detectionId: number) => {
    try {
      const res = await api.getEvidenceChain(detectionId);
      setEvidenceChain(res);
    } catch (err) {
      alert('Failed to load evidence chain: ' + err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#041527] border border-cyan-900/40">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Review Priority Queue ({queue.length} items):</span>
          <div className="flex rounded-xl bg-[#020b14] p-1 border border-slate-800 text-xs">
            {(['uncertainty', 'low_conf', 'hazard'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterBy(mode)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                  filterBy === mode
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Expert feedback directly trains the Environment-Aware active learning pipeline.
        </div>
      </div>

      {/* Active Learning Feedback Notice */}
      {feedbackBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-glow-cyan animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{feedbackBanner}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-300">Active Learning Dataset Updated</span>
        </div>
      )}

      {/* Main Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue List */}
        <div className="lg:col-span-4 rounded-2xl bg-[#041527] border border-cyan-900/40 p-4 space-y-2 max-h-[660px] overflow-y-auto">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending detections in queue. All detections validated!
            </div>
          ) : (
            queue.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isMismatch = (item.environment_compatibility || 0.9) < 0.85;
              return (
                <div
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setEvidenceChain(null); setFeedbackBanner(null); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-glow-cyan'
                      : 'bg-[#020b14]/70 border-slate-800 text-slate-300 hover:border-cyan-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{item.class_name}</span>
                    <span className="font-mono text-cyan-400">{safePercent(item.confidence)}</span>
                  </div>

                  {/* Environmental Context Badge */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate max-w-[150px]">
                      {item.environmental_profile?.seabed_type || 'Sandy Seafloor'}
                    </span>
                    <span className={`font-mono font-semibold ${isMismatch ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {safePercent(item.environment_compatibility || 0.91, 0)} Compat
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>Uncertainty: {safePercent(item.uncertainty_score)}</span>
                    <span className="text-amber-400">Hazard {safeNumber(item.hazard_score * 10, 1)}/10</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Inspection, Environmental Profile, Decision & Evidence Chain */}
        <div className="lg:col-span-8 space-y-4">
          {selectedItem ? (
            <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Candidate Target: {selectedItem.class_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      ID #{selectedItem.id}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Source: {selectedItem.filename} • Detected via AquaNeural-PyTorch-ResNet-1.0
                  </div>
                </div>

                <button
                  onClick={() => handleInspectEvidence(selectedItem.id)}
                  className="px-3 py-1.5 rounded-xl bg-[#020b14] border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 hover:border-cyan-400 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect Evidence Chain</span>
                </button>
              </div>

              {/* Sonar Image Preview */}
              <div className="relative w-full h-64 rounded-xl bg-[#020b14] border border-cyan-950 overflow-hidden flex items-center justify-center">
                {selectedItem.image_url && (
                  <img
                    src={resolveApiUrl(selectedItem.image_url)}
                    alt="Inspection Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <div
                  style={{
                    left: `${safeCoord(selectedItem.bbox_x ?? selectedItem.bbox?.[0]) * 100}%`,
                    top: `${safeCoord(selectedItem.bbox_y ?? selectedItem.bbox?.[1]) * 100}%`,
                    width: `${safeCoord(selectedItem.bbox_w ?? selectedItem.bbox?.[2]) * 100}%`,
                    height: `${safeCoord(selectedItem.bbox_h ?? selectedItem.bbox?.[3]) * 100}%`,
                  }}
                  className="absolute border-2 border-cyan-400 bg-cyan-400/20"
                />
              </div>

              {/* Reason for Review Alert Banner (Section 10) */}
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-600/60 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Reason for Review Required:</span>
                </div>
                <div className="text-[11px] text-amber-200/90 pl-6 leading-relaxed">
                  {selectedItem.review_reason || 'Environment Mismatch: Heterogeneous benthic substrate creates acoustic ambiguity requiring human analyst verification.'}
                </div>
              </div>

              {/* Environmental Profile & Compatibility Summary */}
              <div className="p-3.5 rounded-xl bg-[#020b14] border border-cyan-900/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    Seabed Context: {selectedItem.environmental_profile?.seabed_type || 'Sandy / Sedimentary'}
                  </span>
                  <span className="font-mono font-bold text-cyan-400">
                    {safePercent(selectedItem.environment_compatibility || 0.91, 0)} Compatible
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-[#041527] border border-slate-800">
                    <span className="text-slate-400 block">Texture</span>
                    <span className="font-bold text-slate-200">{selectedItem.environmental_profile?.texture || 'Smooth'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#041527] border border-slate-800">
                    <span className="text-slate-400 block">Variation</span>
                    <span className="font-bold text-slate-200">{selectedItem.environmental_profile?.surface_variation || 'Low'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#041527] border border-slate-800">
                    <span className="text-slate-400 block">Noise</span>
                    <span className="font-bold text-slate-200">{selectedItem.environmental_profile?.sonar_noise || 'Low'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#041527] border border-slate-800">
                    <span className="text-slate-400 block">Clutter</span>
                    <span className="font-bold text-slate-200">{selectedItem.environmental_profile?.clutter_level || 'Low'}</span>
                  </div>
                </div>
              </div>

              {/* Physical Measurements Grid */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Model Confidence</span>
                  <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                    {safePercent(selectedItem.confidence, 1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Target Length & Relief</span>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatDimension(selectedItem.length_meters, selectedItem.length_px, selectedItem.is_calibrated)} (H: {formatReliefHeight(selectedItem.estimated_height_m, selectedItem.is_calibrated)})
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Hazard Level</span>
                  <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                    {safeNumber(selectedItem.hazard_score * 10, 1)} / 10
                  </div>
                </div>
              </div>

              {/* Reviewer Notes & Decision Buttons (Section 10) */}
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Expert notes (e.g. Verified target geometry vs benthic scattering)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#020b14] border border-cyan-900/60 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-slate-500"
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleDecision('man_made')}
                    disabled={submitting}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-glow-cyan"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Verify as Man-Made</span>
                  </button>

                  <button
                    onClick={() => handleDecision('natural')}
                    disabled={submitting}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600/30 border border-cyan-400 hover:bg-cyan-600/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Waves className="w-4 h-4" />
                    <span>Relabel as Natural Seabed</span>
                  </button>

                  <button
                    onClick={() => handleDecision('unable_to_verify')}
                    disabled={submitting}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600/20 border border-rose-500/50 hover:bg-rose-600/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Unable to Verify</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={relabelClass}
                      onChange={(e) => setRelabelClass(e.target.value)}
                      className="px-2.5 py-2 rounded-xl bg-[#020b14] border border-cyan-900 text-xs text-white"
                    >
                      <option value="Subsea Pipeline">Pipeline</option>
                      <option value="Shipwreck / Vessel Ruin">Shipwreck</option>
                      <option value="Mine-Like Contact (MILCO)">MILCO</option>
                      <option value="Non-Mine Bottom Object (NOMBO)">NOMBO</option>
                      <option value="Human Surrogate Target">Human Target</option>
                      <option value="Unclassified Marine Debris / Anomaly">Debris</option>
                    </select>
                    <button
                      onClick={() => handleDecision('relabeled')}
                      disabled={submitting}
                      className="py-2 px-2.5 rounded-xl bg-purple-600/20 border border-purple-400 hover:bg-purple-600/30 text-purple-200 text-xs font-bold transition-all"
                    >
                      Relabel
                    </button>
                  </div>
                </div>
              </div>

              {/* Capability 33: Immutable Cryptographic Evidence Chain */}
              {evidenceChain && (
                <div className="mt-4 p-4 rounded-2xl bg-[#020b14] border border-cyan-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      Capability 33: Immutable SHA-256 Marine Evidence Chain
                    </span>
                    <span className="font-mono text-emerald-400">{evidenceChain.tamper_proof_integrity}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {evidenceChain.immutable_evidence_chain.map((step: any) => (
                      <div key={step.step} className="p-2.5 rounded-xl bg-[#041527] border border-slate-800">
                        <div className="flex justify-between font-semibold text-white text-[11px]">
                          <span>Step {step.step}: {step.title}</span>
                          <span className="text-slate-400 text-[10px]">{step.timestamp.slice(0, 19)}</span>
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400 mt-1 flex items-center gap-1">
                          <Hash className="w-3 h-3 text-cyan-500" />
                          <span>SHA-256: {step.sha256}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-[#041527] border border-slate-800">
              Select an item from the queue to inspect and verify.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
