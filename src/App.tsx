import React, { useEffect, useRef, useState } from 'react';
import {
  EchoEngine,
  EchoPreset,
  GrainTextureType,
  OrbitShapeType,
  OscillatorWave,
  PresetCategory
} from './audio/EchoEngine';
import { FACTORY_PRESETS } from './audio/presets';
import { VisualizerHeader } from './components/VisualizerHeader';
import { Spatial3DRadar } from './components/Spatial3DRadar';
import { KeyboardPianoRoll } from './components/KeyboardPianoRoll';
import {
  Activity,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Disc,
  Music,
  Sliders,
  SlidersHorizontal,
  Trash2,
  Upload
} from 'lucide-react';

type TabId = 'perform' | 'synth' | 'mod3d' | 'keys' | 'presets';

const STORAGE_KEY = 'shadowflap_echo_v2_custom_presets';

export function App() {
  const engineRef = useRef<EchoEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new EchoEngine();
  }
  const engine = engineRef.current;

  const [activeTab, setActiveTab] = useState<TabId>('perform');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>(engine.seed);
  const [masterVol, setMasterVol] = useState<number>(engine.masterVolume);

  // Gameplay State Vector
  const [gameState, setGameState] = useState({ ...engine.state });

  // Synth, Filter, Granular, Spatial, Mod, FX Parameters
  const [params, setParams] = useState(() => ({
    synth: { ...engine.params.synth },
    filter: { ...engine.params.filter },
    granular: { ...engine.params.granular },
    spatial: { ...engine.params.spatial },
    modulation: { ...engine.params.modulation },
    fx: { ...engine.params.fx }
  }));

  // Presets & JSON State
  const [presetFilter, setPresetFilter] = useState<PresetCategory | 'all'>('all');
  const [activePresetName, setActivePresetName] = useState<string>('Subterranean Reactor');
  const [customPresets, setCustomPresets] = useState<EchoPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customNameInput, setCustomNameInput] = useState<string>('');
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(engine.exportPreset('Subterranean Reactor', 'industrial'), null, 2)
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [flashingEvent, setFlashingEvent] = useState<string | null>(null);
  const [showAdvancedSynth, setShowAdvancedSynth] = useState<boolean>(false);
  const [showAdvancedMod, setShowAdvancedMod] = useState<boolean>(false);

  // XY Pad Ref
  const xyPadRef = useRef<HTMLDivElement | null>(null);
  const isDraggingXYRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1900);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const syncFromEngine = (presetName = activePresetName) => {
    setSeed(engine.seed);
    setParams({
      synth: { ...engine.params.synth },
      filter: { ...engine.params.filter },
      granular: { ...engine.params.granular },
      spatial: { ...engine.params.spatial },
      modulation: { ...engine.params.modulation },
      fx: { ...engine.params.fx }
    });
    setJsonText(JSON.stringify(engine.exportPreset(presetName), null, 2));
  };

  const ensureRunning = async () => {
    if (!engine.isRunning) {
      await engine.start(seed);
      setIsRunning(true);
    }
  };

  const handleTogglePower = async () => {
    if (!engine.isRunning) {
      await engine.start(seed);
      setIsRunning(true);
    } else {
      await engine.stop();
      setIsRunning(false);
    }
  };

  const handleRollSeed = async () => {
    const newSeed = 'sf-' + Math.random().toString(36).substring(2, 7);
    await ensureRunning();
    engine.applySeedIdentity(newSeed);
    syncFromEngine('Seeded Mutation');
    showToast(`Seed Rolled: ${newSeed}`);
  };

  const handleMutate = async () => {
    await ensureRunning();
    const nextSeed = seed.split('-')[0] + '-' + Math.floor(100 + Math.random() * 899);
    engine.applySeedIdentity(nextSeed);
    syncFromEngine('Mutated Soundscape');
    showToast('Soundscape Mutated');
  };

  const handleSeedChange = async (newSeed: string) => {
    await ensureRunning();
    engine.applySeedIdentity(newSeed);
    syncFromEngine();
    showToast(`Seed Applied: ${newSeed}`);
  };

  const handleResetAudio = async () => {
    await engine.panicReset();
    syncFromEngine();
    showToast('Audio Engine Reset');
  };

  // Update a parameter in a category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateParam = (category: keyof typeof params, key: string, value: any) => {
    engine.setParam(category, key, value);
    setParams((prev) => {
      const next = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      };
      setJsonText(JSON.stringify(engine.exportPreset(activePresetName), null, 2));
      return next;
    });
  };

  // Update continuous gameplay state
  const updateGameState = (partial: Partial<typeof gameState>) => {
    engine.setState(partial);
    setGameState((prev) => ({ ...prev, ...partial }));
  };

  // XY Pad Pointer Handling
  const handleXYPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const pad = xyPadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const tension = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const instability = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    updateGameState({
      tension: Number(tension.toFixed(2)),
      instability: Number(instability.toFixed(2))
    });
  };

  // Trigger Discrete Gameplay Event
  const handleTriggerEvent = async (evName: string) => {
    await ensureRunning();
    engine.triggerEvent(evName, { intensity: 0.88 });
    if (evName === 'newGame') {
      syncFromEngine('New Game Seed');
    }
    setFlashingEvent(evName);
    setTimeout(() => setFlashingEvent(null), 240);
  };

  // Load Preset
  const handleLoadPreset = async (preset: EchoPreset) => {
    await ensureRunning();
    engine.loadPreset(preset);
    setActivePresetName(preset.name);
    syncFromEngine(preset.name);
    showToast(`Loaded: ${preset.name}`);
  };

  // Save Custom Preset to localStorage
  const handleSaveCustomPreset = () => {
    const name = customNameInput.trim() || `Dark Patch #${customPresets.length + 1}`;
    const exported = engine.exportPreset(name, 'custom');
    const updated = [exported, ...customPresets.filter((p) => p.name !== name)];
    setCustomPresets(updated);
    setActivePresetName(name);
    setCustomNameInput('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
    setJsonText(JSON.stringify(exported, null, 2));
    showToast(`Saved: ${name}`);
  };

  const handleDeleteCustomPreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.name !== name);
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast(`Deleted: ${name}`);
  };

  const allPresets = [...customPresets, ...FACTORY_PRESETS];
  const filteredPresets =
    presetFilter === 'all'
      ? allPresets
      : allPresets.filter((p) => (p.category || 'custom') === presetFilter);

  return (
    <div className="flex flex-col h-dvh max-w-[760px] mx-auto bg-[#101218] border-x border-[#252a38] select-none overflow-hidden">
      {/* HEADER + OSCILLOSCOPE / 3D VECTORSCOPE */}
      <VisualizerHeader
        engine={engine}
        isRunning={isRunning}
        seed={seed}
        onTogglePower={handleTogglePower}
        onMutate={handleMutate}
        onRollSeed={handleRollSeed}
        onSeedChange={handleSeedChange}
        onResetAudio={handleResetAudio}
      />

      {/* MAIN SCROLLABLE WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* ================================================================
            TAB 1: PERFORM & GAMEPLAY SIMULATION
        ================================================================ */}
        {activeTab === 'perform' && (
          <div className="flex flex-col gap-3">
            {/* 2D XY MACRO PAD */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
                  Atmosphere & Tension Matrix (Touch XY)
                </span>
                <span className="font-mono-tech text-[10px] text-[#38e2c7]">
                  T: {gameState.tension.toFixed(2)} | I: {gameState.instability.toFixed(2)}
                </span>
              </div>

              <div
                ref={xyPadRef}
                onPointerDown={async (e) => {
                  await ensureRunning();
                  isDraggingXYRef.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleXYPointer(e);
                }}
                onPointerMove={(e) => {
                  if (isDraggingXYRef.current) handleXYPointer(e);
                }}
                onPointerUp={() => {
                  isDraggingXYRef.current = false;
                }}
                style={{
                  backgroundImage: `
                    radial-gradient(circle at ${gameState.tension * 100}% ${(1 - gameState.instability) * 100}%, rgba(184, 134, 255, 0.22) 0%, transparent 60%),
                    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 20% 20%, 20% 20%'
                }}
                className="relative w-full h-[170px] bg-[#090b10] border border-[#384157] rounded-lg touch-none overflow-hidden cursor-crosshair"
              >
                <span className="absolute top-1.5 left-2 font-mono-tech text-[9px] text-[#7f889f] pointer-events-none uppercase tracking-wider">
                  ▲ INSTABILITY / GRAIN CHAOS / RING MOD
                </span>
                <span className="absolute bottom-1.5 right-2 font-mono-tech text-[9px] text-[#7f889f] pointer-events-none uppercase tracking-wider">
                  TENSION / FILTER / COMB DANGER ►
                </span>

                {/* Glowing XY Puck */}
                <div
                  style={{
                    left: `${gameState.tension * 100}%`,
                    top: `${(1 - gameState.instability) * 100}%`
                  }}
                  className="absolute w-[26px] h-[26px] -ml-[13px] -mt-[13px] rounded-full bg-[#b886ff]/30 border-2 border-[#b886ff] shadow-[0_0_16px_#b886ff] pointer-events-none flex items-center justify-center"
                >
                  <div className="w-2 h-2 rounded-full bg-[#38e2c7]" />
                </div>
              </div>
            </div>

            {/* DISCRETE GAMEPLAY EVENT TRIGGERS (9 EVENTS) */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
                  Discrete Gameplay & Horror Event Triggers
                </span>
                <span className="font-mono-tech text-[10px] text-[#b886ff]">
                  {activePresetName}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'newGame', label: 'NEW GAME', danger: false },
                  { id: 'portal', label: 'PORTAL WARP', danger: false },
                  { id: 'approachingObstacle', label: 'APPROACH', danger: false },
                  { id: 'obstaclePassed', label: 'PASSED', danger: false },
                  { id: 'sanityDrop', label: 'SANITY DROP', danger: true },
                  { id: 'stalkerSpawn', label: 'STALKER SPAWN', danger: true },
                  { id: 'nearMiss', label: 'NEAR MISS', danger: true },
                  { id: 'collision', label: 'COLLISION', danger: true },
                  { id: 'gameOver', label: 'GAME OVER', danger: true }
                ].map((ev) => {
                  const isFlashing = flashingEvent === ev.id;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => handleTriggerEvent(ev.id)}
                      className={`py-2.5 px-2 font-mono-tech text-[10px] font-semibold text-center rounded-md border transition active:scale-95 cursor-pointer ${
                        ev.danger
                          ? isFlashing
                            ? 'border-[#ff4d6d] bg-[#ff4d6d]/25 text-[#ff4d6d]'
                            : 'bg-[#12151e] border-[#384157] hover:border-[#ff4d6d]/60 text-[#e2e6f0]'
                          : isFlashing
                          ? 'border-[#38e2c7] bg-[#38e2c7]/20 text-[#38e2c7]'
                          : 'bg-[#12151e] border-[#384157] hover:border-[#38e2c7]/60 text-[#e2e6f0]'
                      }`}
                    >
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONTINUOUS GAMEPLAY STATE VECTORS */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
                  Continuous Gameplay State Vectors
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Tension (Filter / FM / Comb)</span>
                    <span className="text-[#38e2c7]">{gameState.tension.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={gameState.tension}
                    onChange={(e) => updateGameState({ tension: parseFloat(e.target.value) })}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Instability (Detune / Grain Jitter)</span>
                    <span className="text-[#38e2c7]">{gameState.instability.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={gameState.instability}
                    onChange={(e) => updateGameState({ instability: parseFloat(e.target.value) })}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Progression (Harmonic Pitch Shift)</span>
                    <span className="text-[#38e2c7]">{gameState.progression.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={gameState.progression}
                    onChange={(e) => updateGameState({ progression: parseFloat(e.target.value) })}
                    className="synth-slider cyan-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Proximity (3D Orbit Closing In)</span>
                    <span className="text-[#ff4d6d]">{gameState.proximity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={gameState.proximity}
                    onChange={(e) => updateGameState({ proximity: parseFloat(e.target.value) })}
                    className="synth-slider danger-slider"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2: SYNTH, GRANULAR CLOUD & RESONANT HORROR FILTERS
        ================================================================ */}
        {activeTab === 'synth' && (
          <div className="flex flex-col gap-3">
            {/* CORE SOUNDSCAPE TEXTURE & HIGH-IMPACT CONTROLS */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#b886ff]">
                  Granular & Texture Engine
                </span>
                <button
                  onClick={() => updateParam('granular', 'enabled', !params.granular.enabled)}
                  className={`px-2.5 py-0.5 rounded font-mono-tech text-[10px] font-bold border cursor-pointer ${
                    params.granular.enabled
                      ? 'bg-[#38e2c7]/20 border-[#38e2c7] text-[#38e2c7]'
                      : 'bg-[#090b10] border-[#384157] text-[#7f889f]'
                  }`}
                >
                  {params.granular.enabled ? 'GRAINS ACTIVE' : 'GRAINS BYPASSED'}
                </button>
              </div>

              {/* 7 Grain / Soundscape Textures */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
                {(
                  [
                    { id: 'metallic', label: 'METALLIC SCRAPE' },
                    { id: 'choir', label: 'SPECTRAL CHOIR' },
                    { id: 'subterranean', label: 'SUBTERRANEAN' },
                    { id: 'glitch', label: 'FRACTAL GLITCH' },
                    { id: 'tape', label: 'TAPE & TEST GEAR' },
                    { id: 'hypnotic', label: 'HYPNOSIS DUB' },
                    { id: 'liquid', label: 'LIQUID ALCHEMY' }
                  ] as { id: GrainTextureType; label: string }[]
                ).map((tex) => (
                  <button
                    key={tex.id}
                    onClick={() => updateParam('granular', 'texture', tex.id)}
                    className={`py-1.5 px-1.5 rounded font-mono-tech text-[9px] font-semibold border transition cursor-pointer ${
                      params.granular.texture === tex.id
                        ? 'bg-[#b886ff]/20 border-[#b886ff] text-[#b886ff]'
                        : 'bg-[#090b10] border-[#252a38] text-[#7f889f] hover:text-[#e2e6f0]'
                    }`}
                  >
                    {tex.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Granular Cloud Level</span>
                    <span className="text-[#38e2c7]">{params.granular.mix.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.granular.mix}
                    onChange={(e) => updateParam('granular', 'mix', parseFloat(e.target.value))}
                    className="synth-slider cyan-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Grain Density (Spawn Rate)</span>
                    <span className="text-[#38e2c7]">{params.granular.density.toFixed(1)} /s</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={45}
                    step={0.5}
                    value={params.granular.density}
                    onChange={(e) => updateParam('granular', 'density', parseFloat(e.target.value))}
                    className="synth-slider cyan-slider"
                  />
                </div>
              </div>
            </div>

            {/* PRIMARY TONE & FILTER MACRO CONTROLS */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
                  Primary Tone, Filter & FM Core
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Base Drone Root Freq</span>
                    <span className="text-[#38e2c7]">{params.synth.baseFreq.toFixed(1)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={28}
                    max={140}
                    step={0.5}
                    value={params.synth.baseFreq}
                    onChange={(e) => updateParam('synth', 'baseFreq', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Drone Filter Cutoff</span>
                    <span className="text-[#38e2c7]">{Math.round(params.filter.cutoff)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={3600}
                    step={5}
                    value={params.filter.cutoff}
                    onChange={(e) => updateParam('filter', 'cutoff', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Cross-FM Depth</span>
                    <span className="text-[#38e2c7]">{Math.round(params.synth.fmDepth)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={160}
                    step={1}
                    value={params.synth.fmDepth}
                    onChange={(e) => updateParam('synth', 'fmDepth', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Ring Mod Metallic Mix</span>
                    <span className="text-[#f59e0b]">{params.synth.ringModMix.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.synth.ringModMix}
                    onChange={(e) => updateParam('synth', 'ringModMix', parseFloat(e.target.value))}
                    className="synth-slider amber-slider"
                  />
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE ADVANCED SYNTH, GRANULAR & SPECTRAL CONTROLS */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg overflow-hidden">
              <button
                onClick={() => setShowAdvancedSynth((v) => !v)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#1a1e29] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#b886ff]" />
                  <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#e2e6f0]">
                    Advanced Settings (Fine Synth, Grains & Formants)
                  </span>
                </div>
                {showAdvancedSynth ? (
                  <ChevronUp className="w-4 h-4 text-[#38e2c7]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#7f889f]" />
                )}
              </button>

              {showAdvancedSynth && (
                <div className="p-3 pt-2 border-t border-[#252a38] flex flex-col gap-4">
                  {/* Granular Fine Tuning */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Grain Window Size</span>
                        <span className="text-[#38e2c7]">{Math.round(params.granular.size * 1000)} ms</span>
                      </div>
                      <input
                        type="range"
                        min={0.015}
                        max={0.45}
                        step={0.005}
                        value={params.granular.size}
                        onChange={(e) => updateParam('granular', 'size', parseFloat(e.target.value))}
                        className="synth-slider cyan-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Grain Pitch Ratio</span>
                        <span className="text-[#38e2c7]">{params.granular.pitch.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.25}
                        max={3.0}
                        step={0.01}
                        value={params.granular.pitch}
                        onChange={(e) => updateParam('granular', 'pitch', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Microtonal Pitch Jitter</span>
                        <span className="text-[#38e2c7]">{params.granular.pitchJitter.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.granular.pitchJitter}
                        onChange={(e) => updateParam('granular', 'pitchJitter', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Position Spray / Chaos</span>
                        <span className="text-[#38e2c7]">{params.granular.spray.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.granular.spray}
                        onChange={(e) => updateParam('granular', 'spray', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Reverse Grain Probability</span>
                        <span className="text-[#ff4d6d]">{Math.round(params.granular.reverseProb * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.granular.reverseProb}
                        onChange={(e) => updateParam('granular', 'reverseProb', parseFloat(e.target.value))}
                        className="synth-slider danger-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">3D Stereo Grain Scatter</span>
                        <span className="text-[#38e2c7]">{params.granular.spread.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.granular.spread}
                        onChange={(e) => updateParam('granular', 'spread', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>
                  </div>

                  {/* Oscillators, Sub, Ring, Creep */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#252a38]">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono-tech text-[11px] text-[#e2e6f0]">Osc 1 Waveform</span>
                      <select
                        value={params.synth.osc1Type}
                        onChange={(e) => updateParam('synth', 'osc1Type', e.target.value as OscillatorWave)}
                        className="bg-[#090b10] text-[#e2e6f0] border border-[#384157] rounded-md px-2.5 py-1.5 font-mono-tech text-[11px] outline-none"
                      >
                        <option value="sawtooth">Sawtooth</option>
                        <option value="triangle">Triangle</option>
                        <option value="sine">Sine</option>
                        <option value="square">Square (Hollow)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-mono-tech text-[11px] text-[#e2e6f0]">Osc 2 Waveform</span>
                      <select
                        value={params.synth.osc2Type}
                        onChange={(e) => updateParam('synth', 'osc2Type', e.target.value as OscillatorWave)}
                        className="bg-[#090b10] text-[#e2e6f0] border border-[#384157] rounded-md px-2.5 py-1.5 font-mono-tech text-[11px] outline-none"
                      >
                        <option value="triangle">Triangle</option>
                        <option value="sawtooth">Sawtooth</option>
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Unison Detune Spread</span>
                        <span className="text-[#38e2c7]">{params.synth.detuneSpread.toFixed(1)} ct</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={75}
                        step={0.5}
                        value={params.synth.detuneSpread}
                        onChange={(e) => updateParam('synth', 'detuneSpread', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Sub-Octave Abyss Level</span>
                        <span className="text-[#38e2c7]">{params.synth.subLevel.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.synth.subLevel}
                        onChange={(e) => updateParam('synth', 'subLevel', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">FM Inharmonic Ratio</span>
                        <span className="text-[#38e2c7]">{params.synth.fmRatio.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.25}
                        max={4.0}
                        step={0.01}
                        value={params.synth.fmRatio}
                        onChange={(e) => updateParam('synth', 'fmRatio', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Ring Modulator Freq</span>
                        <span className="text-[#f59e0b]">{Math.round(params.synth.ringModFreq)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={600}
                        step={1}
                        value={params.synth.ringModFreq}
                        onChange={(e) => updateParam('synth', 'ringModFreq', parseFloat(e.target.value))}
                        className="synth-slider amber-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Shepard Pitch Creep</span>
                        <span className="text-[#ff4d6d]">{params.synth.pitchCreep.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={-0.8}
                        max={0.8}
                        step={0.02}
                        value={params.synth.pitchCreep}
                        onChange={(e) => updateParam('synth', 'pitchCreep', parseFloat(e.target.value))}
                        className="synth-slider danger-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Brown Noise Texture Level</span>
                        <span className="text-[#38e2c7]">{params.synth.noiseLevel.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.9}
                        step={0.01}
                        value={params.synth.noiseLevel}
                        onChange={(e) => updateParam('synth', 'noiseLevel', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>
                  </div>

                  {/* Spectral Comb & Formant Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#252a38]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Drone Filter Resonance (Q)</span>
                        <span className="text-[#38e2c7]">{params.filter.resonance.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={14}
                        step={0.1}
                        value={params.filter.resonance}
                        onChange={(e) => updateParam('filter', 'resonance', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Metallic Comb Pitch</span>
                        <span className="text-[#f59e0b]">{Math.round(params.filter.combFreq)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={650}
                        step={1}
                        value={params.filter.combFreq}
                        onChange={(e) => updateParam('filter', 'combFreq', parseFloat(e.target.value))}
                        className="synth-slider amber-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Comb Feedback Resonance</span>
                        <span className="text-[#f59e0b]">{params.filter.combFeedback.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.85}
                        step={0.01}
                        value={params.filter.combFeedback}
                        onChange={(e) => updateParam('filter', 'combFeedback', parseFloat(e.target.value))}
                        className="synth-slider amber-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Comb Resonator Mix</span>
                        <span className="text-[#f59e0b]">{params.filter.combMix.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.filter.combMix}
                        onChange={(e) => updateParam('filter', 'combMix', parseFloat(e.target.value))}
                        className="synth-slider amber-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Vocal Formant Vowel Morph</span>
                        <span className="text-[#ff4d6d]">{params.filter.formantMorph.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.filter.formantMorph}
                        onChange={(e) => updateParam('filter', 'formantMorph', parseFloat(e.target.value))}
                        className="synth-slider danger-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Vocal Cavity Whisper Mix</span>
                        <span className="text-[#ff4d6d]">{params.filter.formantMix.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.filter.formantMix}
                        onChange={(e) => updateParam('filter', 'formantMix', parseFloat(e.target.value))}
                        className="synth-slider danger-slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 3: 3D SPATIAL AUDIO, BINAURAL BEATS & DARK CAVERN FX
        ================================================================ */}
        {activeTab === 'mod3d' && (
          <div className="flex flex-col gap-3">
            {/* 3D BINAURAL & HRTF SPATIALIZER */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#b886ff]">
                  3D HRTF Spatial Orbit & Space
                </span>
                <span className="font-mono-tech text-[10px] text-[#38e2c7]">
                  HRTF 360° // DOPPLER ACTIVE
                </span>
              </div>

              <Spatial3DRadar
                engine={engine}
                orbitShape={params.spatial.orbitShape}
                onSelectOrbitShape={(shape: OrbitShapeType) =>
                  updateParam('spatial', 'orbitShape', shape)
                }
                onEnsureRunning={ensureRunning}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">3D Orbit Speed</span>
                    <span className="text-[#38e2c7]">{params.spatial.orbitSpeed.toFixed(2)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={2.2}
                    step={0.02}
                    value={params.spatial.orbitSpeed}
                    onChange={(e) => updateParam('spatial', 'orbitSpeed', parseFloat(e.target.value))}
                    className="synth-slider cyan-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">3D Orbit Distance (Radius)</span>
                    <span className="text-[#38e2c7]">{params.spatial.orbitRadius.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={8.0}
                    step={0.1}
                    value={params.spatial.orbitRadius}
                    onChange={(e) => updateParam('spatial', 'orbitRadius', parseFloat(e.target.value))}
                    className="synth-slider cyan-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Cavern Convolver Reverb</span>
                    <span className="text-[#38e2c7]">{params.fx.reverbMix.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.92}
                    step={0.01}
                    value={params.fx.reverbMix}
                    onChange={(e) => updateParam('fx', 'reverbMix', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono-tech text-[11px]">
                    <span className="text-[#e2e6f0]">Master Output Gain</span>
                    <span className="text-[#38e2c7]">{masterVol.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={masterVol}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMasterVol(v);
                      engine.setMasterVolume(v);
                    }}
                    className="synth-slider cyan-slider"
                  />
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE ADVANCED 3D, LFO & ECHO CONTROLS */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg overflow-hidden">
              <button
                onClick={() => setShowAdvancedMod((v) => !v)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#1a1e29] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#38e2c7]" />
                  <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#e2e6f0]">
                    Advanced Settings (Binaural, LFO Drift & Echo Network)
                  </span>
                </div>
                {showAdvancedMod ? (
                  <ChevronUp className="w-4 h-4 text-[#38e2c7]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#7f889f]" />
                )}
              </button>

              {showAdvancedMod && (
                <div className="p-3 pt-2 border-t border-[#252a38] flex flex-col gap-4">
                  {/* Spatial Psychoacoustics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Relativistic Doppler Shift</span>
                        <span className="text-[#f59e0b]">{params.spatial.dopplerShift.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.spatial.dopplerShift}
                        onChange={(e) => updateParam('spatial', 'dopplerShift', parseFloat(e.target.value))}
                        className="synth-slider amber-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Binaural Beat Freq Split (L/R)</span>
                        <span className="text-[#b886ff]">{params.spatial.binauralDetune.toFixed(1)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={22}
                        step={0.2}
                        value={params.spatial.binauralDetune}
                        onChange={(e) => updateParam('spatial', 'binauralDetune', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">3D Elevation Offset (Y-Axis)</span>
                        <span className="text-[#38e2c7]">{params.spatial.elevation.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.05}
                        value={params.spatial.elevation}
                        onChange={(e) => updateParam('spatial', 'elevation', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Haas Psychoacoustic Width</span>
                        <span className="text-[#38e2c7]">{(params.spatial.haasWidth * 1000).toFixed(1)} ms</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.025}
                        step={0.001}
                        value={params.spatial.haasWidth}
                        onChange={(e) => updateParam('spatial', 'haasWidth', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>
                  </div>

                  {/* Autonomous Drift & LFO */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#252a38]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">LFO Sweep Rate</span>
                        <span className="text-[#38e2c7]">{params.modulation.lfoRate.toFixed(2)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min={0.02}
                        max={2.5}
                        step={0.01}
                        value={params.modulation.lfoRate}
                        onChange={(e) => updateParam('modulation', 'lfoRate', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">LFO Filter Depth</span>
                        <span className="text-[#38e2c7]">{Math.round(params.modulation.lfoDepth)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={900}
                        step={5}
                        value={params.modulation.lfoDepth}
                        onChange={(e) => updateParam('modulation', 'lfoDepth', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Stochastic Drift Rate</span>
                        <span className="text-[#38e2c7]">{params.modulation.driftSpeed.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.modulation.driftSpeed}
                        onChange={(e) => updateParam('modulation', 'driftSpeed', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Stereo Pan Motion Width</span>
                        <span className="text-[#38e2c7]">{params.modulation.stereoWidth.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.modulation.stereoWidth}
                        onChange={(e) => updateParam('modulation', 'stereoWidth', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>
                  </div>

                  {/* Echo Delay & Analog Drive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#252a38]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Echo Delay Time</span>
                        <span className="text-[#38e2c7]">{params.fx.delayTime.toFixed(2)} s</span>
                      </div>
                      <input
                        type="range"
                        min={0.08}
                        max={0.95}
                        step={0.01}
                        value={params.fx.delayTime}
                        onChange={(e) => updateParam('fx', 'delayTime', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Echo Feedback</span>
                        <span className="text-[#38e2c7]">{params.fx.delayFeedback.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.85}
                        step={0.01}
                        value={params.fx.delayFeedback}
                        onChange={(e) => updateParam('fx', 'delayFeedback', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Echo Wet Mix</span>
                        <span className="text-[#38e2c7]">{params.fx.delayMix.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.85}
                        step={0.01}
                        value={params.fx.delayMix}
                        onChange={(e) => updateParam('fx', 'delayMix', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono-tech text-[11px]">
                        <span className="text-[#e2e6f0]">Analog Waveshaper Drive</span>
                        <span className="text-[#f59e0b]">{params.fx.drive.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.fx.drive}
                        onChange={(e) => updateParam('fx', 'drive', parseFloat(e.target.value))}
                        className="synth-slider amber-slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 4: KEYBOARD & 16-STEP MICROTONAL PIANO ROLL
        ================================================================ */}
        {activeTab === 'keys' && (
          <KeyboardPianoRoll engine={engine} onEnsureRunning={ensureRunning} />
        )}

        {/* ================================================================
            TAB 5: PRESETS & SHADOWFLAP JSON EXPORT
        ================================================================ */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-3">
            {/* PRESET LIBRARY CARD */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
                  Factory & Custom Soundscapes ({filteredPresets.length})
                </span>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'all', label: 'ALL' },
                      { id: 'industrial', label: 'INDUSTRIAL' },
                      { id: 'void', label: 'VOID' },
                      { id: 'psychedelic', label: 'PSYCHEDELIC' },
                      { id: 'horror', label: 'HORROR' },
                      { id: 'tape', label: 'TAPE/NOISE' },
                      { id: 'hypnotic', label: 'HYPNOTIC' },
                      { id: 'liquid', label: 'LIQUID' },
                      { id: 'custom', label: 'SAVED' }
                    ] as { id: PresetCategory | 'all'; label: string }[]
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setPresetFilter(cat.id)}
                      className={`px-2 py-0.5 rounded font-mono-tech text-[9px] font-bold border cursor-pointer transition ${
                        presetFilter === cat.id
                          ? 'bg-[#b886ff]/20 border-[#b886ff] text-[#b886ff]'
                          : 'bg-[#090b10] border-[#252a38] text-[#7f889f] hover:text-[#e2e6f0]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Current Patch Bar */}
              <div className="flex gap-1.5 mb-3">
                <input
                  type="text"
                  placeholder="Save current soundscape as..."
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="flex-1 bg-[#090b10] border border-[#384157] rounded-md px-2.5 py-1.5 font-mono-tech text-[11px] text-[#e2e6f0] outline-none select-text"
                />
                <button
                  onClick={handleSaveCustomPreset}
                  className="bg-[#38e2c7]/15 hover:bg-[#38e2c7]/25 text-[#38e2c7] border border-[#38e2c7] rounded-md px-3 py-1.5 font-mono-tech text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  SAVE PATCH
                </button>
              </div>

              {/* Preset Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredPresets.map((preset) => {
                  const isSelected = activePresetName === preset.name;
                  const catBadgeColor =
                    preset.category === 'horror'
                      ? 'text-[#ff4d6d] border-[#ff4d6d]/40 bg-[#ff4d6d]/10'
                      : preset.category === 'psychedelic'
                      ? 'text-[#b886ff] border-[#b886ff]/40 bg-[#b886ff]/10'
                      : preset.category === 'void'
                      ? 'text-[#38e2c7] border-[#38e2c7]/40 bg-[#38e2c7]/10'
                      : preset.category === 'tape'
                      ? 'text-[#eab308] border-[#eab308]/40 bg-[#eab308]/10'
                      : preset.category === 'hypnotic'
                      ? 'text-[#60a5fa] border-[#60a5fa]/40 bg-[#60a5fa]/10'
                      : preset.category === 'liquid'
                      ? 'text-[#34d399] border-[#34d399]/40 bg-[#34d399]/10'
                      : preset.category === 'custom'
                      ? 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10'
                      : 'text-[#9ca3af] border-[#384157] bg-[#101218]';

                  return (
                    <div
                      key={preset.name}
                      onClick={() => handleLoadPreset(preset)}
                      className={`group p-2.5 rounded-md border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-[#b886ff]/14 border-[#b886ff] shadow-[0_0_12px_rgba(184,134,255,0.18)]'
                          : 'bg-[#101218] border-[#252a38] hover:border-[#384157]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono-tech text-[11px] font-bold text-[#e2e6f0] truncate">
                          {preset.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[8px] font-mono-tech uppercase border ${catBadgeColor}`}
                          >
                            {preset.category || 'patch'}
                          </span>
                          {preset.category === 'custom' && (
                            <button
                              onClick={(e) => handleDeleteCustomPreset(preset.name, e)}
                              className="text-[#7f889f] hover:text-[#ff4d6d] p-0.5"
                              title="Delete saved preset"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {preset.description && (
                        <p className="text-[10px] text-[#7f889f] line-clamp-1 m-0">
                          {preset.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[9px] font-mono-tech text-[#38e2c7]/80 mt-0.5">
                        <span>{preset.synth.baseFreq}Hz</span>
                        <span>•</span>
                        <span>GRAIN: {preset.granular?.texture || 'metallic'}</span>
                        <span>•</span>
                        <span>3D: {preset.spatial?.orbitShape || 'circle'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* JSON CONFIG IMPORT / EXPORT */}
            <div className="bg-[#161922] border border-[#252a38] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-display-tech text-[11px] font-bold uppercase tracking-wider text-[#7f889f]">
                  Shadowflap JSON Config Import / Export
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(jsonText)
                        .then(() => showToast('JSON Copied to Clipboard!'));
                    }}
                    className="bg-[#101218] hover:bg-[#1e2230] text-[#38e2c7] border border-[#384157] rounded px-2 py-1 font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    COPY JSON
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const parsed = JSON.parse(jsonText);
                        await ensureRunning();
                        engine.loadPreset(parsed);
                        setActivePresetName(parsed.name || 'Imported Patch');
                        syncFromEngine(parsed.name || 'Imported Patch');
                        showToast('JSON Preset Loaded!');
                      } catch {
                        showToast('Invalid JSON Format');
                      }
                    }}
                    className="bg-[#101218] hover:bg-[#1e2230] text-[#b886ff] border border-[#384157] rounded px-2 py-1 font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    LOAD JSON
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                className="w-full h-[145px] bg-[#080a0f] border border-[#384157] rounded-md text-[#38e2c7] font-mono-tech text-[10px] p-2 resize-none outline-none select-text"
              />
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM 5-TAB HARDWARE NAVIGATION BAR */}
      <nav className="grid grid-cols-5 bg-[#07080b] border-t border-[#252a38] pb-[env(safe-area-inset-bottom,0px)] shrink-0">
        {(
          [
            { id: 'perform', label: 'PERFORM', icon: Activity },
            { id: 'synth', label: 'SYNTH/GRAIN', icon: Sliders },
            { id: 'mod3d', label: 'MOD & 3D', icon: Compass },
            { id: 'keys', label: 'KEYS/ROLL', icon: Music },
            { id: 'presets', label: 'PRESETS', icon: Disc }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-1 font-mono-tech text-[10px] font-semibold cursor-pointer border-t-2 transition flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? 'text-[#b886ff] border-t-[#b886ff] bg-[#b886ff]/8'
                  : 'text-[#7f889f] border-t-transparent hover:text-[#e2e6f0]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-[64px] left-1/2 -translate-x-1/2 bg-[#b886ff] text-[#07080b] font-mono-tech text-[11px] font-bold px-3.5 py-1.5 rounded-full pointer-events-none transition-all duration-200 z-50 shadow-[0_0_20px_rgba(184,134,255,0.5)] ${
          toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {toastMsg}
      </div>
    </div>
  );
}
export default App;
