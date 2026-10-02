import React, { useState, useEffect, useRef } from 'react';
import { api, resolveApiUrl } from '../services/api';
import {
  Upload,
  Sliders,
  Sparkles,
  Eye,
  Ruler,
  FileDown,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Maximize2,
  Layers,
  ShieldAlert,
  ArrowRight,
  Waves,
  Cpu,
  CheckSquare,
  HelpCircle,
  XCircle,
  Edit3,
  Loader2
} from 'lucide-react';
import {
  safePercent,
  safeNumber,
  safeCoord,
  formatDimension,
  formatReliefHeight
} from '../utils/formatters';

export const SonarIntelligenceView: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'enhanced' | 'detections' | 'saliency' | 'split'>('detections');
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [generatingSaliency, setGeneratingSaliency] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  // Environmental context & scenario overrides
  const [scenarioOverride, setScenarioOverride] = useState<string>('auto');
  const [currentEnvProfile, setCurrentEnvProfile] = useState<any | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Enhancement controls (Capability 2)
  const [claheClip, setClaheClip] = useState(2.5);
  const [tileGrid, setTileGrid] = useState(8);
  const [speckleFilter, setSpeckleFilter] = useState(true);
  const [contrastStretch, setContrastStretch] = useState(true);
  const [colormap, setColormap] = useState<'sonar_copper' | 'sonar_amber' | 'ocean_deep' | 'grayscale'>('sonar_copper');

  // Sonar Physics parameters & Calibration Gating (Capability 8)
  const [altitude, setAltitude] = useState(12.0);
  const [rangeM, setRangeM] = useState(75.0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [confidenceThresh, setConfidenceThresh] = useState(0.40);
  const [uncertaintyThresh, setUncertaintyThresh] = useState(0.40);
  const [selectedDetection, setSelectedDetection] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch initial seeded images from survey 1
    api.getSurveyDetail(1).then((survey) => {
      if (survey.images && survey.images.length > 0) {
        setImages(survey.images);
        const first = survey.images[0];
        selectImage(first);
      }
    }).catch(() => {});
  }, []);

  const selectImage = async (img: any, overrideScenario?: string) => {
    const normalizedImg = {
      ...img,
      enhanced_path: img.enhanced_path || img.enhanced_url,
    };
    setSelectedImage(normalizedImg);
    setReviewMessage(null);

    const scenarioToUse = overrideScenario !== undefined ? overrideScenario : (scenarioOverride === 'auto' ? undefined : scenarioOverride);

    try {
      const detRes = await api.detectObjects(img.id, {
        model_version: 'AquaNeural-PyTorch-ResNet-1.0',
        confidence_threshold: confidenceThresh,
        uncertainty_threshold: uncertaintyThresh,
        is_calibrated: isCalibrated,
        sensor_altitude: altitude,
        swath_range: rangeM,
        enable_saliency: false,
        scenario_override: scenarioToUse
      });

      setDetections(detRes.detections || []);
      if (detRes.environmental_profile) {
        setCurrentEnvProfile(detRes.environmental_profile);
      } else if (detRes.detections?.[0]?.environmental_profile) {
        setCurrentEnvProfile(detRes.detections[0].environmental_profile);
      }
      if (detRes.detections && detRes.detections.length > 0) {
        setSelectedDetection(detRes.detections[0]);
      } else {
        setSelectedDetection(null);
      }
      if (detRes.saliency_url) {
        setSelectedImage((prev: any) => ({ ...prev, saliency_path: detRes.saliency_url }));
      }
    } catch {
      setDetections(img.detections || []);
      if (img.detections?.length > 0) setSelectedDetection(img.detections[0]);
      else setSelectedDetection(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('survey_id', '1');

    setLoading(true);
    setUploadStatus("Uploading sonar image...");
    try {
      const res = await api.uploadSonar(formData);
      const normalizedImg = {
        ...res,
        enhanced_path: res.enhanced_path || res.enhanced_url,
      };
      setImages((prev) => [normalizedImg, ...prev]);
      setSelectedImage(normalizedImg);
      setDetections([]);
      setSelectedDetection(null);
      setReviewMessage(null);

      setUploadStatus("Ingestion complete. Analyzing seabed & running AI detection...");
      // Automatically evaluate target detection with environment profiling
      const scenarioToUse = scenarioOverride === 'auto' ? undefined : scenarioOverride;
      const detRes = await api.detectObjects(res.id, {
        model_version: 'AquaNeural-PyTorch-ResNet-1.0',
        confidence_threshold: confidenceThresh,
        uncertainty_threshold: uncertaintyThresh,
        is_calibrated: isCalibrated,
        sensor_altitude: altitude,
        swath_range: rangeM,
        enable_saliency: false,
        scenario_override: scenarioToUse
      });

      setDetections(detRes.detections || []);
      if (detRes.environmental_profile) {
        setCurrentEnvProfile(detRes.environmental_profile);
      } else if (detRes.detections?.[0]?.environmental_profile) {
        setCurrentEnvProfile(detRes.detections[0].environmental_profile);
      }
      if (detRes.detections && detRes.detections.length > 0) {
        setSelectedDetection(detRes.detections[0]);
      }
      if (detRes.saliency_url) {
        setSelectedImage((prev: any) => ({ ...prev, saliency_path: detRes.saliency_url }));
      }
      setViewMode('detections');
    } catch (err: any) {
      alert('Upload or ATR evaluation note: ' + (err.message || err));
    } finally {
      setLoading(false);
      setUploadStatus(null);
    }
  };

  const handleApplyEnhancement = async () => {
    if (!selectedImage) return;
    setEnhancing(true);
    try {
      const res = await api.enhanceSonar(selectedImage.id, {
        apply_clahe: true,
        clahe_clip_limit: claheClip,
        clahe_tile_grid_size: tileGrid,
        speckle_reduction: speckleFilter,
        bilateral_filter: true,
        contrast_stretch: contrastStretch,
        colormap,
      });
      setSelectedImage((prev: any) => ({ ...prev, enhanced_path: res.enhanced_url }));
    } catch (err) {
      alert('Enhancement failed: ' + err);
    } finally {
      setEnhancing(false);
    }
  };

  const handleRunInference = async (override?: string) => {
    if (!selectedImage) return;
    setLoading(true);
    setReviewMessage(null);
    try {
      const scenarioParam = override !== undefined ? override : (scenarioOverride === 'auto' ? undefined : scenarioOverride);
      const res = await api.detectObjects(selectedImage.id, {
        model_version: 'AquaNeural-PyTorch-ResNet-1.0',
        confidence_threshold: confidenceThresh,
        uncertainty_threshold: uncertaintyThresh,
        is_calibrated: isCalibrated,
        sensor_altitude: altitude,
        swath_range: rangeM,
        enable_saliency: false,
        scenario_override: scenarioParam
      });
      setDetections(res.detections || []);
      if (res.environmental_profile) {
        setCurrentEnvProfile(res.environmental_profile);
      } else if (res.detections?.[0]?.environmental_profile) {
        setCurrentEnvProfile(res.detections[0].environmental_profile);
      }
      if (res.detections && res.detections.length > 0) {
        setSelectedDetection(res.detections[0]);
      } else {
        setSelectedDetection(null);
      }
      if (res.saliency_url) {
        setSelectedImage((prev: any) => ({ ...prev, saliency_path: res.saliency_url }));
      }
      setViewMode('detections');
    } catch (err) {
      alert('Detection failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectViewMode = async (mode: 'raw' | 'enhanced' | 'detections' | 'saliency' | 'split') => {
    setViewMode(mode);
    if (mode === 'saliency' && selectedImage && !selectedImage.saliency_path && !selectedImage.saliency_url) {
      setGeneratingSaliency(true);
      try {
        const explainRes = await api.explainDetection(selectedImage.id, selectedDetection?.id);
        if (explainRes.saliency_url) {
          setSelectedImage((prev: any) => ({ ...prev, saliency_path: explainRes.saliency_url }));
        }
      } catch (err: any) {
        console.warn('Explainability on-demand note:', err);
      } finally {
        setGeneratingSaliency(false);
      }
    }
  };

  const handleQuickReview = async (action: 'man_made' | 'natural' | 'unable_to_verify') => {
    if (!selectedDetection) return;
    try {
      const res = await api.submitReviewDecision({
        detection_id: selectedDetection.id,
        action,
        reviewed_class: action === 'man_made' ? 'Man-Made Object' : action === 'natural' ? 'Natural / Geological' : 'Unable to Verify',
        reviewer_notes: `Operator validated in ${effectiveEnvProfile.seabed_type} environment context.`,
        add_to_active_learning: true
      });
      setReviewMessage(res.active_learning_message || 'Added to Active Learning Dataset for Environment-Aware Retraining');
      // Refresh detection
      setSelectedDetection((prev: any) => ({
        ...prev,
        review_status: action === 'man_made' ? 'confirmed' : action === 'natural' ? 'relabeled' : 'rejected',
        reviewed_class: res.reviewed_class
      }));
    } catch (err) {
      alert('Review action failed: ' + err);
    }
  };

  const effectiveEnvProfile = currentEnvProfile || selectedDetection?.environmental_profile || {
    seabed_type: "Sandy / Sedimentary",
    texture: "Smooth",
    surface_variation: "Low",
    sonar_noise: "Low",
    clutter_level: "Low",
    environmental_confidence: 0.94,
    description: "Homogeneous sedimentary seafloor with minimal acoustic clutter; ideal acoustic propagation and shadow fidelity."
  };

  const rawUrl = selectedImage ? resolveApiUrl(`/api/sonar/raw/${selectedImage.id}?v=${selectedImage.uploaded_at || selectedImage.id}`) : '';
  const enhancedUrl = resolveApiUrl(selectedImage?.enhanced_path || selectedImage?.enhanced_url) || rawUrl;
  const saliencyUrl = resolveApiUrl(selectedImage?.saliency_path || selectedImage?.saliency_url) || enhancedUrl;

  const getActiveImageSrc = () => {
    if (!selectedImage) return '';
    if (viewMode === 'raw') return rawUrl;
    if (viewMode === 'saliency') return saliencyUrl;
    return enhancedUrl;
  };

  return (
    <div className="space-y-6">
      {/* 8-Phase Environment-Aware Workflow Stepper (Section 25) */}
      <div className="p-3.5 rounded-2xl bg-[#041527] border border-cyan-900/40 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] text-[11px] gap-2">
          {/* Step 1 */}
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold shrink-0">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>SSS Ingestion</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 2 */}
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold shrink-0">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Image Cleaning</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 3 */}
          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold shrink-0 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-700/50">
            <span className="w-5 h-5 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Environmental Profile</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 4 */}
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold shrink-0">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[10px] font-bold">4</span>
            <span>Layer 1: Identification</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 5 */}
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold shrink-0">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[10px] font-bold">5</span>
            <span>Layer 2: Classification</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 6 */}
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold shrink-0 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-700/50">
            <span className="w-5 h-5 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center text-[10px] font-bold">6</span>
            <span>Compatibility Gate</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 7 */}
          <div className="flex items-center gap-1.5 text-purple-300 font-semibold shrink-0">
            <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-[10px] font-bold">7</span>
            <span>Final Decision</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 8 */}
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold shrink-0">
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold">8</span>
            <span>Active Learning</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#041527] border border-cyan-900/40">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 flex items-center gap-2 transition-all shadow-glow-cyan"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{uploadStatus || 'Upload SSS Image'}</span>
          </button>

          {/* Quick Preloaded Sonar Pings */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-slate-400 font-semibold px-2">Pings:</span>
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => selectImage(img)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedImage?.id === img.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-[#020b14] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {img.filename.replace('.png', '').replace('SSS_Ping_Line_', 'Ping ')}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Scenario Preset Switcher (Sections 4 & 5) */}
        <div className="flex items-center gap-1.5 bg-[#020b14] p-1.5 rounded-xl border border-cyan-900/60 text-xs">
          <span className="text-[10px] text-cyan-400 font-bold px-2 uppercase tracking-wider">Demo Scenario:</span>
          <button
            onClick={() => { setScenarioOverride('auto'); handleRunInference(undefined); }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              scenarioOverride === 'auto' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => { setScenarioOverride('sandy'); handleRunInference('sandy'); }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              scenarioOverride === 'sandy' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:text-white'
            }`}
          >
            A: Sandy (91%)
          </button>
          <button
            onClick={() => { setScenarioOverride('rocky'); handleRunInference('rocky'); }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              scenarioOverride === 'rocky' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-400 hover:text-white'
            }`}
          >
            B: Rocky (68%)
          </button>
          <button
            onClick={() => { setScenarioOverride('variable'); handleRunInference('variable'); }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              scenarioOverride === 'variable' ? 'bg-rose-500 text-white font-bold' : 'text-rose-400 hover:text-white'
            }`}
          >
            C: Variable (39%)
          </button>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-[#020b14] p-1 border border-cyan-900/60 text-xs">
            <button
              onClick={() => handleSelectViewMode('raw')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'raw' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw SSS
            </button>
            <button
              onClick={() => handleSelectViewMode('enhanced')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'enhanced' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enhanced
            </button>
            <button
              onClick={() => handleSelectViewMode('detections')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'detections' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overlays
            </button>
            <button
              onClick={() => handleSelectViewMode('saliency')}
              disabled={generatingSaliency}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'saliency' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {generatingSaliency && <Loader2 className="w-3 h-3 animate-spin" />}
              Grad-CAM
            </button>
            <button
              onClick={() => handleSelectViewMode('split')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'split' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
          </div>

          <button
            onClick={() => handleRunInference()}
            disabled={loading || !selectedImage}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 flex items-center gap-2 transition-all shadow-glow-cyan"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sonar Viewport */}
        <div className="lg:col-span-8 rounded-2xl bg-[#041527] border border-cyan-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-3 px-1">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-white">{selectedImage?.filename || 'No Image Loaded'}</span>
              {selectedImage && (
                <span className="text-slate-500">
                  ({selectedImage.width}x{selectedImage.height} • SHA: {selectedImage.sha256_hash?.slice(0, 8)}...)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isCalibrated
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {isCalibrated ? 'CALIBRATED METRIC SCALE' : 'UNCALIBRATED PIXEL SCALE'}
              </span>
              <span className="text-cyan-400 font-bold">
                {detections.length} Acoustic Contact(s)
              </span>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative w-full aspect-[4/3] rounded-xl bg-[#020b14] border border-cyan-950 overflow-hidden flex items-center justify-center">
            {selectedImage ? (
              viewMode === 'split' ? (
                /* Side-by-Side Dual Comparison View */
                <div className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-black">
                  <div className="relative w-full h-full border border-slate-800 rounded overflow-hidden">
                    <img src={rawUrl} alt="Raw Sonar" className="w-full h-full object-contain" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-slate-300 text-[10px] font-mono">
                      Raw Acoustic Matrix
                    </span>
                  </div>
                  <div className="relative w-full h-full border border-slate-800 rounded overflow-hidden">
                    <img src={enhancedUrl} alt="Enhanced Sonar" className="w-full h-full object-contain" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-cyan-300 text-[10px] font-mono">
                      Enhanced & Overlaid
                    </span>
                    {detections.map((d) => {
                      const isSelected = selectedDetection?.id === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDetection(d)}
                          style={{
                            left: `${safeCoord(d.bbox_x) * 100}%`,
                            top: `${safeCoord(d.bbox_y) * 100}%`,
                            width: `${safeCoord(d.bbox_w) * 100}%`,
                            height: `${safeCoord(d.bbox_h) * 100}%`,
                          }}
                          className={`absolute border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-400/20'
                              : 'border-rose-500 bg-rose-500/10'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Single Viewport View */
                <>
                  <img
                    src={getActiveImageSrc()}
                    alt="Side-Scan Sonar"
                    className="w-full h-full object-contain"
                  />

                  {/* Overlaid Bounding Boxes */}
                  {viewMode === 'detections' &&
                    detections.map((d) => {
                      const isSelected = selectedDetection?.id === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDetection(d)}
                          style={{
                            left: `${safeCoord(d.bbox_x) * 100}%`,
                            top: `${safeCoord(d.bbox_y) * 100}%`,
                            width: `${safeCoord(d.bbox_w) * 100}%`,
                            height: `${safeCoord(d.bbox_h) * 100}%`,
                          }}
                          className={`absolute border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-400/25 shadow-glow-cyan'
                              : d.requires_human_review
                              ? 'border-amber-400 bg-amber-400/10 hover:border-amber-300'
                              : 'border-rose-500 bg-rose-500/10 hover:border-cyan-300'
                          }`}
                        >
                          <span
                            className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950'
                                : d.requires_human_review
                                ? 'bg-amber-600 text-slate-950'
                                : 'bg-rose-600'
                            }`}
                          >
                            {d.class_name} ({safePercent(d.confidence)})
                            {d.requires_human_review && ' [Review]'}
                          </span>
                        </div>
                      );
                    })}
                </>
              )
            ) : (
              <div className="text-center text-slate-500 text-xs">
                Select a sample above or upload an SSS image to begin.
              </div>
            )}
          </div>

          {/* Bottom Viewport Legend & Status */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                Target Highlight
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                Review Flagged Contact
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                Selected ROI
              </span>
            </div>
            <div className="font-mono text-cyan-300">
              {isCalibrated
                ? `Calibrated: 0.05 m/px @ ${altitude}m Alt, ${rangeM}m Range`
                : 'Uncalibrated Sonar - Reporting Pixel Units'}
            </div>
          </div>
        </div>

        {/* Right Panel: Environmental Profile + Compatibility + Decision Banner */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Current Seabed Environmental Profile (Section 2) */}
          <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Current Seabed Profile</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                {safePercent(effectiveEnvProfile.environmental_confidence, 0)} Confidence
              </span>
            </div>

            <div>
              <div className="text-xs font-extrabold text-white">{effectiveEnvProfile.seabed_type}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{effectiveEnvProfile.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Texture</span>
                <span className="font-bold text-slate-200">{effectiveEnvProfile.texture}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Surface Variation</span>
                <span className="font-bold text-slate-200">{effectiveEnvProfile.surface_variation}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Sonar Noise</span>
                <span className="font-bold text-slate-200">{effectiveEnvProfile.sonar_noise}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Clutter Level</span>
                <span className="font-bold text-slate-200">{effectiveEnvProfile.clutter_level}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Environment-Object Compatibility & Final Decision (Section 3 & 7) */}
          <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Object–Environment Compatibility
              </h3>
              {selectedDetection && (
                <span className={`text-xs font-extrabold font-mono ${
                  (selectedDetection.environment_compatibility || 0.91) >= 0.85
                    ? 'text-emerald-400'
                    : (selectedDetection.environment_compatibility || 0.68) >= 0.60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}>
                  {safePercent(selectedDetection.environment_compatibility || 0.91, 0)} Compatible
                </span>
              )}
            </div>

            {selectedDetection ? (
              <div className="space-y-3">
                {/* 2-Layer AI Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">AI Layer 1</span>
                    <span className="font-bold text-white text-[11px]">Candidate Identified</span>
                    <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">ROI Highlight-Shadow</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">AI Layer 2</span>
                    <span className="font-bold text-white text-[11px] truncate block">{selectedDetection.class_name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">{safePercent(selectedDetection.confidence, 1)} Conf</span>
                  </div>
                </div>

                {/* Final Decision Banner (Section 7) */}
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  selectedDetection.decision_code === 'accepted' || (!selectedDetection.requires_human_review && (selectedDetection.environment_compatibility || 0.91) >= 0.85)
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : selectedDetection.decision_code === 'unable_to_verify' || (selectedDetection.environment_compatibility || 0) < 0.50
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                    {selectedDetection.decision_code === 'accepted' || (!selectedDetection.requires_human_review && (selectedDetection.environment_compatibility || 0.91) >= 0.85) ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Accepted: {selectedDetection.category || 'Man-Made Object'}</span>
                      </>
                    ) : selectedDetection.decision_code === 'unable_to_verify' || (selectedDetection.environment_compatibility || 0) < 0.50 ? (
                      <>
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Unable to Verify → Human Expert Review</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Environment Mismatch → Human Review Required</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                    {selectedDetection.review_reason || (
                      selectedDetection.decision_code === 'accepted' || (!selectedDetection.requires_human_review)
                        ? 'High geometric acoustic contrast verified against smooth sedimentary seafloor.'
                        : 'Substrate acoustic scattering introduces ambiguity requiring analyst confirmation.'
                    )}
                  </div>
                </div>

                {/* Quick Review Feedback Bar */}
                {reviewMessage ? (
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{reviewMessage}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleQuickReview('man_made')}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-[11px] font-bold transition-all"
                    >
                      Verify Man-Made
                    </button>
                    <button
                      onClick={() => handleQuickReview('natural')}
                      className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-[11px] font-bold transition-all"
                    >
                      Relabel Natural
                    </button>
                    <button
                      onClick={() => handleQuickReview('unable_to_verify')}
                      className="flex-1 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400 text-rose-300 text-[11px] font-bold transition-all"
                    >
                      Unverified
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                {detections.length === 0
                  ? 'Zero acoustic contacts. Flat sedimentary seabed verified without anomalous hazards.'
                  : 'Select an acoustic contact to inspect compatibility & decision.'}
              </div>
            )}
          </div>

          {/* Card 3: Acoustic Contact Telemetry */}
          {selectedDetection && (
            <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Acoustic Physics Telemetry
                </span>
                <span className="font-mono text-cyan-400">ID #{selectedDetection.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-[10px] text-slate-400">Target Length</span>
                  <div className="font-bold text-white font-mono mt-0.5">
                    {formatDimension(
                      selectedDetection.length_meters,
                      selectedDetection.length_px,
                      selectedDetection.is_calibrated
                    )}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-[10px] text-slate-400">Relief Height</span>
                  <div className="font-bold text-emerald-400 font-mono mt-0.5">
                    {formatReliefHeight(
                      selectedDetection.estimated_height_m,
                      selectedDetection.is_calibrated
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shadow Extent:</span>
                  <span className="font-mono text-slate-200">
                    {safeNumber(selectedDetection.shadow_length_px, 0, '0')} px
                    {selectedDetection.is_calibrated && selectedDetection.shadow_length_meters
                      ? ` (~${safeNumber(selectedDetection.shadow_length_meters, 2)}m)`
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Epistemic Uncertainty:</span>
                  <span className="font-mono text-cyan-300">
                    {safePercent(selectedDetection.uncertainty_score, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hazard Prioritization:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {safeNumber(selectedDetection.hazard_score * 10, 1)} / 10
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
