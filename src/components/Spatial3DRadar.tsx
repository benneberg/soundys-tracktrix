import React, { useEffect, useRef } from 'react';
import { EchoEngine, OrbitShapeType } from '../audio/EchoEngine';

interface Spatial3DRadarProps {
  engine: EchoEngine;
  orbitShape: OrbitShapeType;
  theme: 'light' | 'dark';
  onSelectOrbitShape: (shape: OrbitShapeType) => void;
  onEnsureRunning: () => Promise<void>;
}

const ORBIT_SHAPES: { id: OrbitShapeType; label: string }[] = [
  { id: 'circle', label: '360° Orbit' },
  { id: 'figure8', label: 'Figure-8' },
  { id: 'spiral', label: 'Vortex' },
  { id: 'stalker', label: 'Stalker' },
  { id: 'pendulum', label: 'Pendulum' },
  { id: 'manual', label: 'Manual' }
];

export const Spatial3DRadar: React.FC<Spatial3DRadarProps> = ({
  engine,
  orbitShape,
  theme,
  onSelectOrbitShape,
  onEnsureRunning
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailRef = useRef<{ x: number; z: number }[]>([]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    let animId = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.min(w, h) * 0.42;

      const isDark = theme === 'dark';
      const bg = isDark ? '#11100E' : '#ECEAE2';
      const ringStroke = isDark ? 'rgba(242, 239, 233, 0.10)' : 'rgba(28, 27, 24, 0.12)';
      const crossStroke = isDark ? 'rgba(242, 239, 233, 0.06)' : 'rgba(28, 27, 24, 0.07)';
      const headStroke = isDark ? '#F2EFE9' : '#1C1B18';
      const headFill = isDark ? '#1D1B18' : '#FFFFFF';
      const accent = isDark ? '#E09145' : '#C24923';
      const accentTrail = isDark ? 'rgba(224, 145, 69, 0.55)' : 'rgba(194, 73, 35, 0.48)';
      const danger = isDark ? '#E05A47' : '#B91C1C';
      const trackBg = isDark ? '#2E2B26' : '#D4D0C5';

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Concentric distance rings
      ctx.strokeStyle = ringStroke;
      ctx.lineWidth = 1 * dpr;
      [0.33, 0.66, 1.0].forEach((rFrac) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * rFrac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.strokeStyle = crossStroke;
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Listener head + directional nose icon at origin
      ctx.fillStyle = headFill;
      ctx.strokeStyle = headStroke;
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 3.5 * dpr, cy - 6 * dpr);
      ctx.lineTo(cx, cy - 11.5 * dpr);
      ctx.lineTo(cx + 3.5 * dpr, cy - 6 * dpr);
      ctx.strokeStyle = headStroke;
      ctx.stroke();

      const sp = engine.spatialTelemetry;
      const sx = cx + sp.x * maxR;
      const sz = cy + sp.z * maxR;

      if (engine.isRunning) {
        trailRef.current.push({ x: sp.x, z: sp.z });
        if (trailRef.current.length > 36) {
          trailRef.current.shift();
        }
      }

      // Trajectory tail
      if (trailRef.current.length > 1) {
        ctx.beginPath();
        trailRef.current.forEach((pt, idx) => {
          const px = cx + pt.x * maxR;
          const pz = cy + pt.z * maxR;
          if (idx === 0) ctx.moveTo(px, pz);
          else ctx.lineTo(px, pz);
        });
        ctx.strokeStyle = accentTrail;
        ctx.lineWidth = 2.2 * dpr;
        ctx.stroke();
      }

      // Active 3D grains
      const nowPerf = performance.now();
      for (const g of engine.recentGrains) {
        const age = (nowPerf - g.bornAt) / (g.size * 1000 + 180);
        if (age < 1) {
          const gx = sx + g.x * (maxR * 0.35);
          const gz = sz + g.z * (maxR * 0.35);
          ctx.globalAlpha = (1 - age) * 0.65;
          ctx.fillStyle = g.reversed ? danger : accent;
          ctx.beginPath();
          ctx.arc(gx, gz, (1 - age) * 3 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Primary 3D sound source ring puck
      ctx.fillStyle = bg;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4 * dpr;
      ctx.beginPath();
      ctx.arc(sx, sz, 8.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(sx, sz, 3.2 * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Elevation rail on right edge
      const elevBarX = w - 16 * dpr;
      const elevTop = cy - maxR * 0.78;
      const elevBot = cy + maxR * 0.78;
      ctx.strokeStyle = trackBg;
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(elevBarX, elevTop);
      ctx.lineTo(elevBarX, elevBot);
      ctx.stroke();
      ctx.lineCap = 'butt';

      const elevY = cy - sp.y * (maxR * 0.78);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(elevBarX, elevY, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [engine, theme]);

  const updatePointerPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    engine.setManualSpatialPosition(nx, nz);
    if (orbitShape !== 'manual') {
      onSelectOrbitShape('manual');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Orbit Trajectory Mode Selectors */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {ORBIT_SHAPES.map((s) => {
          const active = orbitShape === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectOrbitShape(s.id)}
              className={`min-h-[40px] px-2 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
                  : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Interactive 3D Binaural Radar */}
      <div className="relative w-full h-[215px] rounded-xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-well)]">
        <canvas
          ref={canvasRef}
          onPointerDown={async (e) => {
            await onEnsureRunning();
            isDraggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updatePointerPosition(e);
          }}
          onPointerMove={(e) => {
            if (isDraggingRef.current) {
              updatePointerPosition(e);
            }
          }}
          onPointerUp={() => {
            isDraggingRef.current = false;
          }}
          className="w-full h-full block cursor-crosshair touch-none"
        />
        <span className="absolute top-2.5 left-3 font-mono-tech text-[10px] font-medium text-[var(--text-secondary)] pointer-events-none">
          Front (-Z) · Drag Source
        </span>
        <span className="absolute bottom-2.5 left-3 font-mono-tech text-[10px] font-medium text-[var(--text-muted)] pointer-events-none">
          Behind (+Z)
        </span>
        <span className="absolute top-2.5 right-6 font-mono-tech text-[10px] font-medium text-[var(--accent)] pointer-events-none">
          +
        </span>
        <span className="absolute bottom-2.5 right-6 font-mono-tech text-[10px] font-medium text-[var(--text-muted)] pointer-events-none">
          -
        </span>
      </div>
    </div>
  );
};
