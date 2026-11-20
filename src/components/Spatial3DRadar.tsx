import React, { useEffect, useRef } from 'react';
import { EchoEngine, OrbitShapeType } from '../audio/EchoEngine';

interface Spatial3DRadarProps {
  engine: EchoEngine;
  orbitShape: OrbitShapeType;
  onSelectOrbitShape: (shape: OrbitShapeType) => void;
  onEnsureRunning: () => Promise<void>;
}

const ORBIT_SHAPES: { id: OrbitShapeType; label: string }[] = [
  { id: 'circle', label: '360° ORBIT' },
  { id: 'figure8', label: 'FIGURE-8' },
  { id: 'spiral', label: 'VORTEX SPIRAL' },
  { id: 'stalker', label: 'STALKER (BEHIND)' },
  { id: 'pendulum', label: 'PENDULUM' },
  { id: 'manual', label: 'MANUAL TOUCH' }
];

export const Spatial3DRadar: React.FC<Spatial3DRadarProps> = ({
  engine,
  orbitShape,
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
      const maxR = Math.min(w, h) * 0.43;

      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, w, h);

      // Distance rings
      ctx.strokeStyle = 'rgba(184, 134, 255, 0.12)';
      ctx.lineWidth = 1 * dpr;
      [0.33, 0.66, 1.0].forEach((rFrac) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * rFrac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Listener head icon at origin
      ctx.fillStyle = '#161922';
      ctx.strokeStyle = '#7f889f';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 7 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nose pointer facing UP (-Z in Web Audio)
      ctx.beginPath();
      ctx.moveTo(cx - 4 * dpr, cy - 6 * dpr);
      ctx.lineTo(cx, cy - 12 * dpr);
      ctx.lineTo(cx + 4 * dpr, cy - 6 * dpr);
      ctx.strokeStyle = '#38e2c7';
      ctx.stroke();

      const sp = engine.spatialTelemetry;
      const sx = cx + sp.x * maxR;
      const sz = cy + sp.z * maxR;

      // Record trajectory trail
      if (engine.isRunning) {
        trailRef.current.push({ x: sp.x, z: sp.z });
        if (trailRef.current.length > 38) {
          trailRef.current.shift();
        }
      }

      // Draw trajectory trail
      if (trailRef.current.length > 1) {
        ctx.beginPath();
        trailRef.current.forEach((pt, idx) => {
          const px = cx + pt.x * maxR;
          const pz = cy + pt.z * maxR;
          if (idx === 0) ctx.moveTo(px, pz);
          else ctx.lineTo(px, pz);
        });
        ctx.strokeStyle = 'rgba(184, 134, 255, 0.38)';
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }

      // Draw active 3D grains around the source
      const nowPerf = performance.now();
      for (const g of engine.recentGrains) {
        const age = (nowPerf - g.bornAt) / (g.size * 1000 + 180);
        if (age < 1) {
          const gx = sx + g.x * (maxR * 0.35);
          const gz = sz + g.z * (maxR * 0.35);
          ctx.fillStyle = g.reversed
            ? `rgba(255, 77, 109, ${(1 - age) * 0.7})`
            : `rgba(56, 226, 199, ${(1 - age) * 0.7})`;
          ctx.beginPath();
          ctx.arc(gx, gz, (1 - age) * 3.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw primary 3D Sound Source Puck
      ctx.fillStyle = 'rgba(184, 134, 255, 0.25)';
      ctx.strokeStyle = '#b886ff';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(sx, sz, 10 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38e2c7';
      ctx.beginPath();
      ctx.arc(sx, sz, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Elevation bar on right edge
      const elevBarX = w - 14 * dpr;
      const elevTop = cy - maxR * 0.8;
      const elevBot = cy + maxR * 0.8;
      ctx.strokeStyle = '#252a38';
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath();
      ctx.moveTo(elevBarX, elevTop);
      ctx.lineTo(elevBarX, elevBot);
      ctx.stroke();

      const elevY = cy - sp.y * (maxR * 0.8);
      ctx.fillStyle = '#38e2c7';
      ctx.beginPath();
      ctx.arc(elevBarX, elevY, 4.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [engine]);

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
    <div className="flex flex-col gap-2.5">
      {/* Orbit Trajectory Mode Pills */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {ORBIT_SHAPES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectOrbitShape(s.id)}
            className={`px-2 py-1.5 rounded text-[10px] font-mono-tech font-semibold border transition cursor-pointer ${
              orbitShape === s.id
                ? 'bg-[#b886ff]/20 border-[#b886ff] text-[#b886ff]'
                : 'bg-[#101218] border-[#252a38] text-[#7f889f] hover:text-[#e2e6f0]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Interactive 3D Binaural Radar */}
      <div className="relative w-full h-[185px] rounded-lg overflow-hidden border border-[#384157] bg-[#090b10]">
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
        <span className="absolute top-1.5 left-2 font-mono-tech text-[9px] text-[#7f889f] pointer-events-none">
          ▲ FRONT (-Z) // DRAG SOURCE IN 3D SPACE
        </span>
        <span className="absolute bottom-1.5 left-2 font-mono-tech text-[9px] text-[#ff4d6d]/80 pointer-events-none">
          ▼ BEHIND HEAD (+Z STALKER ZONE)
        </span>
        <span className="absolute top-1.5 right-5 font-mono-tech text-[9px] text-[#38e2c7] pointer-events-none">
          ELEV
        </span>
      </div>
    </div>
  );
};
