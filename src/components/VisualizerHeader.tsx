import React, { useEffect, useRef, useState } from 'react';
import { EchoEngine } from '../audio/EchoEngine';
import { Activity, Compass, Dices, Moon, Power, RotateCcw, Shuffle, Sun } from 'lucide-react';

interface VisualizerHeaderProps {
  engine: EchoEngine;
  isRunning: boolean;
  seed: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
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
      const isDark = theme === 'dark';

      // Theme-calibrated hardware phosphor / ink colors
      const bgFill = isDark ? 'rgba(17, 16, 14, 0.55)' : 'rgba(236, 234, 226, 0.62)';
      const gridColor = isDark ? 'rgba(242, 239, 233, 0.06)' : 'rgba(28, 27, 24, 0.08)';
      const idleLine = isDark ? 'rgba(224, 145, 69, 0.32)' : 'rgba(28, 27, 24, 0.25)';
      const wavePrimary = isDark ? '#E09145' : '#1C1B18';
      const waveSecondary = isDark ? 'rgba(242, 239, 233, 0.22)' : 'rgba(194, 73, 35, 0.28)';
      const barColorEven = isDark ? 'rgba(224, 145, 69, 0.16)' : 'rgba(28, 27, 24, 0.09)';
      const barColorOdd = isDark ? 'rgba(242, 239, 233, 0.08)' : 'rgba(194, 73, 35, 0.10)';
      const accentColor = isDark ? '#E09145' : '#C24923';
      const dangerColor = isDark ? '#E05A47' : '#B91C1C';

      cctx.fillStyle = bgFill;
      cctx.fillRect(0, 0, w, h);

      // Subtle center crosshair
      cctx.strokeStyle = gridColor;
      cctx.lineWidth = 1 * dpr;
      cctx.beginPath();
      cctx.moveTo(0, h / 2);
      cctx.lineTo(w, h / 2);
      cctx.moveTo(w / 2, 0);
      cctx.lineTo(w / 2, h);
      cctx.stroke();

      const analyser = engine.getAnalyser();
      if (!analyser || !engine.isRunning) {
        cctx.strokeStyle = idleLine;
        cctx.lineWidth = 1.5 * dpr;
        cctx.beginPath();
        cctx.moveTo(0, h / 2);
        cctx.lineTo(w, h / 2);
        cctx.stroke();

        // Subtle center reference node (like hardware idle trace)
        cctx.fillStyle = accentColor;
        cctx.beginPath();
        cctx.arc(w * 0.5, h * 0.5, 2.5 * dpr, 0, Math.PI * 2);
        cctx.fill();
        return;
      }

      const nowPerf = performance.now();

