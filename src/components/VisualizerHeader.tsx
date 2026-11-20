import React, { useEffect, useRef, useState } from 'react';
import { EchoEngine } from '../audio/EchoEngine';
import { Activity, Compass, Dices, Power, RotateCcw, Sparkles } from 'lucide-react';

interface VisualizerHeaderProps {
  engine: EchoEngine;
  isRunning: boolean;
  seed: string;
  onTogglePower: () => void;
  onMutate: () => void;
  onRollSeed: () => void;
  onSeedChange: (newSeed: string) => void;
  onResetAudio: () => void;
}

export const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({
  engine,
  isRunning,
  seed,
  onTogglePower,
  onMutate,
  onRollSeed,
  onSeedChange,
  onResetAudio
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visMode, setVisMode] = useState<'scope' | 'vector'>('scope');
  const [seedDraft, setSeedDraft] = useState(seed);

  useEffect(() => {
    setSeedDraft(seed);
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cctx = canvas.getContext('2d');
    if (!cctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const timeData = new Uint8Array(1024);
    const freqData = new Uint8Array(512);
    const leftData = new Uint8Array(512);
    const rightData = new Uint8Array(512);

    let animId = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      cctx.fillStyle = 'rgba(5, 6, 8, 0.34)';
      cctx.fillRect(0, 0, w, h);

      // Subtle background grid lines
      cctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      cctx.lineWidth = 1;
      cctx.beginPath();
      cctx.moveTo(0, h / 2);
      cctx.lineTo(w, h / 2);
      cctx.moveTo(w / 2, 0);
      cctx.lineTo(w / 2, h);
      cctx.stroke();

      const analyser = engine.getAnalyser();
      if (!analyser || !engine.isRunning) {
        cctx.strokeStyle = 'rgba(184, 134, 255, 0.22)';
        cctx.lineWidth = 1.5 * dpr;
        cctx.beginPath();
        cctx.moveTo(0, h / 2);
        cctx.lineTo(w, h / 2);
        cctx.stroke();
        return;
      }

      const nowPerf = performance.now();

      if (visMode === 'scope') {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // 1. 64-Band FFT Spectrum Bars
        const barCount = 64;
        const barWidth = w / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = freqData[i * 2] / 255;
          const barH = val * h * 0.88;
          cctx.fillStyle = i % 2 === 0 ? 'rgba(184, 134, 255, 0.18)' : 'rgba(56, 226, 199, 0.12)';
          cctx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 2), barH);
        }

        // 2. Active Granular Cloud Particles overlay
        for (const g of engine.recentGrains) {
          const age = (nowPerf - g.bornAt) / (g.size * 1000 + 180);
          if (age < 1) {
            const gx = ((g.x + 1) * 0.5) * w;
            const gy = (1 - g.pitch * 0.8 - 0.1) * h;
            const radius = (1 - age) * 6 * dpr;
            cctx.fillStyle = g.reversed
              ? `rgba(255, 77, 109, ${(1 - age) * 0.65})`
              : `rgba(184, 134, 255, ${(1 - age) * 0.65})`;
            cctx.beginPath();
            cctx.arc(gx, gy, Math.max(1, radius), 0, Math.PI * 2);
            cctx.fill();
          }
        }

        // 3. Oscilloscope Time-Domain Waveform
        cctx.lineWidth = 2 * dpr;
        cctx.strokeStyle = '#38e2c7';
        cctx.shadowColor = 'rgba(56, 226, 199, 0.5)';
        cctx.shadowBlur = 6;
        cctx.beginPath();
        const sliceWidth = w / timeData.length;
        let x = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) cctx.moveTo(x, y);
          else cctx.lineTo(x, y);
          x += sliceWidth;
        }
        cctx.stroke();
        cctx.shadowBlur = 0;
      } else {
        // LISSAJOUS STEREO X/Y VECTORSCOPE + 3D ORBIT VECTOR
        const { left, right } = engine.getStereoAnalysers();
        if (left && right) {
          left.getByteTimeDomainData(leftData);
          right.getByteTimeDomainData(rightData);

          const cx = w * 0.5;
          const cy = h * 0.5;
          const scale = Math.min(w * 0.35, h * 0.85);

          // Draw reference circle
          cctx.strokeStyle = 'rgba(184, 134, 255, 0.16)';
          cctx.lineWidth = 1 * dpr;
          cctx.beginPath();
          cctx.arc(cx, cy, scale * 0.5, 0, Math.PI * 2);
          cctx.stroke();

          // Draw Lissajous X/Y phase trace
          cctx.strokeStyle = '#38e2c7';
          cctx.lineWidth = 1.6 * dpr;
          cctx.beginPath();
          for (let i = 0; i < leftData.length; i++) {
            const l = (leftData[i] - 128) / 128;
            const r = (rightData[i] - 128) / 128;
            // Rotate 45 deg for standard studio goniometer (Mid = vertical, Side = horizontal)
            const sx = (l - r) * 0.707;
            const sy = (l + r) * 0.707;
            const px = cx + sx * scale;
            const py = cy + sy * scale * 0.65;
            if (i === 0) cctx.moveTo(px, py);
            else cctx.lineTo(px, py);
          }
          cctx.stroke();

          // Draw 3D Spatial Panner beacon on the vectorscope
          const sp = engine.spatialTelemetry;
          const bx = cx + sp.x * scale * 0.85;
          const by = cy + sp.z * (h * 0.38);
          cctx.fillStyle = '#b886ff';
          cctx.beginPath();
          cctx.arc(bx, by, 4.5 * dpr, 0, Math.PI * 2);
          cctx.fill();
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [engine, visMode]);

  const handleSeedCommit = () => {
    if (seedDraft.trim()) {
      onSeedChange(seedDraft.trim());
    }
  };

  return (
    <>
      {/* TOP HEADER / MASTER TRANSPORT */}
      <header className="flex items-center justify-between px-3 py-2.5 bg-[#07080b] border-b border-[#252a38] gap-2 shrink-0">
        <div className="flex flex-col">
          <div className="font-display-tech text-[13px] font-bold tracking-[1.4px] text-[#b886ff] flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isRunning
                  ? 'bg-[#38e2c7] shadow-[0_0_10px_#38e2c7]'
                  : 'bg-[#4b5563]'
              }`}
            />
            ECHO ENGINE // LAB v2.0
          </div>
          <div className="text-[10px] text-[#7f889f] font-mono-tech">
            Shadowflap Procedural Dark & 3D Granular Synth
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetAudio}
            title="Reset Audio Engine Graph"
            className="bg-[#161922] hover:bg-[#1e2230] active:scale-95 text-[#7f889f] hover:text-[#38e2c7] border border-[#384157] rounded-md p-2 cursor-pointer transition flex items-center justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onMutate}
            title="Mutate Soundscape Parameters"
            className="bg-[#161922] hover:bg-[#1e2230] active:scale-95 text-[#e2e6f0] border border-[#384157] rounded-md px-2.5 py-2 font-mono-tech text-[11px] font-semibold cursor-pointer transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#b886ff]" />
            <span className="hidden sm:inline">MUTATE</span>
          </button>

          <button
            onClick={onTogglePower}
            className={`active:scale-95 rounded-md px-3 py-2 font-mono-tech text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5 min-w-[106px] border ${
              isRunning
                ? 'bg-[#38e2c7]/18 border-[#38e2c7] text-[#38e2c7] shadow-[0_0_15px_rgba(56,226,199,0.2)]'
                : 'bg-[#b886ff]/16 border-[#b886ff] text-[#b886ff]'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isRunning ? 'STOP AUDIO' : 'START AUDIO'}</span>
          </button>
        </div>
      </header>

      {/* LIVE OSCILLOSCOPE / VECTORSCOPE + SEED BAR */}
      <section className="relative h-[86px] bg-[#050608] border-b border-[#252a38] shrink-0 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-1.5 left-2.5 right-2.5 flex justify-between items-center pointer-events-none">
          {/* Deterministic Seed Pill */}
          <div className="pointer-events-auto flex items-center bg-[#101218]/85 border border-[#252a38] rounded-md pl-2 pr-1 py-0.5 gap-1.5 backdrop-blur-xs">
            <span className="font-mono-tech text-[10px] text-[#7f889f]">SEED:</span>
            <input
              type="text"
              value={seedDraft}
              maxLength={18}
              onChange={(e) => setSeedDraft(e.target.value)}
              onBlur={handleSeedCommit}
              onKeyDown={(e) => e.key === 'Enter' && handleSeedCommit()}
              className="bg-transparent border-none text-[#38e2c7] font-mono-tech text-[11px] w-[88px] outline-none select-text"
            />
            <button
              onClick={onRollSeed}
              title="Roll New Deterministic Seed"
              className="bg-[#161922] hover:bg-[#232836] active:scale-95 text-[#e2e6f0] border border-[#384157] rounded px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Dices className="w-3 h-3 text-[#38e2c7]" />
              ROLL
            </button>
          </div>

          {/* Visualizer Mode Toggle & Telemetry Readout */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={() => setVisMode((m) => (m === 'scope' ? 'vector' : 'scope'))}
              title="Switch Visualizer Mode (Scope+FFT vs Stereo Vectorscope)"
              className="bg-[#101218]/85 hover:bg-[#1a1e29] text-[#b886ff] border border-[#252a38] rounded px-2 py-0.5 font-mono-tech text-[10px] flex items-center gap-1 cursor-pointer backdrop-blur-xs"
            >
              {visMode === 'scope' ? (
                <>
                  <Activity className="w-3 h-3 text-[#38e2c7]" />
                  <span>SCOPE+GRAIN</span>
                </>
              ) : (
                <>
                  <Compass className="w-3 h-3 text-[#b886ff]" />
                  <span>3D VECTOR</span>
                </>
              )}
            </button>

            <div className="font-mono-tech text-[10px] text-[#7f889f] bg-[#101218]/80 px-2 py-0.5 rounded border border-[#252a38] hidden sm:block">
              {isRunning && engine.ctx ? `${engine.ctx.sampleRate}Hz // RUN` : 'IDLE'}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
