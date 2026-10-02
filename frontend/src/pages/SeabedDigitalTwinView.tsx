import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { api } from '../services/api';
import {
  Boxes,
  Layers,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Waves,
  Eye,
  Info
} from 'lucide-react';
import { safePercent } from '../utils/formatters';

interface ScenarioInfo {
  id: string;
  code: string;
  name: string;
  seabed_type: string;
  texture: string;
  surface_variation: string;
  sonar_noise: string;
  clutter_level: string;
  environmental_confidence: number;
  expected_object: string;
  expected_object_confidence: number;
  expected_compatibility: number;
  expected_decision: string;
  decision_badge: string;
  status_color: string;
  description: string;
}

export const SeabedDigitalTwinView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [twinData, setTwinData] = useState<any | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<any[]>([]);
  const [activeScenario, setActiveScenario] = useState<string>('scenario_a');

  // Load scenarios and baseline twin data
  useEffect(() => {
    api.getSeabedScenarios().then((res) => {
      if (res.scenarios) setScenarios(res.scenarios);
      if (res.comparison_matrix) setComparisonMatrix(res.comparison_matrix);
    }).catch(() => {});

    api.getDigitalTwin().then(setTwinData).catch(() => {});
  }, []);

  const currentScenario = scenarios.find((s) => s.id === activeScenario) || {
    id: 'scenario_a',
    code: 'sandy',
    name: 'Scenario A – Familiar Seabed',
    seabed_type: 'Sandy / Sedimentary',
    texture: 'Smooth',
    surface_variation: 'Low',
    sonar_noise: 'Low',
    clutter_level: 'Low',
    environmental_confidence: 0.94,
    expected_object: 'Man-Made Object',
    expected_object_confidence: 0.93,
    expected_compatibility: 0.91,
    expected_decision: 'Man-Made Object',
    decision_badge: 'Accepted',
    status_color: 'emerald',
    description: 'Homogeneous sedimentary seafloor with minimal acoustic clutter; ideal acoustic propagation and shadow fidelity.'
  };

  // Three.js 3D Seabed Bathymetric Visualization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    container.innerHTML = '';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02101e, 0.035);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 16, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const gridRes = 32;
    const geo = new THREE.PlaneGeometry(28, 28, gridRes - 1, gridRes - 1);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    // Adapt terrain geometry based on active scenario roughness
    const roughnessMultiplier = activeScenario === 'scenario_a' ? 0.35 : activeScenario === 'scenario_b' ? 1.6 : 2.4;
    const noiseFreq = activeScenario === 'scenario_a' ? 0.2 : activeScenario === 'scenario_b' ? 0.5 : 0.8;

    for (let i = 0; i < pos.count; i++) {
      const r = Math.floor(i / gridRes);
      const c = i % gridRes;
      let elevation = 0;
      if (twinData?.elevation_matrix && twinData.elevation_matrix[r]) {
        elevation = (twinData.elevation_matrix[r][c] || 0) * roughnessMultiplier;
      } else {
        elevation = Math.sin(r * noiseFreq) * Math.cos(c * noiseFreq) * roughnessMultiplier;
      }
      pos.setY(i, elevation);
    }
    geo.computeVertexNormals();

    const terrainColor = activeScenario === 'scenario_a' ? 0x0a3d62 : activeScenario === 'scenario_b' ? 0x1f2937 : 0x3b1c1c;
    const wireColor = activeScenario === 'scenario_a' ? 0x00f0ff : activeScenario === 'scenario_b' ? 0xf59e0b : 0xf43f5e;

    const mat = new THREE.MeshStandardMaterial({
      color: terrainColor,
      roughness: 0.85,
      metalness: 0.15,
    });
    const seabedMesh = new THREE.Mesh(geo, mat);
    scene.add(seabedMesh);

    const wireMat = new THREE.MeshBasicMaterial({
      color: wireColor,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    wireMesh.position.y += 0.02;
    scene.add(wireMesh);

    // Target beacons
    const targetGroup = new THREE.Group();
    const targetColor = activeScenario === 'scenario_a' ? 0x10b981 : activeScenario === 'scenario_b' ? 0xf59e0b : 0xf43f5e;

    const bGeo = new THREE.BoxGeometry(1.4, 0.7, 1.4);
    const bMat = new THREE.MeshBasicMaterial({ color: targetColor });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(0, 1.0, 0);
    targetGroup.add(bMesh);

    const beaconGeo = new THREE.CylinderGeometry(0.1, 0.9, 5, 16, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: targetColor,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 3.2, 0);
    targetGroup.add(beacon);
    scene.add(targetGroup);

    const ambLight = new THREE.AmbientLight(0x0a3d62, 1.4);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 25, 15);
    scene.add(dirLight);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      seabedMesh.rotation.y += 0.0015;
      wireMesh.rotation.y += 0.0015;
      targetGroup.rotation.y += 0.0015;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      wireMat.dispose();
    };
  }, [twinData, activeScenario]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Environmental Profile & Seabed Acoustic Twin</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Core Innovation
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Environment-Aware Sonar Intelligence: Profiles benthic texture, acoustic noise & clutter to gate target classifications.
            </p>
          </div>
        </div>

        {/* Interactive Scenario Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden md:inline">Test Scenario:</span>
          <button
            onClick={() => setActiveScenario('scenario_a')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              activeScenario === 'scenario_a'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-glow-cyan'
                : 'bg-[#020b14] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Scenario A (Sandy)
          </button>
          <button
            onClick={() => setActiveScenario('scenario_b')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              activeScenario === 'scenario_b'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-glow-cyan'
                : 'bg-[#020b14] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Scenario B (Rocky)
          </button>
          <button
            onClick={() => setActiveScenario('scenario_c')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              activeScenario === 'scenario_c'
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-glow-cyan'
                : 'bg-[#020b14] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Scenario C (Variable)
          </button>
        </div>
      </div>

      {/* Main Grid: 3D Bathymetry + Environmental Profile Metrics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Seabed Bathymetric Elevation Mesh */}
        <div className="lg:col-span-7 rounded-2xl bg-[#041527] border border-cyan-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-3 px-1">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white">3D Seafloor Acoustic Surface Representation</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-300">
              {currentScenario.seabed_type} ({currentScenario.texture} Substrate)
            </span>
          </div>

          <div
            ref={mountRef}
            className="w-full aspect-[16/10] rounded-xl bg-[#020b14] border border-cyan-950 overflow-hidden relative cursor-grab"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
            <span>Terrain roughness dynamically reflects backscatter variance ($\sigma_{'{'}bg{'}'}$).</span>
            <span className="font-mono text-slate-300">Interactive 3D Orbit • Three.js WebGL</span>
          </div>
        </div>

        {/* Right: Environmental Profile & Decision Gating Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">Current Seabed</span>
                <h3 className="text-base font-extrabold text-white mt-0.5">{currentScenario.seabed_type}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Environmental Confidence</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {safePercent(currentScenario.environmental_confidence, 0)}
                </span>
              </div>
            </div>

            {/* Environmental Profile Characteristic Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400">Texture Roughness</span>
                <div className="font-bold text-white mt-0.5">{currentScenario.texture}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400">Surface Variation</span>
                <div className="font-bold text-white mt-0.5">{currentScenario.surface_variation}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400">Sonar Noise Level</span>
                <div className="font-bold text-white mt-0.5">{currentScenario.sonar_noise}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020b14] border border-slate-800">
                <span className="text-[10px] text-slate-400">Acoustic Clutter</span>
                <div className="font-bold text-white mt-0.5">{currentScenario.clutter_level}</div>
              </div>
            </div>

            {/* Object-Environment Compatibility */}
            <div className="p-4 rounded-xl bg-[#020b14] border border-cyan-800/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Object–Environment Compatibility</span>
                <span className={`text-base font-extrabold font-mono ${
                  currentScenario.expected_compatibility >= 0.85
                    ? 'text-emerald-400'
                    : currentScenario.expected_compatibility >= 0.60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}>
                  {safePercent(currentScenario.expected_compatibility, 0)} Compatible
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    currentScenario.expected_compatibility >= 0.85
                      ? 'bg-emerald-400'
                      : currentScenario.expected_compatibility >= 0.60
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${currentScenario.expected_compatibility * 100}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Candidate Target Confidence: <span className="text-white font-semibold font-mono">{safePercent(currentScenario.expected_object_confidence, 0)}</span> ({currentScenario.expected_object})
              </div>
            </div>

            {/* Environmental Decision Gate Result */}
            <div className={`p-4 rounded-xl border space-y-1.5 ${
              currentScenario.decision_badge === 'Accepted'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : currentScenario.decision_badge === 'Environment Mismatch'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {currentScenario.decision_badge === 'Accepted' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : currentScenario.decision_badge === 'Environment Mismatch' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  Automated Decision: {currentScenario.decision_badge}
                </span>
              </div>
              <div className="text-xs font-semibold text-white pl-6">
                {currentScenario.expected_decision}
              </div>
              <div className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                {currentScenario.description}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Seabed Comparison Table (Crucial Demo Feature) */}
      <div className="rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white">Compare Environmental Conditions & Decision Matrices</h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Demonstrates how substrate variation directly drives classification trustworthiness
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Environmental Metric</th>
                <th className="py-2.5 px-3 text-emerald-400">Scenario A – Familiar Seabed</th>
                <th className="py-2.5 px-3 text-amber-400">Scenario B – Different Seabed</th>
                <th className="py-2.5 px-3 text-rose-400">Scenario C – Unknown / Harsh Seabed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Seabed Type</td>
                <td className="py-2.5 px-3 text-emerald-300 font-sans">Sandy / Sedimentary</td>
                <td className="py-2.5 px-3 text-amber-300 font-sans">Rocky / Mixed</td>
                <td className="py-2.5 px-3 text-rose-300 font-sans">Variable / Unknown</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Texture Roughness</td>
                <td className="py-2.5 px-3 text-slate-300">Smooth</td>
                <td className="py-2.5 px-3 text-slate-300">Rough</td>
                <td className="py-2.5 px-3 text-slate-300">Irregular</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Surface Variation</td>
                <td className="py-2.5 px-3 text-slate-300">Low</td>
                <td className="py-2.5 px-3 text-slate-300">High</td>
                <td className="py-2.5 px-3 text-slate-300">High</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Sonar Noise Level</td>
                <td className="py-2.5 px-3 text-slate-300">Low</td>
                <td className="py-2.5 px-3 text-slate-300">Medium</td>
                <td className="py-2.5 px-3 text-slate-300">High</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Clutter Level</td>
                <td className="py-2.5 px-3 text-slate-300">Low</td>
                <td className="py-2.5 px-3 text-slate-300">Medium</td>
                <td className="py-2.5 px-3 text-slate-300">High</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Environmental Confidence</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">94%</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold">86%</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">54%</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Candidate Object Confidence</td>
                <td className="py-2.5 px-3 text-slate-200">93%</td>
                <td className="py-2.5 px-3 text-slate-200">78%</td>
                <td className="py-2.5 px-3 text-slate-200">54%</td>
              </tr>
              <tr className="hover:bg-[#020b14]/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">Object–Environment Compatibility</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">91% Compatible</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold">68% Compatible</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">39% Compatible</td>
              </tr>
              <tr className="bg-[#020b14]/70 font-sans">
                <td className="py-3 px-3 font-bold text-white">Final System Decision</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">
                  Accepted (Man-Made Object)
                </td>
                <td className="py-3 px-3 text-amber-400 font-bold">
                  Environment Mismatch → Human Review Required
                </td>
                <td className="py-3 px-3 text-rose-400 font-bold">
                  Unable to Verify → Human Expert Review
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
