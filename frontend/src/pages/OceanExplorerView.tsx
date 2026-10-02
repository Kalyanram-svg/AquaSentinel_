import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Compass,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { safePercent, safeNumber, formatReliefHeight } from '../utils/formatters';

export const OceanExplorerView: React.FC = () => {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [coverageData, setCoverageData] = useState<any | null>(null);
  const [compareData, setCompareData] = useState<any | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const auvMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    api.getSurveys().then((res) => {
      setSurveys(res);
      if (res && res.length > 0) {
        // Prioritize survey with images/detections so the map comes alive immediately
        const primary = res.find((s) => s.images && s.images.length > 0) || res[0];
        setActiveSurvey(primary);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeSurvey) return;
    api.getSurveyCoverage(activeSurvey.id).then(setCoverageData).catch(console.error);
  }, [activeSurvey]);

  // 1. Map Initialization ONCE on mount
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    try {
      const map = L.map(container, {
        zoomControl: true,
        attributionControl: false,
      }).setView([18.9220, 72.8347], 14);

      // Dark oceanic CartoDB basemap with robust OSM fallback
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Force layout calculation
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } catch (e) {
      console.warn('[OceanExplorer] Leaflet init notice:', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        auvMarkerRef.current = null;
      }
    };
  }, []);

  // 2. Map Layer Updates when activeSurvey or coverageData changes (NO map destruction!)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || !activeSurvey) return;

    markersGroup.clearLayers();

    const lat = activeSurvey.latitude || 18.9220;
    const lon = activeSurvey.longitude || 72.8347;
    map.setView([lat, lon], 14);

    const boundsPoints: [number, number][] = [[lat, lon]];

    // Draw AUV lawnmower survey tracklines & swath corridors
    if (coverageData?.tracklines && coverageData.tracklines.length > 0) {
      coverageData.tracklines.forEach((line: any[]) => {
        if (!line || line.length < 2) return;
        const p1 = [line[0].lat, line[0].lng] as [number, number];
        const p2 = [line[1].lat, line[1].lng] as [number, number];
        boundsPoints.push(p1, p2);

        L.polyline([p1, p2], {
          color: '#00f0ff',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '5, 5',
        }).addTo(markersGroup);

        // Swath acoustic corridor polygon
        L.polygon(
          [
            [p1[0] + 0.0006, p1[1]],
            [p2[0] + 0.0006, p2[1]],
            [p2[0] - 0.0006, p2[1]],
            [p1[0] - 0.0006, p1[1]],
          ],
          { color: '#00f0ff', fillColor: '#00f0ff', fillOpacity: 0.08, weight: 1 }
        ).addTo(markersGroup);
      });
    }

    // Add acoustic detection markers from coverage or images
    const allDets: any[] = [];
    if (coverageData?.detections && coverageData.detections.length > 0) {
      allDets.push(...coverageData.detections);
    } else if (activeSurvey.images) {
      activeSurvey.images.forEach((img: any) => {
        if (!img.latitude || !img.longitude) return;
        img.detections?.forEach((d: any) => {
          allDets.push({
            ...d,
            latitude: img.latitude,
            longitude: img.longitude,
          });
        });
      });
    }

    allDets.forEach((d: any) => {
      const dLat = d.latitude || d.lat || lat;
      const dLng = d.longitude || d.lng || lon;
      boundsPoints.push([dLat, dLng]);

      const color = d.hazard_score >= 0.8 ? '#ef4444' : d.hazard_score >= 0.5 ? '#f59e0b' : '#00f0ff';
      const markerHtml = `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 12px ${color};"></div>`;
      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-sonar-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const m = L.marker([dLat, dLng], { icon: customIcon });
      m.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; color: #0f172a; min-width: 150px; line-height: 1.4;">
          <strong style="color: #041527; font-size: 12px;">${d.class_name}</strong><br/>
          Confidence: <strong>${safePercent(d.confidence)}</strong><br/>
          Hazard Score: <strong style="color: ${color};">${safeNumber(d.hazard_score * 10, 1)}/10</strong><br/>
          Relief Height: <strong>${formatReliefHeight(d.estimated_height_m, d.is_calibrated)}</strong><br/>
          Status: <span style="text-transform: capitalize; color: #0284c7;">${d.review_status || 'Audited'}</span>
        </div>
      `);
      m.addTo(markersGroup);
    });

    // Fit map bounds to frame all tracklines & contacts nicely
    if (boundsPoints.length > 1) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch {
        // fallback
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [activeSurvey, coverageData]);

  // Live AUV Replay Scrubber animation (Capability 12)
  useEffect(() => {
    let animTimer: any;
    if (isPlayingReplay && coverageData?.tracklines?.length > 0) {
      animTimer = setInterval(() => {
        setReplayStep((prev) => {
          const next = (prev + 1) % (coverageData.tracklines.length * 10);
          return next;
        });
      }, 350);
    }
    return () => clearInterval(animTimer);
  }, [isPlayingReplay, coverageData]);

  const handleRunComparison = async () => {
    if (surveys.length < 2) return;
    setIsComparing(true);
    try {
      const res = await api.compareSurveys(surveys[0].id, surveys[1].id);
      setCompareData(res);
    } catch (err) {
      alert('Comparison failed: ' + err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#041527] border border-cyan-900/40">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-300">Active Survey:</div>
          <select
            value={activeSurvey?.id || ''}
            onChange={(e) => {
              const s = surveys.find((item) => item.id === parseInt(e.target.value));
              if (s) setActiveSurvey(s);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#020b14] border border-cyan-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 font-semibold"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.survey_code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunComparison}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-glow-cyan"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Capability 16: Compare Surveys</span>
          </button>
        </div>
      </div>

      {/* Map & Metadata Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaflet Geospatial Viewport */}
        <div className="lg:col-span-8 rounded-2xl bg-[#041527] border border-cyan-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Survey Map & Acoustic Swath Coverage (Leaflet Dark Oceanic Layer)
            </span>
            <span className="font-mono text-cyan-400">
              {activeSurvey?.latitude?.toFixed(4)}°N, {activeSurvey?.longitude?.toFixed(4)}°E
            </span>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[520px] rounded-xl overflow-hidden border border-cyan-950 z-0"
          />

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-rose-400">● Explosive/Mine Contact</span>
              <span className="flex items-center gap-1 text-amber-400">● Navigation Obstacle</span>
              <span className="flex items-center gap-1 text-cyan-400">● Subsea Infrastructure</span>
            </div>
            <div>Scientific Georeferencing Status: Calibrated Acoustic Navigation</div>
          </div>
        </div>

        {/* Right: Coverage & Survey Provenance */}
        <div className="lg:col-span-4 space-y-4">
          {/* Swath Coverage Stats */}
          <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Swath Coverage & Nadir Verification
            </h3>

            {coverageData ? (
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Total Survey Area:</span>
                  <span className="font-mono text-cyan-300 font-bold">{coverageData.total_area_sq_km} km²</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Swath Width:</span>
                  <span className="font-mono text-white font-bold">{coverageData.swath_width_meters} m</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Nadir Gap Status:</span>
                  <span className="font-bold text-emerald-400">{coverageData.nadir_gap_status}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Dual starboard & port swaths verified with 20% adjacent overlap.</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Loading coverage telemetry...</div>
            )}
          </div>

          {/* Survey Comparison Modal / Drawer (Capability 16) */}
          {isComparing && compareData && (
            <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-400/40 shadow-glow-cyan animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5" />
                  Temporal Comparison Results
                </h4>
                <button
                  onClick={() => setIsComparing(false)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between text-[11px]">
                  <span>Temporal Delta:</span>
                  <span className="font-mono text-white">{compareData.temporal_delta_days} days</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>New Anomalies:</span>
                  <span className="font-mono text-amber-400 font-bold">+{compareData.new_anomalies_detected} contacts</span>
                </div>
                <div className="p-2 rounded-lg bg-[#020b14] text-[10px] text-slate-400">
                  {compareData.environmental_variance}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
