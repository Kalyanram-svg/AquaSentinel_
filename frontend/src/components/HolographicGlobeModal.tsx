import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { api } from '../services/api';
import { X, Globe, MapPin, Compass, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface HolographicGlobeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HolographicGlobeModal: React.FC<HolographicGlobeModalProps> = ({ isOpen, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getHolographicHotspots().then((data) => {
        setHotspots(data);
        if (data.length > 0) setSelectedSpot(data[0]);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Globe wireframe sphere
    const sphereGeo = new THREE.SphereGeometry(2.4, 36, 36);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const globe = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(globe);

    // Inner glowing ocean sphere
    const innerGeo = new THREE.SphereGeometry(2.35, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x04192b,
      transparent: true,
      opacity: 0.85,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // Atmosphere halo
    const haloGeo = new THREE.SphereGeometry(2.55, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // Hotspot markers on globe
    const markerGroup = new THREE.Group();
    const markerGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    hotspots.forEach((spot) => {
      // Lat / Lon to 3D Cartesian coords
      const phi = (90 - spot.lat) * (Math.PI / 180);
      const theta = (spot.lng + 180) * (Math.PI / 180);
      const r = 2.42;

      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi);

      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(x, y, z);
      markerGroup.add(marker);
    });
    globe.add(markerGroup);

    let animationId: number;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x += dy * 0.005;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (!isDragging) {
        globe.rotation.y += 0.002;
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationId);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      innerGeo.dispose();
      haloGeo.dispose();
      markerGeo.dispose();
    };
  }, [isOpen, hotspots]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[80vh] rounded-3xl bg-[#041527] border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-900/40 bg-[#031322]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Interactive Underwater Holographic Globe</h2>
              <p className="text-xs text-slate-400">Capability 32 • Global Marine Survey Operations & Debris Density</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Viewport & Side Panel */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Globe Canvas */}
          <div ref={mountRef} className="md:col-span-8 w-full h-full cursor-grab active:cursor-grabbing relative" />

          {/* Mission Details Panel */}
          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-cyan-900/40 bg-[#020b14]/90 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
                Global Survey Deployments ({hotspots.length})
              </h3>
              <div className="space-y-2 mb-4">
                {hotspots.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                      selectedSpot?.id === spot.id
                        ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-glow-cyan'
                        : 'bg-[#041527]/60 border-slate-800 text-slate-300 hover:border-cyan-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{spot.name}</div>
                      <div className="text-[10px] text-slate-400">{spot.category}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {spot.status}
                    </span>
                  </button>
                ))}
              </div>

              {selectedSpot && (
                <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-500/30">
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    {selectedSpot.name}
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinates:</span>
                      <span className="font-mono text-cyan-300">
                        {selectedSpot.lat}°N, {selectedSpot.lng}°E
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span>{selectedSpot.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contacts Logged:</span>
                      <span className="font-bold text-amber-400">{selectedSpot.detections} targets</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
              Drag to rotate globe in 3D • Click missions to inspect telemetry
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
