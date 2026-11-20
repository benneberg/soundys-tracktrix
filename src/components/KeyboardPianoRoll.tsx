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
  const [octave, setOctave] = useState<number>(2); // 1 = ~32Hz, 2 = ~65Hz, 3 = ~130Hz, 4 = ~261Hz
  const [routeMode, setRouteMode] = useState<'both' | 'lead' | 'drone'>('both');
  const [droneLatch, setDroneLatch] = useState<boolean>(false);
  const [activeKeyIdx, setActiveKeyIdx] = useState<number | null>(null);
  const [keyModY, setKeyModY] = useState<number>(0.5);

  // 16-Step Piano Roll State
  const [seqPlaying, setSeqPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(112);
  const [stepProb, setStepProb] = useState<number>(0.92);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<SequencerStep[]>(() =>
    SEQUENCER_PATTERNS[0].steps.map((s) => ({ ...s }))
  );

  const currentScale = SCALES.find((s) => s.id === scaleId) || SCALES[0];

  // Calculate frequency in Hz for a given scale degree index (0..12)
  const getDegreeFreq = (degreeIdx: number, oct = octave): number => {
    const baseRoot = engine.params.synth.baseFreq || 55.0;
    const octMult = Math.pow(2, oct - 2);
    const cycleLen = currentScale.semitones.length;
    const cycleOctaves = Math.floor(degreeIdx / cycleLen);
    const inCycleIdx = degreeIdx % cycleLen;
    const semitones = currentScale.semitones[inCycleIdx] + cycleOctaves * 12;
    return baseRoot * octMult * Math.pow(2, semitones / 12);
  };

  // Trigger a note from keyboard or sequencer
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

  // Computer Keyboard Jamming Support
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

  // 16-Step Sequencer Clock Loop
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
    const stepMs = (60 / bpm / 4) * 1000; // 16th notes
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
    const newSteps: SequencerStep[] = Array.from({ length: 16 }, (_, i) => {
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
    // Audition note immediately on tap
    await playDegree(rowNoteIdx, 0.25, 0.8, 0.6);
    if (!droneLatch && !seqPlaying) {
      setTimeout(() => engine.setDroneNote(null, 0.15), 240);
    }
  };

  // Display rows 11 down to 0 in the Piano Roll matrix
  const rows = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="flex flex-col gap-3">
      {/* CARD 1: SCALE, TUNING & RIBBON KEYBOARD */}
      <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
          <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
            Microtonal & Dark Scale Ribbon Keyboard
          </span>
          <span className="font-mono-tech text-[10px] text-[#38e2c7]">
            Y-AXIS SLIDE = FILTER & FM MOD
          </span>
        </div>

        {/* Scale, Octave & Routing Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="col-span-2">
            <label className="block font-mono-tech text-[10px] text-[#7f889f] mb-1">
              SCALE / MICROTONAL TUNING
            </label>
            <select
              value={scaleId}
              onChange={(e) => setScaleId(e.target.value)}
              className="bg-[#090b10] text-[#e2e6f0] border border-[#384157] rounded-md px-2.5 py-1.5 font-mono-tech text-[11px] w-full outline-none"
            >
              {SCALES.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono-tech text-[10px] text-[#7f889f] mb-1">
              OCTAVE RANGE
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((oct) => (
                <button
                  key={oct}
                  onClick={() => setOctave(oct)}
                  className={`py-1.5 rounded font-mono-tech text-[11px] font-bold border cursor-pointer ${
                    octave === oct
                      ? 'bg-[#b886ff]/20 border-[#b886ff] text-[#b886ff]'
                      : 'bg-[#090b10] border-[#252a38] text-[#7f889f]'
                  }`}
                >
                  O{oct}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono-tech text-[10px] text-[#7f889f] mb-1">
              VOICE TARGET
            </label>
            <select
              value={routeMode}
              onChange={(e) => setRouteMode(e.target.value as 'both' | 'lead' | 'drone')}
              className="bg-[#090b10] text-[#38e2c7] border border-[#384157] rounded-md px-2 py-1.5 font-mono-tech text-[11px] w-full outline-none"
            >
              <option value="both">Lead + Drone Root</option>
              <option value="lead">Poly Lead Voice</option>
              <option value="drone">Drone Pitch Only</option>
            </select>
          </div>
        </div>

        {/* Scale description + Drone Latch button */}
        <div className="flex items-center justify-between gap-2 mb-2.5 bg-[#090b10] px-2.5 py-1.5 rounded border border-[#252a38]">
          <span className="text-[10px] text-[#7f889f] font-mono-tech truncate">
            {currentScale.description}
          </span>
          <button
            onClick={() => {
              const next = !droneLatch;
              setDroneLatch(next);
              if (!next) engine.setDroneNote(null, 0.2);
            }}
            className={`px-2 py-0.5 rounded font-mono-tech text-[10px] font-semibold flex items-center gap-1 border shrink-0 cursor-pointer ${
              droneLatch
                ? 'bg-[#38e2c7]/20 border-[#38e2c7] text-[#38e2c7]'
                : 'bg-[#161922] border-[#384157] text-[#7f889f]'
            }`}
          >
            {droneLatch ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {droneLatch ? 'DRONE LATCHED' : 'LATCH DRONE'}
          </button>
        </div>

        {/* 13-Key Playable Touch Ribbon */}
        <div className="grid grid-cols-13 gap-1 h-[96px] select-none touch-none">
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
                className={`relative rounded-md border flex flex-col justify-between items-center p-1 cursor-pointer transition-all overflow-hidden ${
                  isActive
                    ? 'bg-[#b886ff]/30 border-[#38e2c7] shadow-[0_0_12px_rgba(56,226,199,0.4)] translate-y-[1px]'
                    : isMicro
                    ? 'bg-[#12101b] border-[#b886ff]/40 hover:border-[#b886ff]'
                    : idx === 0 || idx === 12
                    ? 'bg-[#121820] border-[#38e2c7]/45 hover:border-[#38e2c7]'
                    : 'bg-[#090b10] border-[#252a38] hover:border-[#384157]'
                }`}
              >
                {/* Vertical expression fill bar */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#38e2c7]/25 pointer-events-none"
                    style={{ height: `${keyModY * 100}%` }}
                  />
                )}
                <span className="font-mono-tech text-[8px] text-[#7f889f] z-10">
                  {KEYBOARD_SHORTCUTS[idx]}
                </span>
                <span className="font-mono-tech text-[9px] font-bold text-[#e2e6f0] z-10">
                  +{semi.toFixed(semi % 1 === 0 ? 0 : 1)}
                </span>
                <span className="font-mono-tech text-[8px] text-[#38e2c7] z-10">
                  {Math.round(freq)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD 2: 16-STEP DARK SEQUENCER / PIANO ROLL */}
      <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
              16-Step Dark Piano Roll Sequencer
            </span>
            {seqPlaying && (
              <span className="px-1.5 py-0.5 rounded bg-[#38e2c7]/15 text-[#38e2c7] font-mono-tech text-[9px] font-bold">
                STEP {currentStep + 1}/16
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRandomizePattern}
              title="Generate Random Dark Pattern"
              className="bg-[#101218] hover:bg-[#1d2230] text-[#b886ff] border border-[#384157] rounded px-2 py-1 font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Dices className="w-3 h-3" />
              GEN
            </button>
            <button
              onClick={handleClearPattern}
              title="Clear All Steps"
              className="bg-[#101218] hover:bg-[#1d2230] text-[#7f889f] hover:text-[#ff4d6d] border border-[#252a38] rounded px-2 py-1 font-mono-tech text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleToggleSeq}
              className={`px-3 py-1 rounded font-mono-tech text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition ${
                seqPlaying
                  ? 'bg-[#38e2c7]/20 border-[#38e2c7] text-[#38e2c7]'
                  : 'bg-[#b886ff]/20 border-[#b886ff] text-[#b886ff]'
              }`}
            >
              {seqPlaying ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  STOP SEQ
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  PLAY SEQ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pattern Preset Bar + BPM & Probability Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          <div>
            <div className="flex justify-between font-mono-tech text-[10px] mb-1">
              <span className="text-[#7f889f]">PATTERN MOTIF</span>
            </div>
            <select
              onChange={(e) => handleLoadPattern(e.target.value)}
              defaultValue={SEQUENCER_PATTERNS[0].id}
              className="bg-[#090b10] text-[#e2e6f0] border border-[#384157] rounded-md px-2 py-1.5 font-mono-tech text-[11px] w-full outline-none"
            >
              {SEQUENCER_PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between font-mono-tech text-[10px] mb-1">
              <span className="text-[#e2e6f0]">Tempo (BPM)</span>
              <span className="text-[#38e2c7]">{bpm} BPM</span>
            </div>
            <input
              type="range"
              min={45}
              max={190}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="synth-slider cyan-slider"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono-tech text-[10px] mb-1">
              <span className="text-[#e2e6f0]">Step Probability</span>
              <span className="text-[#38e2c7]">{Math.round(stepProb * 100)}%</span>
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
        <div className="bg-[#090b10] border border-[#252a38] rounded-md p-1.5 overflow-x-auto">
          <div className="min-w-[440px] flex flex-col gap-[2px]">
            {rows.map((rowNoteIdx) => {
              const semi = currentScale.semitones[rowNoteIdx % currentScale.semitones.length];
              return (
                <div key={rowNoteIdx} className="grid grid-cols-17 gap-[2px] items-center">
                  {/* Degree Label Column */}
                  <div className="font-mono-tech text-[9px] text-[#7f889f] pr-1 text-right">
                    +{semi.toFixed(semi % 1 === 0 ? 0 : 1)}
                  </div>
                  {/* 16 Step Cells */}
                  {steps.map((st, stepIdx) => {
                    const isFilled = st.active && st.noteIndex === rowNoteIdx;
                    const isPlayhead = seqPlaying && currentStep === stepIdx;
                    const isBeatMarker = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => handleCellClick(stepIdx, rowNoteIdx)}
                        className={`h-[15px] rounded-[2px] border transition-colors cursor-pointer ${
                          isFilled
                            ? isPlayhead
                              ? 'bg-[#38e2c7] border-white shadow-[0_0_8px_#38e2c7]'
                              : 'bg-[#b886ff] border-[#b886ff]/80'
                            : isPlayhead
                            ? 'bg-[#38e2c7]/15 border-[#38e2c7]/40'
                            : isBeatMarker
                            ? 'bg-[#141822] border-[#252a38] hover:border-[#384157]'
                            : 'bg-[#0d1017] border-[#1b202c] hover:border-[#384157]'
                        }`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