      if (visMode === 'scope') {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // 1. 48-Band Clean FFT Spectrum Bars
        const barCount = 48;
        const barWidth = w / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = freqData[i * 2] / 255;
          const barH = val * h * 0.85;
          cctx.fillStyle = i % 2 === 0 ? barColorEven : barColorOdd;
          cctx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 2 * dpr), barH);
        }

        // 2. Active Granular Cloud Particles
        for (const g of engine.recentGrains) {
          const age = (nowPerf - g.bornAt) / (g.size * 1000 + 180);
          if (age < 1) {
            const gx = (g.x + 1) * 0.5 * w;
            const gy = (1 - g.pitch * 0.8 - 0.1) * h;
            const radius = (1 - age) * 4.5 * dpr;
            cctx.globalAlpha = (1 - age) * 0.72;
            cctx.fillStyle = g.reversed ? dangerColor : accentColor;
            cctx.beginPath();
            cctx.arc(gx, gy, Math.max(1, radius), 0, Math.PI * 2);
            cctx.fill();
            cctx.globalAlpha = 1;
          }
        }

        // 3. Soft harmonic reference trace
        cctx.lineWidth = 1.1 * dpr;
        cctx.strokeStyle = waveSecondary;
        cctx.beginPath();
        const sliceWidth = w / timeData.length;
        let x2 = 0;
        for (let i = 0; i < timeData.length; i += 2) {
          const v = timeData[i] / 128.0 - 1;
          const y = h / 2 + v * h * 0.28;
          if (i === 0) cctx.moveTo(x2, y);
          else cctx.lineTo(x2, y);
          x2 += sliceWidth * 2;
        }
        cctx.stroke();

        // 4. Primary crisp oscilloscope trace
        cctx.lineWidth = 2 * dpr;
        cctx.strokeStyle = wavePrimary;
        cctx.beginPath();
        let x = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) cctx.moveTo(x, y);
          else cctx.lineTo(x, y);
          x += sliceWidth;
        }
        cctx.stroke();

        // Center live phase bead
        const midSample = timeData[Math.floor(timeData.length / 2)] / 128.0;
        cctx.fillStyle = accentColor;
        cctx.beginPath();
        cctx.arc(w * 0.5, (midSample * h) / 2, 3 * dpr, 0, Math.PI * 2);
        cctx.fill();
      } else {
        // Stereo Goniometer / 3D Vectorscope
        const { left, right } = engine.getStereoAnalysers();
        if (left && right) {
          left.getByteTimeDomainData(leftData);
          right.getByteTimeDomainData(rightData);

          const cx = w * 0.5;
          const cy = h * 0.5;
          const scale = Math.min(w * 0.35, h * 0.85);

          cctx.strokeStyle = gridColor;
          cctx.lineWidth = 1 * dpr;
          cctx.beginPath();
          cctx.arc(cx, cy, scale * 0.5, 0, Math.PI * 2);
          cctx.stroke();

          cctx.strokeStyle = wavePrimary;
          cctx.lineWidth = 1.6 * dpr;
          cctx.beginPath();
          for (let i = 0; i < leftData.length; i++) {
            const l = (leftData[i] - 128) / 128;
            const r = (rightData[i] - 128) / 128;
            const sx = (l - r) * 0.707;
            const sy = (l + r) * 0.707;
            const px = cx + sx * scale;
            const py = cy + sy * scale * 0.65;
            if (i === 0) cctx.moveTo(px, py);
            else cctx.lineTo(px, py);
          }
          cctx.stroke();

          const sp = engine.spatialTelemetry;
          const bx = cx + sp.x * scale * 0.85;
          const by = cy + sp.z * (h * 0.36);
          cctx.fillStyle = accentColor;
          cctx.beginPath();
          cctx.arc(bx, by, 4 * dpr, 0, Math.PI * 2);
          cctx.fill();
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [engine, visMode, theme]);

  const handleSeedCommit = () => {
    if (seedDraft.trim()) {
      onSeedChange(seedDraft.trim());
    }
  };

  return (
    <header className="bg-[var(--bg-panel)] border-b border-[var(--border-hairline)] px-3 sm:px-5 pt-2.5 pb-3 flex flex-col gap-2.5 shrink-0">
      {/* TOP BAR: BRAND WORDMARK + HARDWARE ACTIONS */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
              isRunning ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
            }`}
          />
          <h1 className="font-display-tech text-[17px] font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap">
            Tracktrix
          </h1>
          <span className="hidden sm:inline text-xs font-mono-tech text-[var(--text-muted)] whitespace-nowrap">
            Echo Engine
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Alabaster Mode' : 'Switch to Dark Espresso Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onResetAudio}
            title="Reset Audio Engine Graph"
            aria-label="Reset Audio Engine Graph"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onMutate}
            title="Mutate Soundscape Parameters"
            className="min-h-[40px] px-3 rounded-xl bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Shuffle className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Mutate</span>
          </button>

          <button
            onClick={onTogglePower}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.98] ${
              isRunning
                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] shadow-sm'
                : 'bg-[var(--active-chip-bg)] text-[var(--active-chip-fg)] hover:opacity-90'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* SEED + VISUALIZER CONTROLS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center bg-[var(--bg-well)] border border-[var(--border-hairline)] rounded-xl pl-2.5 pr-1 py-1 gap-2">
          <span className="font-mono-tech text-[11px] font-medium text-[var(--text-secondary)]">
            SEED
          </span>
          <input
            type="text"
            value={seedDraft}
            maxLength={18}
            onChange={(e) => setSeedDraft(e.target.value)}
            onBlur={handleSeedCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleSeedCommit()}
            aria-label="Deterministic Seed"
            className="bg-transparent border-none text-[var(--text-primary)] font-mono-tech text-xs font-medium w-[86px] outline-none select-text"
          />
          <button
            onClick={onRollSeed}
            title="Roll New Deterministic Seed"
            className="bg-[var(--bg-card)] hover:bg-[var(--bg-well-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1 font-mono-tech text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Dices className="w-3 h-3 text-[var(--accent)]" />
            Roll
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {isRunning && engine.ctx && (
            <span className="hidden sm:inline font-mono-tech text-[11px] text-[var(--text-secondary)]">
              {(engine.ctx.sampleRate / 1000).toFixed(1)}kHz · Live
            </span>
          )}
          <button
            onClick={() => setVisMode((m) => (m === 'scope' ? 'vector' : 'scope'))}
            title="Switch Visualizer Mode"
            className="bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-1.5 font-mono-tech text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            {visMode === 'scope' ? (
              <>
                <Activity className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Scope + Grain</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>3D Vector</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* LIVE OSCILLOSCOPE / VECTORSCOPE SCREEN */}
      <div className="relative h-[58px] sm:h-[68px] rounded-xl bg-[var(--bg-well)] border border-[var(--border-hairline)] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </header>
  );
};
