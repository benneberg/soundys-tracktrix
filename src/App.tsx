import React, { useEffect, useRef, useState } from 'react';
import {
  EchoEngine,
  EchoPreset,
  GrainTextureType,
  ModalMaterialType,
  OrbitShapeType,
  OscillatorWave,
  PresetCategory,
  QualityTier,
  WavetableBankType
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
type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'shadowflap_echo_v2_custom_presets';
const THEME_STORAGE_KEY = 'tracktrix_theme_mode';

function renderArcGauge(value: number, label: string, accentDanger = false) {
  const clamped = Math.max(0, Math.min(1, value));
  // 220-degree arc from 160deg to 380deg
  const r = 26;
  const cx = 34;
  const cy = 34;
  const startAngle = (160 * Math.PI) / 180;
  const totalSweep = (220 * Math.PI) / 180;
  const endAngle = startAngle + totalSweep;
  const activeAngle = startAngle + totalSweep * clamped;

  const pt = (ang: number, rad = r) => ({
    x: cx + rad * Math.cos(ang),
    y: cy + rad * Math.sin(ang)
  });

  const s = pt(startAngle);
  const e = pt(endAngle);
  const a = pt(activeAngle);
  const needle = pt(activeAngle, r - 6);

  const bgPath = `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  const largeArc = totalSweep * clamped > Math.PI ? 1 : 0;
  const fgPath =
    clamped > 0.005
      ? `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${a.x.toFixed(2)} ${a.y.toFixed(2)}`
      : '';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-well)] border border-[var(--border-hairline)]">
      <svg width="68" height="54" viewBox="0 0 68 58" className="shrink-0" aria-hidden="true">
        <path
          d={bgPath}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {fgPath && (
          <path
            d={fgPath}
            fill="none"
            stroke={accentDanger ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        )}
        <line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke="var(--text-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3" fill={accentDanger ? 'var(--danger)' : 'var(--accent)'} />
      </svg>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate">{label}</span>
        <span className="font-mono-tech text-lg font-semibold text-[var(--text-primary)] leading-tight">
          {clamped.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function App() {
  const engineRef = useRef<EchoEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new EchoEngine();
  }
  const engine = engineRef.current;

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#131210' : '#F5F4EE');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const [activeTab, setActiveTab] = useState<TabId>('perform');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>(engine.seed);
  const [masterVol, setMasterVol] = useState<number>(engine.masterVolume);
  const [qualityTier, setQualityTier] = useState<QualityTier>(engine.qualityTier);

  // Gameplay State Vector
  const [gameState, setGameState] = useState({ ...engine.state });

  // Synth, Filter, Granular, Spatial, Mod, FX, Modal, Wavetable Parameters
  const [params, setParams] = useState(() => ({
    synth: { ...engine.params.synth },
    filter: { ...engine.params.filter },
    granular: { ...engine.params.granular },
    spatial: { ...engine.params.spatial },
    modulation: { ...engine.params.modulation },
    fx: { ...engine.params.fx },
    modal: { ...engine.params.modal },
    wavetable: { ...engine.params.wavetable }
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
    setQualityTier(engine.qualityTier);
    setParams({
      synth: { ...engine.params.synth },
      filter: { ...engine.params.filter },
      granular: { ...engine.params.granular },
      spatial: { ...engine.params.spatial },
      modulation: { ...engine.params.modulation },
      fx: { ...engine.params.fx },
      modal: { ...engine.params.modal },
      wavetable: { ...engine.params.wavetable }
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
    showToast(`Seed rolled: ${newSeed}`);
  };

  const handleMutate = async () => {
    await ensureRunning();
    const nextSeed = seed.split('-')[0] + '-' + Math.floor(100 + Math.random() * 899);
    engine.applySeedIdentity(nextSeed);
    syncFromEngine('Mutated Soundscape');
    showToast('Soundscape mutated');
  };

  const handleSeedChange = async (newSeed: string) => {
    await ensureRunning();
    engine.applySeedIdentity(newSeed);
    syncFromEngine();
    showToast(`Seed applied: ${newSeed}`);
  };

  const handleResetAudio = async () => {
    await engine.panicReset();
    syncFromEngine();
    showToast('Audio engine reset');
  };

  const handleToggleQualityTier = () => {
    const next: QualityTier = qualityTier === 'high' ? 'mobile' : 'high';
    engine.setQualityTier(next);
    setQualityTier(next);
    showToast(next === 'mobile' ? 'Mobile Eco DSP (15Hz)' : 'Studio HQ DSP (HRTF)');
  };

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

  const updateGameState = (partial: Partial<typeof gameState>) => {
    engine.setState(partial);
    setGameState((prev) => ({ ...prev, ...partial }));
  };

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

  const handleTriggerEvent = async (evName: string) => {
    await ensureRunning();
    engine.triggerEvent(evName, { intensity: 0.88 });
    if (evName === 'newGame') {
      syncFromEngine('New Game Seed');
    }
    setFlashingEvent(evName);
    setTimeout(() => setFlashingEvent(null), 220);
  };

  const handleLoadPreset = async (preset: EchoPreset) => {
    await ensureRunning();
    engine.loadPreset(preset);
    setActivePresetName(preset.name);
    syncFromEngine(preset.name);
    showToast(`Loaded: ${preset.name}`);
  };

  const handleSaveCustomPreset = () => {
    const name = customNameInput.trim() || `Patch #${customPresets.length + 1}`;
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
    <div className="flex flex-col h-dvh w-full max-w-5xl mx-auto bg-[var(--bg-canvas)] md:border-x border-[var(--border-hairline)] select-none overflow-hidden">
      {/* HEADER + HARDWARE VISUALIZER */}
      <VisualizerHeader
        engine={engine}
        isRunning={isRunning}
        seed={seed}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onTogglePower={handleTogglePower}
        onMutate={handleMutate}
        onRollSeed={handleRollSeed}
        onSeedChange={handleSeedChange}
        onResetAudio={handleResetAudio}
      />

      {/* MAIN SCROLLABLE STUDIO WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* ================================================================
            TAB 1: PERFORM & GAMEPLAY SIMULATION
        ================================================================ */}
        {activeTab === 'perform' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN: ATMOSPHERE XY MATRIX + ANALOG GAUGES */}
            <section className="md:col-span-6 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-baseline gap-2">
                <div>
                  <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                    Atmosphere Matrix
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Touch XY modulation field
                  </p>
                </div>
                <span className="font-mono-tech text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-well)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1">
                  T {gameState.tension.toFixed(2)} · I {gameState.instability.toFixed(2)}
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
                    radial-gradient(circle at ${gameState.tension * 100}% ${(1 - gameState.instability) * 100}%, var(--accent-soft) 0%, transparent 55%),
                    linear-gradient(to right, var(--border-hairline) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--border-hairline) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 25% 25%, 25% 25%'
                }}
                className="relative w-full h-[210px] md:h-[250px] bg-[var(--bg-well)] border border-[var(--border-hairline)] rounded-xl touch-none overflow-hidden cursor-crosshair"
              >
                <span className="absolute top-2.5 left-3 font-mono-tech text-[10px] font-medium text-[var(--text-secondary)] pointer-events-none">
                  Instability / Chaos ↑
                </span>
                <span className="absolute bottom-2.5 right-3 font-mono-tech text-[10px] font-medium text-[var(--text-secondary)] pointer-events-none">
                  Tension / Filter →
                </span>

                {/* Concentric Hardware Target Ring */}
                <div
                  style={{
                    left: `${gameState.tension * 100}%`,
                    top: `${(1 - gameState.instability) * 100}%`
                  }}
                  className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-[var(--bg-card)]/80 border-2 border-[var(--accent)] pointer-events-none flex items-center justify-center shadow-sm"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                </div>
              </div>

              {/* Analog Dial Gauges (Tension & Instability) */}
              <div className="grid grid-cols-2 gap-2.5">
                {renderArcGauge(gameState.tension, 'Tension')}
                {renderArcGauge(gameState.instability, 'Instability', gameState.instability > 0.72)}
              </div>
            </section>

            {/* RIGHT COLUMN: EVENT TRIGGERS & STATE VECTORS */}
            <div className="md:col-span-6 flex flex-col gap-4">
              {/* EVENT TRIGGERS */}
              <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
                <div className="flex justify-between items-baseline gap-2 mb-3">
                  <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                    Event Triggers
                  </h2>
                  <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[180px]">
                    {activePresetName}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'newGame', label: 'New Game', danger: false },
                    { id: 'portal', label: 'Portal Warp', danger: false },
                    { id: 'approachingObstacle', label: 'Approach', danger: false },
                    { id: 'obstaclePassed', label: 'Passed', danger: false },
                    { id: 'sanityDrop', label: 'Sanity Drop', danger: true },
                    { id: 'stalkerSpawn', label: 'Stalker', danger: true },
                    { id: 'nearMiss', label: 'Near Miss', danger: true },
                    { id: 'collision', label: 'Collision', danger: true },
                    { id: 'gameOver', label: 'Game Over', danger: true }
                  ].map((ev) => {
                    const isFlashing = flashingEvent === ev.id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => handleTriggerEvent(ev.id)}
                        className={`min-h-[44px] py-2 px-2 text-xs font-semibold text-center rounded-xl border transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap truncate ${
                          ev.danger
                            ? isFlashing
                              ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
                              : 'bg-[var(--bg-well)] border-[var(--border-hairline)] hover:border-[var(--danger)] text-[var(--text-primary)]'
                            : isFlashing
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'bg-[var(--bg-well)] border-[var(--border-hairline)] hover:border-[var(--accent)] text-[var(--text-primary)]'
                        }`}
                      >
                        {ev.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* STATE VECTORS */}
              <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
                <div className="flex justify-between items-baseline mb-3">
                  <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                    State Vectors
                  </h2>
                  <span className="font-mono-tech text-[11px] text-[var(--text-secondary)]">
                    Continuous Macro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">Tension</span>
                      <span className="font-mono-tech text-[var(--accent)]">
                        {gameState.tension.toFixed(2)}
                      </span>
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
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">Instability</span>
                      <span className="font-mono-tech text-[var(--accent)]">
                        {gameState.instability.toFixed(2)}
                      </span>
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
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">Progression</span>
                      <span className="font-mono-tech text-[var(--accent)]">
                        {gameState.progression.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={gameState.progression}
                      onChange={(e) => updateGameState({ progression: parseFloat(e.target.value) })}
                      className="synth-slider"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">Proximity</span>
                      <span className="font-mono-tech text-[var(--danger)]">
                        {gameState.proximity.toFixed(2)}
                      </span>
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
              </section>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2: SYNTH, GRANULAR, MODAL & WAVETABLE ENGINE
        ================================================================ */}
        {activeTab === 'synth' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* GRANULAR & TEXTURE ENGINE */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                  Granular & Texture Engine
                </h2>
                <button
                  onClick={() => updateParam('granular', 'enabled', !params.granular.enabled)}
                  className={`px-3 py-1 rounded-lg font-mono-tech text-[11px] font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                    params.granular.enabled
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                >
                  {params.granular.enabled ? 'Active' : 'Bypassed'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
                {(
                  [
                    { id: 'metallic', label: 'Metallic' },
                    { id: 'choir', label: 'Choir' },
                    { id: 'subterranean', label: 'Sub-Abyss' },
                    { id: 'glitch', label: 'Glitch' },
                    { id: 'tape', label: 'Tape Gear' },
                    { id: 'hypnotic', label: 'Hypnosis' },
                    { id: 'liquid', label: 'Liquid' },
                    { id: 'modal', label: 'Modal Plate' }
                  ] as { id: GrainTextureType; label: string }[]
                ).map((tex) => (
                  <button
                    key={tex.id}
                    onClick={() => updateParam('granular', 'texture', tex.id)}
                    className={`min-h-[38px] py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap truncate ${
                      params.granular.texture === tex.id
                        ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
                        : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tex.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Cloud Mix</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.granular.mix.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.granular.mix}
                    onChange={(e) => updateParam('granular', 'mix', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Grain Density</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.granular.density.toFixed(1)} /s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={45}
                    step={0.5}
                    value={params.granular.density}
                    onChange={(e) => updateParam('granular', 'density', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>
              </div>
            </section>

            {/* PRIMARY TONE, FILTER & FM CORE */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex justify-between items-baseline mb-3">
                <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                  Primary Tone & Filter Core
                </h2>
                <span className="font-mono-tech text-[11px] text-[var(--text-secondary)]">
                  {params.synth.baseFreq.toFixed(1)} Hz
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Root Frequency</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.synth.baseFreq.toFixed(1)} Hz
                    </span>
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
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Filter Cutoff</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {Math.round(params.filter.cutoff)} Hz
                    </span>
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
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Cross-FM Depth</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {Math.round(params.synth.fmDepth)}
                    </span>
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
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Ring Mod Mix</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.synth.ringModMix.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.synth.ringModMix}
                    onChange={(e) => updateParam('synth', 'ringModMix', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>
              </div>
            </section>

            {/* ANNULUS PHYSICAL MODELING (MODAL) */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3 gap-2">
                <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)] truncate">
                  Annulus Physical Modeling
                </h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      await ensureRunning();
                      if (!params.modal.enabled) {
                        updateParam('modal', 'enabled', true);
                      }
                      engine.triggerModalStrike(params.synth.baseFreq * 2, 1.0);
                    }}
                    className="px-3 py-1 rounded-lg font-mono-tech text-[11px] font-semibold border bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer transition-colors"
                  >
                    Strike
                  </button>
                  <button
                    onClick={() => updateParam('modal', 'enabled', !params.modal.enabled)}
                    className={`px-3 py-1 rounded-lg font-mono-tech text-[11px] font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                      params.modal.enabled
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {params.modal.enabled ? 'Active' : 'Bypassed'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {(
                  [
                    { id: 'plate', label: 'Plate' },
                    { id: 'membrane', label: 'Membrane' },
                    { id: 'glass', label: 'Glass' },
                    { id: 'spring', label: 'Spring' }
                  ] as { id: ModalMaterialType; label: string }[]
                ).map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => updateParam('modal', 'material', mat.id)}
                    className={`min-h-[38px] py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      params.modal.material === mat.id
                        ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
                        : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {mat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Resonator Mix</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.modal.mix.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.modal.mix}
                    onChange={(e) => updateParam('modal', 'mix', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Bow Pressure</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.modal.bowPressure.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.modal.bowPressure}
                    onChange={(e) => updateParam('modal', 'bowPressure', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>
              </div>
            </section>

            {/* ZEBRALETTE SPLINE WAVETABLE & WAVEFOLDER */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3 gap-2">
                <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)] truncate">
                  Zebralette Wavetable & Fold
                </h2>
                <button
                  onClick={() => updateParam('wavetable', 'enabled', !params.wavetable.enabled)}
                  className={`px-3 py-1 rounded-lg font-mono-tech text-[11px] font-semibold border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    params.wavetable.enabled
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                >
                  {params.wavetable.enabled ? 'Active' : 'Bypassed'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
                {(
                  [
                    { id: 'neuro_spline', label: 'Neuro' },
                    { id: 'spectral_formant', label: 'Formant' },
                    { id: 'acid_fold', label: 'Acid Fold' },
                    { id: 'metallic_pwm', label: 'Metallic' }
                  ] as { id: WavetableBankType; label: string }[]
                ).map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => updateParam('wavetable', 'bank', bank.id)}
                    className={`min-h-[38px] py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap truncate ${
                      params.wavetable.bank === bank.id
                        ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
                        : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {bank.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Mix</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.wavetable.mix.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.wavetable.mix}
                    onChange={(e) => updateParam('wavetable', 'mix', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Morph</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.wavetable.position.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.wavetable.position}
                    onChange={(e) => updateParam('wavetable', 'position', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">Fold Drive</span>
                    <span className="font-mono-tech text-[var(--accent)]">
                      {params.wavetable.foldDrive.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={params.wavetable.foldDrive}
                    onChange={(e) => updateParam('wavetable', 'foldDrive', parseFloat(e.target.value))}
                    className="synth-slider"
                  />
                </div>
              </div>
            </section>

            {/* COLLAPSIBLE ADVANCED SYNTH, GRANULAR & SPECTRAL CONTROLS */}
            <section className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAdvancedSynth((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--bg-well)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                    Advanced Settings
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
                    Fine synth, grain window, comb & formant calibration
                  </span>
                </div>
                {showAdvancedSynth ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </button>

              {showAdvancedSynth && (
                <div className="p-4 border-t border-[var(--border-hairline)] flex flex-col gap-5">
                  {/* Granular Fine Tuning */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Grain Window Size</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {Math.round(params.granular.size * 1000)} ms
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.015}
                        max={0.45}
                        step={0.005}
                        value={params.granular.size}
                        onChange={(e) => updateParam('granular', 'size', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Grain Pitch Ratio</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.granular.pitch.toFixed(2)}x
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Microtonal Jitter</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.granular.pitchJitter.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Position Spray</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.granular.spray.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Reverse Grain Prob</span>
                        <span className="font-mono-tech text-[var(--danger)]">
                          {Math.round(params.granular.reverseProb * 100)}%
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">3D Grain Scatter</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.granular.spread.toFixed(2)}
                        </span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4 border-t border-[var(--border-hairline)]">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Osc 1 Waveform</span>
                      <select
                        value={params.synth.osc1Type}
                        onChange={(e) => updateParam('synth', 'osc1Type', e.target.value as OscillatorWave)}
                        className="bg-[var(--bg-well)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs font-medium outline-none min-h-[40px]"
                      >
                        <option value="sawtooth">Sawtooth</option>
                        <option value="triangle">Triangle</option>
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Osc 2 Waveform</span>
                      <select
                        value={params.synth.osc2Type}
                        onChange={(e) => updateParam('synth', 'osc2Type', e.target.value as OscillatorWave)}
                        className="bg-[var(--bg-well)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs font-medium outline-none min-h-[40px]"
                      >
                        <option value="triangle">Triangle</option>
                        <option value="sawtooth">Sawtooth</option>
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Unison Detune</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.synth.detuneSpread.toFixed(1)} ct
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Sub-Octave Level</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.synth.subLevel.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">FM Inharmonic Ratio</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.synth.fmRatio.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Ring Mod Freq</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {Math.round(params.synth.ringModFreq)} Hz
                        </span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={600}
                        step={1}
                        value={params.synth.ringModFreq}
                        onChange={(e) => updateParam('synth', 'ringModFreq', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Shepard Pitch Creep</span>
                        <span className="font-mono-tech text-[var(--danger)]">
                          {params.synth.pitchCreep.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Brown Noise Level</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.synth.noiseLevel.toFixed(2)}
                        </span>
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

                  {/* Spectral Comb, Formant, Modal & Wavetable Fine Tuning */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4 border-t border-[var(--border-hairline)]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Filter Resonance (Q)</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.filter.resonance.toFixed(1)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Comb Pitch</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {Math.round(params.filter.combFreq)} Hz
                        </span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={650}
                        step={1}
                        value={params.filter.combFreq}
                        onChange={(e) => updateParam('filter', 'combFreq', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Comb Feedback</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.filter.combFeedback.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.85}
                        step={0.01}
                        value={params.filter.combFeedback}
                        onChange={(e) => updateParam('filter', 'combFeedback', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Comb Mix</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.filter.combMix.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.filter.combMix}
                        onChange={(e) => updateParam('filter', 'combMix', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Vocal Vowel Morph</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.filter.formantMorph.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.filter.formantMorph}
                        onChange={(e) => updateParam('filter', 'formantMorph', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Vocal Cavity Mix</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.filter.formantMix.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.filter.formantMix}
                        onChange={(e) => updateParam('filter', 'formantMix', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Modal Inharmonicity</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.modal.inharmonicity.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.modal.inharmonicity}
                        onChange={(e) => updateParam('modal', 'inharmonicity', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Modal Damping</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.modal.damping.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.modal.damping}
                        onChange={(e) => updateParam('modal', 'damping', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Wavetable Tilt</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.wavetable.spectralTilt.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.02}
                        value={params.wavetable.spectralTilt}
                        onChange={(e) => updateParam('wavetable', 'spectralTilt', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 3: 3D SPATIAL AUDIO, BINAURAL BEATS & CAVERN FX
        ================================================================ */}
        {activeTab === 'mod3d' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* SPATIAL RADAR VIEWPORT */}
            <section className="md:col-span-7 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                  <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                    3D Spatial Field
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Doppler active · {qualityTier === 'mobile' ? 'EqualPower 15Hz' : 'HRTF 360° 25Hz'}
                  </p>
                </div>
                <button
                  onClick={handleToggleQualityTier}
                  className={`px-3 py-1.5 rounded-xl font-mono-tech text-[11px] font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                    qualityTier === 'mobile'
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                  }`}
                  title="Toggle Mobile Game CPU / HRTF Eco Mode"
                >
                  {qualityTier === 'mobile' ? 'Mobile Eco' : 'Studio HQ'}
                </button>
              </div>

              <Spatial3DRadar
                engine={engine}
                orbitShape={params.spatial.orbitShape}
                theme={theme}
                onSelectOrbitShape={(shape: OrbitShapeType) =>
                  updateParam('spatial', 'orbitShape', shape)
                }
                onEnsureRunning={ensureRunning}
              />
            </section>

            {/* PRIMARY ORBIT & SPACE SLIDERS */}
            <section className="md:col-span-5 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4 flex flex-col gap-3.5">
              <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                Orbit & Space Controls
              </h2>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">3D Orbit Speed</span>
                  <span className="font-mono-tech text-[var(--accent)]">
                    {params.spatial.orbitSpeed.toFixed(2)} Hz
                  </span>
                </div>
                <input
                  type="range"
                  min={0.02}
                  max={2.2}
                  step={0.02}
                  value={params.spatial.orbitSpeed}
                  onChange={(e) => updateParam('spatial', 'orbitSpeed', parseFloat(e.target.value))}
                  className="synth-slider"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">Orbit Distance</span>
                  <span className="font-mono-tech text-[var(--accent)]">
                    {params.spatial.orbitRadius.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={8.0}
                  step={0.1}
                  value={params.spatial.orbitRadius}
                  onChange={(e) => updateParam('spatial', 'orbitRadius', parseFloat(e.target.value))}
                  className="synth-slider"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">Cavern Convolver</span>
                  <span className="font-mono-tech text-[var(--accent)]">
                    {params.fx.reverbMix.toFixed(2)}
                  </span>
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
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">Master Output</span>
                  <span className="font-mono-tech text-[var(--accent)]">{masterVol.toFixed(2)}</span>
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
                  className="synth-slider"
                />
              </div>
            </section>

            {/* COLLAPSIBLE ADVANCED 3D, LFO & ECHO CONTROLS */}
            <section className="md:col-span-12 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAdvancedMod((v) => !v)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--bg-well)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                    Advanced Settings
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
                    Binaural split, LFO drift, delay & analog saturation
                  </span>
                </div>
                {showAdvancedMod ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </button>

              {showAdvancedMod && (
                <div className="p-4 border-t border-[var(--border-hairline)] flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Doppler Shift</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.spatial.dopplerShift.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.spatial.dopplerShift}
                        onChange={(e) => updateParam('spatial', 'dopplerShift', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Binaural Split</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.spatial.binauralDetune.toFixed(1)} Hz
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Elevation (Y)</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.spatial.elevation.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Haas Width</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {(params.spatial.haasWidth * 1000).toFixed(1)} ms
                        </span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-[var(--border-hairline)]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">LFO Sweep Rate</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.modulation.lfoRate.toFixed(2)} Hz
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">LFO Filter Depth</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {Math.round(params.modulation.lfoDepth)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Stochastic Drift</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.modulation.driftSpeed.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Stereo Motion</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.modulation.stereoWidth.toFixed(2)}
                        </span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-[var(--border-hairline)]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Echo Delay Time</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.fx.delayTime.toFixed(2)} s
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Echo Feedback</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.fx.delayFeedback.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Echo Wet Mix</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.fx.delayMix.toFixed(2)}
                        </span>
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
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Analog Drive</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {params.fx.drive.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={params.fx.drive}
                        onChange={(e) => updateParam('fx', 'drive', parseFloat(e.target.value))}
                        className="synth-slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 4: KEYBOARD & 16-STEP MICROTONAL PIANO ROLL
        ================================================================ */}
        {activeTab === 'keys' && (
          <KeyboardPianoRoll engine={engine} onEnsureRunning={ensureRunning} />
        )}

        {/* ================================================================
            TAB 5: PRESETS & JSON EXPORT
        ================================================================ */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* PRESET LIBRARY */}
            <section className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
                <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                  Soundscape Library
                </h2>
                <span className="font-mono-tech text-xs text-[var(--text-secondary)]">
                  {filteredPresets.length} patches
                </span>
              </div>

              {/* Interactive Category Filter Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'industrial', label: 'Industrial' },
                    { id: 'void', label: 'Void' },
                    { id: 'psychedelic', label: 'Psychedelic' },
                    { id: 'horror', label: 'Horror' },
                    { id: 'tape', label: 'Tape' },
                    { id: 'hypnotic', label: 'Hypnotic' },
                    { id: 'liquid', label: 'Liquid' },
                    { id: 'modal', label: 'Modal' },
                    { id: 'heavy', label: 'Heavy WT' },
                    { id: 'custom', label: 'Saved' }
                  ] as { id: PresetCategory | 'all'; label: string }[]
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setPresetFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                      presetFilter === cat.id
                        ? 'bg-[var(--active-chip-bg)] border-[var(--active-chip-bg)] text-[var(--active-chip-fg)]'
                        : 'bg-[var(--bg-well)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Save Current Patch Bar */}
              <div className="flex gap-2 mb-3.5">
                <input
                  type="text"
                  placeholder="Save current soundscape as..."
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="flex-1 bg-[var(--bg-well)] border border-[var(--border-hairline)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none select-text min-h-[40px]"
                />
                <button
                  onClick={handleSaveCustomPreset}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-colors min-h-[40px]"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save Patch
                </button>
              </div>

              {/* Preset Cards (Quiet Unboxed Metadata) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredPresets.map((preset) => {
                  const isSelected = activePresetName === preset.name;
                  return (
                    <div
                      key={preset.name}
                      onClick={() => handleLoadPreset(preset)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLoadPreset(preset);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[var(--accent-soft)] border-[var(--accent)]'
                          : 'bg-[var(--bg-well)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {preset.name}
                        </span>
                        {preset.category === 'custom' && (
                          <button
                            onClick={(e) => handleDeleteCustomPreset(preset.name, e)}
                            className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1 shrink-0 cursor-pointer"
                            title="Delete saved preset"
                            aria-label={`Delete ${preset.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {preset.description && (
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 m-0">
                          {preset.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 font-mono-tech text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                        <span className="text-[var(--accent)] font-medium">
                          {preset.category || 'patch'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{preset.synth.baseFreq}Hz</span>
                        <span aria-hidden="true">·</span>
                        <span>{preset.granular?.texture || 'metallic'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{preset.spatial?.orbitShape || 'circle'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* JSON CONFIG IMPORT / EXPORT */}
            <section className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-2xl p-4">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <h2 className="font-display-tech text-sm font-semibold text-[var(--text-primary)]">
                  Patch JSON Config
                </h2>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(jsonText)
                        .then(() => showToast('JSON copied to clipboard'));
                    }}
                    className="bg-[var(--bg-well)] hover:bg-[var(--bg-well-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Copy
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const parsed = JSON.parse(jsonText);
                        await ensureRunning();
                        engine.loadPreset(parsed);
                        setActivePresetName(parsed.name || 'Imported Patch');
                        syncFromEngine(parsed.name || 'Imported Patch');
                        showToast('JSON preset loaded');
                      } catch {
                        showToast('Invalid JSON format');
                      }
                    }}
                    className="bg-[var(--active-chip-bg)] text-[var(--active-chip-fg)] hover:opacity-90 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-opacity"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Load
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                aria-label="Preset JSON Configuration"
                className="w-full h-[220px] lg:h-[360px] bg-[var(--bg-well)] border border-[var(--border-hairline)] rounded-xl text-[var(--text-primary)] font-mono-tech text-[11px] p-3 resize-none outline-none select-text"
              />
            </section>
          </div>
        )}
      </main>

      {/* BOTTOM 5-TAB HARDWARE NAVIGATION BAR */}
      <nav
        aria-label="Primary Workspace Tabs"
        className="grid grid-cols-5 bg-[var(--bg-card)] border-t border-[var(--border-hairline)] pb-[env(safe-area-inset-bottom,0px)] shrink-0"
      >
        {(
          [
            { id: 'perform', label: 'Perform', icon: Activity },
            { id: 'synth', label: 'Synth', icon: Sliders },
            { id: 'mod3d', label: 'Mod 3D', icon: Compass },
            { id: 'keys', label: 'Keys', icon: Music },
            { id: 'presets', label: 'Presets', icon: Disc }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[54px] py-2 px-1 text-[11px] font-semibold cursor-pointer border-t-2 transition-colors flex flex-col items-center justify-center gap-1 whitespace-nowrap ${
                isActive
                  ? 'text-[var(--accent)] border-t-[var(--accent)]'
                  : 'text-[var(--text-secondary)] border-t-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TOAST NOTIFICATION */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-[70px] left-1/2 -translate-x-1/2 bg-[var(--active-chip-bg)] text-[var(--active-chip-fg)] font-mono-tech text-xs font-semibold px-4 py-2 rounded-full pointer-events-none transition-all duration-200 z-50 shadow-md ${
          toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        {toastMsg}
      </div>
    </div>
  );
}
export default App;
