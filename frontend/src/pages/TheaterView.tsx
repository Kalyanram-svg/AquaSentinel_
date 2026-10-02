import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { Activity, Play, Pause, RotateCcw, FastForward, Sliders, Volume2 } from 'lucide-react';

export const TheaterView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const [currentPing, setCurrentPing] = useState<any | null>(null);
  const [waterfallSpeed, setWaterfallSpeed] = useState(1);

  // Maintain waterfall buffer of lines
  const waterfallBuffer = useRef<number[][]>([]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(async () => {
        setLineIndex((prev) => {
          const next = prev + 1;
          api.getTheaterPing(next).then((data) => {
            setCurrentPing(data);
            waterfallBuffer.current.unshift(data.ping_intensity_bins);
            if (waterfallBuffer.current.length > 250) {
              waterfallBuffer.current.pop();
            }
            renderWaterfall();
          }).catch(() => {});
          return next;
        });
      }, 100 / waterfallSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, waterfallSpeed]);

  const renderWaterfall = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = waterfallBuffer.current;
    const h = canvas.height;
    const w = canvas.width;

    ctx.fillStyle = '#020b14';
    ctx.fillRect(0, 0, w, h);

    // Draw waterfall lines
    buffer.forEach((line, rowIdx) => {
      const y = rowIdx * 2;
      if (y > h) return;

      const binWidth = w / line.length;
      for (let b = 0; b < line.length; b++) {
        const val = line[b];
        // Sonar copper colormap calculation
        const r = Math.min(255, Math.floor(val * 1.0));
        const g = Math.min(255, Math.floor(val * 0.65));
        const blue = Math.min(255, Math.floor(val * 0.15));
        ctx.fillStyle = `rgb(${r}, ${g}, ${blue})`;
        ctx.fillRect(b * binWidth, y, Math.ceil(binWidth), 2);
      }
    });

    // Draw central nadir line
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Live Sonar Intelligence Theater & Waterfall</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                SYNTHETIC SCANLINE SIMULATOR
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Capabilities 19 & 27 • Continuous Acoustic Ping Stream (Functional Procedural Simulation)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-glow-cyan"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#020b14] border border-slate-800 text-xs">
            <span className="text-slate-400">Speed:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setWaterfallSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  waterfallSpeed === spd ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Waterfall Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl bg-[#041527] border border-cyan-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-mono">
            <span>Port Swath (75m)</span>
            <span className="text-cyan-400 font-bold">Nadir Channel (Towfish Track)</span>
            <span>Starboard Swath (75m)</span>
          </div>

          <div className="relative w-full rounded-xl overflow-hidden border border-cyan-950 bg-[#020b14]">
            <canvas
              ref={canvasRef}
              width={768}
              height={480}
              className="w-full h-[480px] object-cover"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800 font-mono">
            <span>Ping Counter: #{lineIndex}</span>
            <span>Acoustic Frequency: 455 kHz</span>
            <span className="text-emerald-400">Waterfall Latency: &lt; 5ms</span>
          </div>
        </div>

        {/* Right Telemetry & Replay */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-[#041527] border border-cyan-900/40 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Real-Time Acoustic Telemetry
            </h3>

            {currentPing ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Sensor Heading:</span>
                  <span className="font-mono text-cyan-300 font-bold">{currentPing.sensor_heading_deg}°</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Altitude above Seabed:</span>
                  <span className="font-mono text-white font-bold">{currentPing.altitude_m} m</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#020b14] border border-slate-800">
                  <span className="text-slate-400">Total Swath Width:</span>
                  <span className="font-mono text-white font-bold">{currentPing.swath_width_m} m</span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
                  Dual-swath acoustic ping waterfall automatically decodes acoustic backscatter anomalies and streams directly to AI inference.
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Connecting to acoustic ping bus...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
