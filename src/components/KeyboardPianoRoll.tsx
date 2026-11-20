import React, { useEffect, useRef, useState } from 'react';
import { EchoEngine } from '../audio/EchoEngine';
import { SCALES, SEQUENCER_PATTERNS, SequencerStep } from '../audio/presets';
import { Dices, Lock, Play, Square, Trash2, Unlock } from 'lucide-react';

interface KeyboardPianoRollProps {
  engine: EchoEngine;
  onEnsureRunning: () => Promise<void>;
}

const KEYBOARD_SHORTCUTS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K'];

export const KeyboardPianoRoll: React.FC<KeyboardPianoRollProps> = ({
  engine,
  onEnsureRunning
}) => {
  const [scaleId, setScaleId] = useState<string>('locrian');
  const [octave, setOctave] = useState<number>(2);
  const [routeMode, setRouteMode] = useState<'both' | 'lead' | 'drone'>('both');
  const [droneLatch, setDroneLatch] = useState<boolean>(false);
  const [activeKeyIdx, setActiveKeyIdx] = useState<number | null>(null);
  const [keyModY, setKeyModY] = useState<number>(0.5);

  // 16-Step Piano Roll State
  const [seqPlaying, setSeqPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(112);
  const [stepProb, setStepProb] = useState<number>(0.92);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<SequencerStepState[]>(() =>
    SEQUENCER_PATTERNS[0].steps.map((s) => ({ ...s }))
  );

  const currentScale = SCALES.find((s) => s.id === scaleId) || SCALES[0];

  const getDegreeFreq = (degreeIdx: number, oct = octave): number => {
    const baseRoot = engine.params.synth.baseFreq || 55.0;
    const octMult = Math.pow(2, oct - 2);
    const cycleLen = currentScale.semitones.length;
    const cycleOctaves = Math.floor(degreeIdx / cycleLen);
    const inCycleIdx = degreeIdx % cycleLen;
    const semitones = currentScale.semitones[inCycleIdx] + cycleOctaves * 12;
    return baseRoot * octMult * Math.pow(2, semitones / 12);
  };

  const playDegree = async (degreeIdx: number, duration = 0.4, velocity = 0.85, modY = 0.5) => {
    await onEnsureRunning();
    const freq = getDegreeFreq(degreeIdx);
    if (routeMode === 'drone') {
      engine.setDroneNote(freq, 0.06);
    } else {
      engine.triggerNote(freq, duration, velocity, {
        modY,
        routeToDrone: routeMode === 'both'
      });
    }
  };

  const releaseKey = () => {
    setActiveKeyIdx(null);
    if (!droneLatch) {
      engine.setDroneNote(null, 0.18);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const upper = e.key.toUpperCase();
      const idx = KEYBOARD_SHORTCUTS.indexOf(upper);
      if (idx !== -1) {
        setActiveKeyIdx(idx);
        playDegree(idx, 0.45, 0.85, 0.6);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const upper = e.key.toUpperCase();
      const idx = KEYBOARD_SHORTCUTS.indexOf(upper);
      if (idx !== -1 && activeKeyIdx === idx) {
        releaseKey();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });

  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const scaleRef = useRef(currentScale);
  scaleRef.current = currentScale;
  const octRef = useRef(octave);
  octRef.current = octave;
  const probRef = useRef(stepProb);
  probRef.current = stepProb;
  const routeRef = useRef(routeMode);
  routeRef.current = routeMode;

  useEffect(() => {
    if (!seqPlaying) return;
    const stepMs = (60 / bpm / 4) * 1000;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % 16;
        const st = stepsRef.current[next];
        if (st && st.active && Math.random() <= probRef.current) {
          const baseRoot = engine.params.synth.baseFreq || 55.0;
          const octMult = Math.pow(2, octRef.current - 2);
          const semi = scaleRef.current.semitones[st.noteIndex % scaleRef.current.semitones.length];
          const freq = baseRoot * octMult * Math.pow(2, semi / 12);
          const gateDur = (stepMs / 1000) * 0.9;

          if (routeRef.current === 'drone') {
            engine.setDroneNote(freq, 0.04);
          } else {
            engine.triggerNote(freq, gateDur, st.velocity, {
              modY: st.velocity * 0.8,
              routeToDrone: routeRef.current === 'both'
            });
          }
        }
        return next;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [seqPlaying, bpm, engine]);

  const handleToggleSeq = async () => {
    if (!seqPlaying) {
      await onEnsureRunning();
      setSeqPlaying(true);
    } else {
      setSeqPlaying(false);
      if (!droneLatch) engine.setDroneNote(null, 0.2);
    }
  };

  const handleLoadPattern = (patId: string) => {
    const found = SEQUENCER_PATTERNS.find((p) => p.id === patId);
    if (!found) return;
    setScaleId(found.scaleId);
    setBpm(found.bpm);
    setSteps(found.steps.map((s) => ({ ...s })));
  };

  const handleRandomizePattern = () => {
    const newSteps: SequencerStepState[] = Array.from({ length: 16 }, (_, i) => {
      const active = i % 4 === 0 ? true : Math.random() < 0.62;
      const noteIndex = i === 0 ? 0 : Math.floor(Math.random() * 12);
      const velocity = Number((0.55 + Math.random() * 0.45).toFixed(2));
      return { active, noteIndex, velocity };
    });
    setSteps(newSteps);
  };

  const handleClearPattern = () => {
    setSteps(
      Array.from({ length: 16 }, () => ({
        active: false,
        noteIndex: 0,
        velocity: 0.75
      }))
    );
  };

  const handleCellClick = async (stepIdx: number, rowNoteIdx: number) => {
    setSteps((prev) =>
      prev.map((st, idx) => {
        if (idx !== stepIdx) return st;
        if (st.active && st.noteIndex === rowNoteIdx) {
          return { ...st, active: false };
        }
        return { ...st, active: true, noteIndex: rowNoteIdx };
      })
    );
    await playDegree(rowNoteIdx, 0.25, 0.8, 0.6);
    if (!droneLatch && !seqPlaying) {
      setTimeout(() => engine.setDroneNote(null, 0.15), 240);
    }
  };

  const rows = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="flex flex-col gap-4">
      {/* CARD 1: SCALE, TUNING & RIBBON KEYBOARD */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
        <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
          <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
            Microtonal Ribbon Keyboard
          </h2>
          <span className="font-mono-tech text-[11px] text-[var(--text-secondary)]">
            Vertical slide controls Filter & FM
          </span>
        </div>

        {/* Scale, Octave & Routing Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Scale & Tuning
            </label>
            <select
              value={scaleId}
              onChange={(e) => setScaleId(e.target.value)}
              className="bg-[var(--bg-well)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs font-medium w-full outline-none min-h-[40px]"
            >
              {SCALES.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Octave
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((oct) => (
                <button
                  key={oct}
                  onClick={() => setOctave(oct)}
                  className={`min-h-[40px] rounded-xl font-mono-tech text-xs font-semibold border cursor-pointer transition-colors ${
                    octave === oct
                      ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
                      : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  O{oct}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Voice Target
            </label>
            <select
              value={routeMode}
              onChange={(e) => setRouteMode(e.target.value as 'both' | 'lead' | 'drone')}
              className="bg-[var(--bg-well)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs font-medium w-full outline-none min-h-[40px]"
            >
              <option value="both">Lead + Drone Root</option>
              <option value="lead">Poly Lead Voice</option>
              <option value="drone">Drone Pitch Only</option>
            </select>
          </div>
        </div>

        {/* Scale description + Drone Latch button */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-[var(--bg-well)] border border-[var(--border-hairline)]">
          <span className="text-xs text-[var(--text-secondary)] truncate">
            {currentScale.description}
          </span>
          <button
            onClick={() => {
              const next = !droneLatch;
              setDroneLatch(next);
              if (!next) engine.setDroneNote(null, 0.2);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shrink-0 cursor-pointer transition-colors whitespace-nowrap ${
              droneLatch
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--bg-card)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {droneLatch ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {droneLatch ? 'Drone Latched' : 'Latch Drone'}
          </button>
        </div>

        {/* 13-Key Playable Touch Ribbon */}
        <div className="grid grid-cols-13 gap-1 h-[104px] select-none touch-none">
          {Array.from({ length: 13 }, (_, idx) => {
            const freq = getDegreeFreq(idx);
            const semi =
              idx < currentScale.semitones.length
                ? currentScale.semitones[idx]
                : 12;
            const isMicro = semi % 1 !== 0;
            const isActive = activeKeyIdx === idx;

            return (
              <div
                key={idx}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const my = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                  setActiveKeyIdx(idx);
                  setKeyModY(my);
                  playDegree(idx, 0.55, 0.9, my);
                }}
                onPointerMove={(e) => {
                  if (activeKeyIdx !== null && e.buttons > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const my = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    setKeyModY(my);
                  }
                }}
                onPointerUp={releaseKey}
                onPointerCancel={releaseKey}
                className={`relative rounded-xl border flex flex-col justify-between items-center py-2 px-0.5 cursor-pointer transition-all overflow-hidden ${
                  isActive
                    ? 'bg-[var(--accent-soft)] border-[var(--accent)] translate-y-[1px]'
                    : isMicro
                    ? 'bg-[var(--bg-well)] border-[var(--border-strong)] hover:border-[var(--accent)]'
                    : idx === 0 || idx === 12
                    ? 'bg-[var(--bg-card)] border-[var(--border-strong)] hover:border-[var(--accent)]'
                    : 'bg-[var(--bg-well)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[var(--accent-soft)] pointer-events-none"
                    style={{ height: `${keyModY * 100}%` }}
                  />
                )}
                <span className="font-mono-tech text-[9px] text-[var(--text-muted)] z-10">
                  {KEYBOARD_SHORTCUTS[idx]}
                </span>
                <span className="font-mono-tech text-[10px] font-semibold text-[var(--text-primary)] z-10">
                  +{semi.toFixed(semi % 1 === 0 ? 0 : 1)}
                </span>
                <span className="font-mono-tech text-[9px] text-[var(--text-secondary)] z-10">
                  {Math.round(freq)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* CARD 2: 16-STEP SEQUENCER / PIANO ROLL */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
              16-Step Piano Roll Sequencer
            </h2>
            {seqPlaying && (
              <span className="font-mono-tech text-xs font-semibold text-[var(--accent)]">
                Step {currentStep + 1} / 16
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRandomizePattern}
              title="Generate Random Pattern"
              className="min-h-[38px] bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Dices className="w-3.5 h-3.5 text-[var(--accent)]" />
              Generate
            </button>
            <button
              onClick={handleClearPattern}
              title="Clear All Steps"
              aria-label="Clear All Steps"
              className="min-h-[38px] min-w-[38px] bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-secondary)] hover:text-[var(--danger)] border border-[var(--border-hairline)] rounded-xl p-2 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleSeq}
              className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors whitespace-nowrap ${
                seqPlaying
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
              }`}
            >
              {seqPlaying ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  Play
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pattern Preset Bar + BPM & Probability Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Pattern Motif
            </label>
            <select
              onChange={(e) => handleLoadPattern(e.target.value)}
              defaultValue={SEQUENCER_PATTERNS[0].id}
              className="bg-[var(--bg-well)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs font-medium w-full outline-none min-h-[40px]"
            >
              {SEQUENCER_PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[var(--text-primary)]">Tempo</span>
              <span className="font-mono-tech text-[var(--accent)]">{bpm} BPM</span>
            </div>
            <input
              type="range"
              min={45}
              max={190}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="synth-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[var(--text-primary)]">Step Probability</span>
              <span className="font-mono-tech text-[var(--accent)]">{Math.round(stepProb * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.15}
              max={1.0}
              step={0.01}
              value={stepProb}
              onChange={(e) => setStepProb(Number(e.target.value))}
              className="synth-slider"
            />
          </div>
        </div>

        {/* 16-Step x 12-Degree Piano Roll Matrix */}
        <div className="bg-[var(--bg-well)] border border-[var(--border-hairline)] rounded-xl p-2 overflow-x-auto">
          <div className="min-w-[460px] flex flex-col gap-[3px]">
            {rows.map((rowNoteIdx) => {
              const semi = currentScale.semitones[rowNoteIdx % currentScale.semitones.length];
              return (
                <div key={rowNoteIdx} className="grid grid-cols-17 gap-[3px] items-center">
                  <div className="font-mono-tech text-[10px] text-[var(--text-secondary)] pr-1.5 text-right">
                    +{semi.toFixed(semi % 1 === 0 ? 0 : 1)}
                  </div>
                  {steps.map((st, stepIdx) => {
                    const isFilled = st.active && st.noteIndex === rowNoteIdx;
                    const isPlayhead = seqPlaying && currentStep === stepIdx;
                    const isBeatMarker = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => handleCellClick(stepIdx, rowNoteIdx)}
                        aria-label={`Step ${stepIdx + 1}, degree +${semi}`}
                        className={`h-[17px] rounded-[4px] border transition-colors cursor-pointer ${
                          isFilled
                            ? isPlayhead
                              ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)]'
                              : 'bg-[var(--accent)] border-[var(--accent)]'
                            : isPlayhead
                            ? 'bg-[var(--accent-soft)] border-[var(--accent)]'
                            : isBeatMarker
                            ? 'bg-[var(--bg-card)] border-[var(--border-strong)] hover:border-[var(--accent)]'
                            : 'bg-transparent border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                        }`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

type SequencerStepState = SequencerStep;
