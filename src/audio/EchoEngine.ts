/**
 * ============================================================================
 * SHADOWFLAP // ECHO ENGINE v2.0
 * Procedural Dark, Psychedelic & 3D Granular Audio Engine
 * Zero external assets. Pure Web Audio API.
 * ============================================================================
 */

import {
  WavetableBankType,
  createWavefolderCurve,
  createWavetableBank
} from './wavetables';
import {
  MODAL_RATIOS,
  ModalMaterialType,
  getModalWorkletUrl
} from './modalWorklet';

export type { WavetableBankType, ModalMaterialType };

export type OscillatorWave = 'sawtooth' | 'triangle' | 'sine' | 'square';
export type GrainTextureType =
  | 'metallic'
  | 'choir'
  | 'subterranean'
  | 'glitch'
  | 'tape'
  | 'hypnotic'
  | 'liquid'
  | 'modal';
export type OrbitShapeType = 'circle' | 'figure8' | 'spiral' | 'stalker' | 'pendulum' | 'manual';
export type QualityTier = 'high' | 'mobile';
export type PresetCategory =
  | 'industrial'
  | 'void'
  | 'psychedelic'
  | 'horror'
  | 'tape'
  | 'hypnotic'
  | 'liquid'
  | 'modal'
  | 'heavy'
  | 'custom';

export interface GameplayStateVector {
  tension: number;      // 0.0 to 1.0
  instability: number;  // 0.0 to 1.0
  progression: number;  // 0.0 to 1.0
  proximity: number;    // 0.0 to 1.0
}

export interface SynthParams {
  baseFreq: number;
  osc1Type: OscillatorWave;
  osc2Type: OscillatorWave;
  detuneSpread: number;
  subLevel: number;
  fmRatio: number;
  fmDepth: number;
  noiseLevel: number;
  ringModFreq: number;
  ringModMix: number;
  pitchCreep: number; // -1.0 to 1.0 Shepard-like unsettling drift
}

export interface FilterParams {
  cutoff: number;
  resonance: number;
  noiseCutoff: number;
  noiseQ: number;
  combFreq: number;      // 35 Hz to 650 Hz metallic comb resonator
  combFeedback: number;  // 0.0 to 0.92
  combMix: number;       // 0.0 to 1.0
  formantMorph: number;  // 0.0 to 1.0 dark vocal cavity morph
  formantMix: number;    // 0.0 to 1.0
}

export interface GranularParams {
  enabled: boolean;
  texture: GrainTextureType;
  density: number;       // 1 to 45 grains/sec
  size: number;          // 0.015 to 0.45 sec
  spray: number;         // 0.0 to 1.0 position/timing randomness
  pitch: number;         // 0.25 to 3.0 playback rate
  pitchJitter: number;   // 0.0 to 1.0 random pitch scatter
  spread: number;        // 0.0 to 1.0 3D / stereo scatter
  reverseProb: number;   // 0.0 to 1.0 probability of reversed grain
  mix: number;           // 0.0 to 1.0
}

export interface Spatial3DParams {
  orbitShape: OrbitShapeType;
  orbitSpeed: number;     // 0.02 to 2.5 Hz
  orbitRadius: number;    // 0.5 to 10.0 meters
  elevation: number;      // -1.0 to +1.0
  dopplerShift: number;   // 0.0 to 1.0
  binauralDetune: number; // 0.0 to 25.0 Hz
  haasWidth: number;      // 0.0 to 0.025 s
  manualX: number;        // -1.0 to 1.0
  manualZ: number;        // -1.0 to 1.0
}

export interface ModulationParams {
  lfoRate: number;
  lfoDepth: number;
  driftSpeed: number;
  stereoWidth: number;
}

export interface FxParams {
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  reverbMix: number;
  drive: number;
}

export interface ModalParams {
  enabled: boolean;
  material: ModalMaterialType;
  inharmonicity: number; // 0.0 to 1.0
  damping: number;       // 0.0 to 1.0
  bowPressure: number;   // 0.0 to 1.0
  mix: number;           // 0.0 to 1.0
}

export interface WavetableParams {
  enabled: boolean;
  bank: WavetableBankType;
  position: number;     // 0.0 to 1.0 across 8 spline frames
  foldDrive: number;    // 0.0 to 1.0 West-Coast wavefolder
  spectralTilt: number; // -1.0 to +1.0
  mix: number;          // 0.0 to 1.0
}

export interface EchoPreset {
  name: string;
  category?: PresetCategory;
  description?: string;
  version: string;
  seed: string;
  synth: SynthParams;
  filter: FilterParams;
  granular?: Partial<GranularParams>;
  spatial?: Partial<Spatial3DParams>;
  modulation: ModulationParams;
  fx: FxParams;
  modal?: Partial<ModalParams>;
  wavetable?: Partial<WavetableParams>;
}

export interface GrainVisualEvent {
  id: number;
  x: number;         // -1 to 1 pan/spatial X
  z: number;         // -1 to 1 spatial Z
  pitch: number;     // normalized 0 to 1
  size: number;      // duration in sec
  reversed: boolean;
  bornAt: number;    // performance.now()
}

export interface SpatialTelemetry {
  x: number; // -1 to 1 normalized for radar
  y: number; // -1 to 1 elevation
  z: number; // -1 to 1 front/back
  dopplerFactor: number;
  angle: number;
  distance: number;
}

// Dark vowel formant frequency pairs [F1, F2]
const DARK_FORMANTS: [number, number][] = [
  [650, 1080], // 'AH' (Cavernous throat)
  [420, 820],  // 'OH' (Deep omen)
  [290, 680],  // 'OO' (Abyssal murmur)
  [480, 1680], // 'EH' (Strained groan)
  [270, 2150]  // 'EE' (Wailing specter)
];

function clampFinite(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export class EchoEngine {
  public ctx: AudioContext | null = null;
  public isRunning = false;
  public seed = 'shadow-409';
  private prng: () => number;
  private driftTimer: ReturnType<typeof setInterval> | null = null;
  private spatialTimer: ReturnType<typeof setInterval> | null = null;
  private grainTimer: ReturnType<typeof setTimeout> | null = null;
  public masterVolume = 0.78;
  public qualityTier: QualityTier =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
      ? 'mobile'
      : 'high';
  private modalWorkletReady = false;
  private wavetableFrames: PeriodicWave[] = [];

  public state: GameplayStateVector = {
    tension: 0.2,
    instability: 0.25,
    progression: 0.1,
    proximity: 0.0
  };

  public params: {
    synth: SynthParams;
    filter: FilterParams;
    granular: GranularParams;
    spatial: Spatial3DParams;
    modulation: ModulationParams;
    fx: FxParams;
    modal: ModalParams;
    wavetable: WavetableParams;
  } = {
    synth: {
      baseFreq: 55.0,
      osc1Type: 'sawtooth',
      osc2Type: 'triangle',
      detuneSpread: 14.0,
      subLevel: 0.45,
      fmRatio: 1.41,
      fmDepth: 18.0,
      noiseLevel: 0.25,
      ringModFreq: 92.0,
      ringModMix: 0.15,
      pitchCreep: 0.0
    },
    filter: {
      cutoff: 320.0,
      resonance: 4.2,
      noiseCutoff: 680.0,
      noiseQ: 6.5,
      combFreq: 110.0,
      combFeedback: 0.55,
      combMix: 0.22,
      formantMorph: 0.3,
      formantMix: 0.35
    },
    granular: {
      enabled: true,
      texture: 'metallic',
      density: 12.0,
      size: 0.11,
      spray: 0.45,
      pitch: 1.0,
      pitchJitter: 0.25,
      spread: 0.75,
      reverseProb: 0.35,
      mix: 0.42
    },
    spatial: {
      orbitShape: 'circle',
      orbitSpeed: 0.22,
      orbitRadius: 3.2,
      elevation: 0.15,
      dopplerShift: 0.35,
      binauralDetune: 3.5,
      haasWidth: 0.008,
      manualX: 0.0,
      manualZ: -0.5
    },
    modulation: {
      lfoRate: 0.12,
      lfoDepth: 140.0,
      driftSpeed: 0.35,
      stereoWidth: 0.60
    },
    fx: {
      delayTime: 0.42,
      delayFeedback: 0.48,
      delayMix: 0.32,
      reverbMix: 0.45,
      drive: 0.20
    },
    modal: {
      enabled: false,
      material: 'plate',
      inharmonicity: 0.35,
      damping: 0.45,
      bowPressure: 0.32,
      mix: 0.55
    },
    wavetable: {
      enabled: false,
      bank: 'neuro_spline',
      position: 0.35,
      foldDrive: 0.42,
      spectralTilt: 0.0,
      mix: 0.6
    }
  };

  private driftOffsets = {
    detune: 0,
    cutoffFactor: 1,
    noiseFactor: 1,
    fmAdd: 0,
    creepPhase: 0,
    stalkerX: 0,
    stalkerZ: -1
  };

  public spatialTelemetry: SpatialTelemetry = {
    x: 0,
    y: 0,
    z: -0.5,
    dopplerFactor: 1.0,
    angle: 0,
    distance: 3.2
  };

  private orbitPhase = 0;
  private prevListenerDist = 3.2;
  public recentGrains: GrainVisualEvent[] = [];
  private grainIdCounter = 0;
  private droneFreqOverride: number | null = null;

  // Pre-computed procedural grain buffers
  private grainBuffers: Record<GrainTextureType, { forward: AudioBuffer; reverse: AudioBuffer }> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public nodes: Record<string, any> = {};

  constructor() {
    this.prng = this._createPRNG(this.seed);
    this._bindLifecycle();
  }

  private _createPRNG(seedStr: string): () => number {
    let h = 1779033703 ^ String(seedStr).length;
    for (let i = 0; i < String(seedStr).length; i++) {
      h = Math.imul(h ^ String(seedStr).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = (h ^ (h >>> 16)) >>> 0;
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  public async init(): Promise<void> {
    if (this.ctx) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.audioSession) {
      try {
        nav.audioSession.type = 'playback';
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });

    // Load inline Blob AudioWorklet for Annulus Modal Physical Modeling
    if (this.ctx.audioWorklet) {
      try {
        await this.ctx.audioWorklet.addModule(getModalWorkletUrl());
        this.modalWorkletReady = true;
      } catch {
        this.modalWorkletReady = false;
      }
    }

    this._buildGraph();
  }

  private _buildGraph(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // 1. Core Drone Oscillators + Binaural Detune + Cross-FM
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const fmOsc = ctx.createOscillator();

    osc1.type = this.params.synth.osc1Type;
    osc2.type = this.params.synth.osc2Type;
    subOsc.type = 'sine';
    fmOsc.type = 'sine';

    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    const subGain = ctx.createGain();
    const fmGain = ctx.createGain();

    osc1Gain.gain.value = 0.34;
    osc2Gain.gain.value = 0.34;
    subGain.gain.value = this.params.synth.subLevel * 0.5;
    fmGain.gain.value = this.params.synth.fmDepth;

    fmOsc.connect(fmGain);
    fmGain.connect(osc1.frequency);
    fmGain.connect(osc2.frequency);

    // 2. Main Resonant Filter
    const mainFilter = ctx.createBiquadFilter();
    mainFilter.type = 'lowpass';
    mainFilter.frequency.value = this.params.filter.cutoff;
    mainFilter.Q.value = this.params.filter.resonance;

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    subOsc.connect(subGain);
    osc1Gain.connect(mainFilter);
    osc2Gain.connect(mainFilter);
    subGain.connect(mainFilter);

    // 2b. Zebralette-Inspired Morphing Spline Wavetable + West-Coast Wavefolder Stage
    this.wavetableFrames = createWavetableBank(
      ctx,
      this.params.wavetable.bank,
      this.params.wavetable.spectralTilt
    );
    const wtOscA = ctx.createOscillator();
    const wtOscB = ctx.createOscillator();
    const wtSubOsc = ctx.createOscillator();
    const wtGainA = ctx.createGain();
    const wtGainB = ctx.createGain();
    const wtSubGain = ctx.createGain();
    const wtFoldShaper = ctx.createWaveShaper();
    const wtBus = ctx.createGain();

    if (this.wavetableFrames.length > 0) {
      wtOscA.setPeriodicWave(this.wavetableFrames[0]);
      wtOscB.setPeriodicWave(this.wavetableFrames[Math.min(1, this.wavetableFrames.length - 1)]);
    }
    wtSubOsc.type = 'sine';
    wtGainA.gain.value = 0.5;
    wtGainB.gain.value = 0.0;
    wtSubGain.gain.value = 0.45;
    wtFoldShaper.curve = createWavefolderCurve(this.params.wavetable.foldDrive);
    wtFoldShaper.oversample = '2x';
    wtBus.gain.value = this.params.wavetable.enabled
      ? clampFinite(this.params.wavetable.mix, 0, 1, 0.6) * 0.65
      : 0.0001;

    wtOscA.connect(wtGainA);
    wtOscB.connect(wtGainB);
    wtGainA.connect(wtFoldShaper);
    wtGainB.connect(wtFoldShaper);
    wtFoldShaper.connect(wtBus);
    wtSubOsc.connect(wtSubGain);
    wtSubGain.connect(wtBus);
    wtBus.connect(mainFilter);

    // 3. Ring Modulator Stage (for uncanny metallic/alien/psychedelic dread)
    const ringCarrierGain = ctx.createGain();
    ringCarrierGain.gain.value = 0; // modulated by ringOsc
    const ringOsc = ctx.createOscillator();
    ringOsc.type = 'sine';
    ringOsc.frequency.value = this.params.synth.ringModFreq;
    ringOsc.connect(ringCarrierGain.gain);

    const ringDryGain = ctx.createGain();
    const ringWetGain = ctx.createGain();
    ringDryGain.gain.value = 1 - this.params.synth.ringModMix * 0.6;
    ringWetGain.gain.value = this.params.synth.ringModMix;

    mainFilter.connect(ringDryGain);
    mainFilter.connect(ringCarrierGain);
    ringCarrierGain.connect(ringWetGain);

    // 4. Hybrid Brown/Pink Noise + Dual Vocal Formant Cavity Filter
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this._createBrownNoiseBuffer(5.0);
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = this.params.filter.noiseCutoff;
    noiseFilter.Q.value = this.params.filter.noiseQ;

    const formantF1 = ctx.createBiquadFilter();
    const formantF2 = ctx.createBiquadFilter();
    formantF1.type = 'bandpass';
    formantF2.type = 'bandpass';
    formantF1.Q.value = 9.0;
    formantF2.Q.value = 11.0;

    const formantGain = ctx.createGain();
    formantGain.gain.value = this.params.filter.formantMix * 0.55;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = this.params.synth.noiseLevel * 0.4;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // Also feed noise + drone into the vocal formant filters
    noiseSource.connect(formantF1);
    noiseSource.connect(formantF2);
    mainFilter.connect(formantF1);
    mainFilter.connect(formantF2);
    formantF1.connect(formantGain);
    formantF2.connect(formantGain);

    // 5. Metallic Comb Filter / Karplus-Strong Resonator (with DC-blocker & safe feedback)
    const combInput = ctx.createGain();
    const combDelay = ctx.createDelay(0.1);
    combDelay.delayTime.value = 1 / clampFinite(this.params.filter.combFreq, 30, 800, 110);
    const combDamp = ctx.createBiquadFilter();
    combDamp.type = 'lowpass';
    combDamp.frequency.value = 3200;
    const combDCBlock = ctx.createBiquadFilter();
    combDCBlock.type = 'highpass';
    combDCBlock.frequency.value = 24;
    const combFeedbackGain = ctx.createGain();
    combFeedbackGain.gain.value = clampFinite(this.params.filter.combFeedback, 0, 0.85, 0.55);
    const combWetGain = ctx.createGain();
    combWetGain.gain.value = clampFinite(this.params.filter.combMix, 0, 1, 0.22) * 0.65;

    combInput.connect(combDelay);
    combDelay.connect(combDamp);
    combDamp.connect(combDCBlock);
    combDCBlock.connect(combFeedbackGain);
    combFeedbackGain.connect(combDelay);
    combDCBlock.connect(combWetGain);

    // 6. Granular Cloud Bus
    const grainBus = ctx.createGain();
    grainBus.gain.value = clampFinite(this.params.granular.mix, 0, 1, 0.42);

    // Pre-compute procedural grain buffers (including Tape, Hypnotic Dub, Liquid Alchemy, and Modal)
    this.grainBuffers = {
      metallic: this._createGrainTextureBuffer('metallic', 4.5),
      choir: this._createGrainTextureBuffer('choir', 4.5),
      subterranean: this._createGrainTextureBuffer('subterranean', 4.5),
      glitch: this._createGrainTextureBuffer('glitch', 4.5),
      tape: this._createGrainTextureBuffer('tape', 4.5),
      hypnotic: this._createGrainTextureBuffer('hypnotic', 4.5),
      liquid: this._createGrainTextureBuffer('liquid', 4.5),
      modal: this._createGrainTextureBuffer('modal', 4.5)
    };

    // 7. Audio-Thread LFOs
    const lfoFilter = ctx.createOscillator();
    const lfoFilterGain = ctx.createGain();
    lfoFilter.type = 'sine';
    lfoFilter.frequency.value = clampFinite(this.params.modulation.lfoRate, 0.02, 12, 0.12);
    lfoFilterGain.gain.value = clampFinite(this.params.modulation.lfoDepth, 0, 900, 140);
    lfoFilter.connect(lfoFilterGain);
    lfoFilterGain.connect(mainFilter.frequency);

    const lfoPan = ctx.createOscillator();
    const lfoPanGain = ctx.createGain();
    lfoPan.type = 'triangle';
    lfoPan.frequency.value = 0.07;
    lfoPanGain.gain.value = clampFinite(this.params.modulation.stereoWidth, 0, 1, 0.6) * 0.7;

    // 8. Voice Bus -> SpatialInput (combWetGain feeds spatialInput, NOT voiceBus, preventing double-feedback blowup!)
    const voiceBus = ctx.createGain();
    voiceBus.gain.value = 0.85;
    const spatialInput = ctx.createGain();
    spatialInput.gain.value = 1.0;

    ringDryGain.connect(voiceBus);
    ringWetGain.connect(voiceBus);
    noiseGain.connect(voiceBus);
    formantGain.connect(voiceBus);

    // 8b. Annulus-Inspired Physical Modeling Modal Resonator (AudioWorklet + Biquad Fallback)
    const modalBus = ctx.createGain();
    modalBus.gain.value = this.params.modal.enabled
      ? clampFinite(this.params.modal.mix, 0, 1, 0.55)
      : 0.0001;
    let modalWorkletNode: AudioWorkletNode | null = null;
    const modalFallbackFilters: BiquadFilterNode[] = [];

    if (this.modalWorkletReady && typeof AudioWorkletNode !== 'undefined') {
      try {
        modalWorkletNode = new AudioWorkletNode(ctx, 'modal-resonator-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2]
        });
        modalWorkletNode.port.postMessage({
          type: 'ratios',
          ratios: MODAL_RATIOS[this.params.modal.material]
        });
        voiceBus.connect(modalWorkletNode);
        modalWorkletNode.connect(modalBus);
      } catch {
        modalWorkletNode = null;
      }
    }

    if (!modalWorkletNode) {
      // Fallback: 4 parallel resonant bandpass modes
      const ratios = MODAL_RATIOS[this.params.modal.material].slice(0, 4);
      ratios.forEach((ratio) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = clampFinite(this.params.synth.baseFreq * 2 * ratio, 40, 4800, 220);
        bp.Q.value = 18;
        voiceBus.connect(bp);
        bp.connect(modalBus);
        modalFallbackFilters.push(bp);
      });
    }

    // Feed dry voiceBus & grainBus into Comb Resonator, and sum post-comb & modal into spatialInput
    voiceBus.connect(combInput);
    grainBus.connect(combInput);
    voiceBus.connect(spatialInput);
    grainBus.connect(spatialInput);
    combWetGain.connect(spatialInput);
    modalBus.connect(spatialInput);

    // 3D PannerNode (HRTF on Studio HQ, equalpower on Mobile Eco)
    const panner3D = ctx.createPanner();
    panner3D.panningModel = this.qualityTier === 'mobile' ? 'equalpower' : 'HRTF';
    panner3D.distanceModel = 'inverse';
    panner3D.refDistance = 1.2;
    panner3D.maxDistance = 25;
    panner3D.rolloffFactor = 0.85;
    panner3D.coneInnerAngle = 360;

    // Set listener at origin facing -Z
    if (ctx.listener.positionX) {
      ctx.listener.positionX.value = 0;
      ctx.listener.positionY.value = 0;
      ctx.listener.positionZ.value = 0;
    } else {
      ctx.listener.setPosition(0, 0, 0);
    }

    // StereoPanner + Haas micro-delay widener after 3D panner
    const stereoPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if ('pan' in stereoPanner) {
      lfoPan.connect(lfoPanGain);
      lfoPanGain.connect(stereoPanner.pan);
    }

    // Haas Stereo Psychoacoustic Widener
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const haasDelayR = ctx.createDelay(0.05);
    haasDelayR.delayTime.value = clampFinite(this.params.spatial.haasWidth, 0, 0.035, 0.008);

    spatialInput.connect(panner3D);
    panner3D.connect(stereoPanner);
    stereoPanner.connect(splitter);
    splitter.connect(merger, 0, 0);
    splitter.connect(haasDelayR, 1);
    haasDelayR.connect(merger, 0, 1);

    // 9. Dark Filtered Ping-Pong / Feedback Delay
    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = this.params.fx.delayTime;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1500;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = this.params.fx.delayFeedback;
    const delayWet = ctx.createGain();
    delayWet.gain.value = this.params.fx.delayMix;

    merger.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(delayWet);

    // 10. Procedural Dark Cavern Convolver Reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = this._createDarkReverbIR(3.4, 2.7);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = this.params.fx.reverbMix;

    merger.connect(convolver);
    convolver.connect(reverbWet);

    // 11. Master Saturation, Safety Compressor, Stereo Analysers & Output
    const shaper = ctx.createWaveShaper();
    shaper.curve = this._makeSoftClipCurve(this.params.fx.drive);
    shaper.oversample = '2x';

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-9, now);
    compressor.knee.setValueAtTime(8, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.18, now);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    // Left / Right analysers for Lissajous X/Y Vectorscope
    const visSplitter = ctx.createChannelSplitter(2);
    const analyserL = ctx.createAnalyser();
    const analyserR = ctx.createAnalyser();
    analyserL.fftSize = 512;
    analyserR.fftSize = 512;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;

    merger.connect(shaper);
    delayWet.connect(shaper);
    reverbWet.connect(shaper);
    shaper.connect(compressor);
    compressor.connect(analyser);
    compressor.connect(visSplitter);
    visSplitter.connect(analyserL, 0);
    visSplitter.connect(analyserR, 1);
    analyser.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Start persistent generators
    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);
    fmOsc.start(now);
    ringOsc.start(now);
    wtOscA.start(now);
    wtOscB.start(now);
    wtSubOsc.start(now);
    noiseSource.start(now);
    lfoFilter.start(now);
    lfoPan.start(now);

    this.nodes = {
      osc1, osc2, subOsc, fmOsc, ringOsc,
      osc1Gain, osc2Gain, subGain, fmGain,
      wtOscA, wtOscB, wtSubOsc, wtGainA, wtGainB, wtSubGain, wtFoldShaper, wtBus,
      modalBus, modalWorkletNode, modalFallbackFilters,
      ringCarrierGain, ringDryGain, ringWetGain,
      mainFilter, noiseSource, noiseFilter, noiseGain,
      formantF1, formantF2, formantGain,
      combInput, combDelay, combDamp, combFeedbackGain, combWetGain,
      grainBus,
      lfoFilter, lfoFilterGain, lfoPan, lfoPanGain,
      voiceBus, spatialInput, panner3D, stereoPanner, haasDelayR, merger,
      delayNode, delayFilter, delayFeedback, delayWet,
      convolver, reverbWet,
      shaper, compressor, analyser, analyserL, analyserR, masterGain
    };

    this._applyParameters(0.05);
  }

  // Procedural multi-character buffers for the Granular Cloud Engine
  private _createGrainTextureBuffer(
    type: GrainTextureType,
    durationSeconds: number
  ): { forward: AudioBuffer; reverse: AudioBuffer } {
    const sampleRate = this.ctx!.sampleRate;
    const length = Math.floor(sampleRate * durationSeconds);
    const forward = this.ctx!.createBuffer(1, length, sampleRate);
    const reverse = this.ctx!.createBuffer(1, length, sampleRate);
    const fData = forward.getChannelData(0);
    const rData = reverse.getChannelData(0);

    // Use deterministic synthesis for rich harmonic/scary source material
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (type === 'metallic') {
        // Inharmonic bell/plate partials + FM scrape
        const mod = Math.sin(2 * Math.PI * 137.5 * t) * 4.2;
        sample =
          0.35 * Math.sin(2 * Math.PI * 220 * t + mod) +
          0.25 * Math.sin(2 * Math.PI * 311.1 * t - mod * 0.7) +
          0.2 * Math.sin(2 * Math.PI * 587.3 * t + Math.sin(2 * Math.PI * 43 * t) * 8) +
          0.2 * Math.sin(2 * Math.PI * 932.3 * t);
      } else if (type === 'choir') {
        // Ghostly formant-like choral cluster with slow vibrato
        const vib1 = Math.sin(2 * Math.PI * 5.2 * t) * 0.015;
        const vib2 = Math.sin(2 * Math.PI * 6.1 * t) * 0.018;
        const f0 = 110;
        for (let h = 1; h <= 12; h++) {
          const freq = f0 * h * (1 + (h % 2 === 0 ? vib1 : vib2));
          // Spectral peak around 500Hz and 1200Hz
          const weight = Math.exp(-Math.pow((freq - 520) / 280, 2)) + 0.6 * Math.exp(-Math.pow((freq - 1150) / 350, 2));
          sample += (weight * 0.45) * Math.sin(2 * Math.PI * freq * t + h * 1.1);
        }
      } else if (type === 'subterranean') {
        // Deep tectonic sub-rumble + resonant cave droplets
        const sub = Math.sin(2 * Math.PI * 48 * t + Math.sin(2 * Math.PI * 19 * t) * 2.5);
        const groan = Math.tanh(Math.sin(2 * Math.PI * 73.4 * t) * 3.0) * 0.4;
        const crackle = (Math.random() * 2 - 1) * Math.pow(Math.sin(2 * Math.PI * 3.7 * t) * 0.5 + 0.5, 6);
        sample = sub * 0.55 + groan + crackle * 0.35;
      } else if (type === 'tape') {
        // Hainbach-inspired vintage test gear, decaying magnetic tape loops, flutter & shortwave static
        const flutter = 1 + Math.sin(2 * Math.PI * 2.8 * t) * 0.018 + Math.sin(2 * Math.PI * 6.4 * t) * 0.008;
        const loopBeat = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 1.15 * t), 2.5);
        const testTone =
          0.34 * Math.sin(2 * Math.PI * 196 * flutter * t) +
          0.22 * Math.sin(2 * Math.PI * 293.66 * flutter * t + 0.6) +
          0.14 * Math.sin(2 * Math.PI * 440 * flutter * t * 0.995);
        const radioSweepFreq = 520 + Math.sin(2 * Math.PI * 0.43 * t) * 320;
        const radioWhistle = Math.sin(2 * Math.PI * radioSweepFreq * t) * 0.07 * Math.max(0, Math.sin(2 * Math.PI * 0.7 * t));
        const hiss = (Math.random() * 2 - 1) * 0.16;
        const dustPop = Math.random() < 0.0022 ? (Math.random() * 2 - 1) * 0.85 : 0;
        sample = Math.tanh((testTone * (0.35 + 0.65 * loopBeat) + hiss + radioWhistle) * 1.4) * 0.65 + dustPop * 0.45;
      } else if (type === 'hypnotic') {
        // Hypnus Slink-inspired deep Nordic dub-techno chord stabs & subterranean modular pulse
        const pulseRate = 2.0; // 120 BPM 8th-note groove inside buffer
        const phase = (t * pulseRate) % 1;
        const env = Math.exp(-phase * 5.2) * (1 - Math.exp(-phase * 90));
        // Minor 9th suspended dub chord (root, minor 3rd, 5th, minor 7th, 9th)
        const f0 = 110;
        const chord =
          0.35 * Math.sin(2 * Math.PI * f0 * t) +
          0.25 * Math.sin(2 * Math.PI * (f0 * 1.1892) * t) +
          0.22 * Math.sin(2 * Math.PI * (f0 * 1.4983) * t) +
          0.18 * Math.sin(2 * Math.PI * (f0 * 1.7818) * t) +
          0.16 * Math.sin(2 * Math.PI * (f0 * 2.2449) * t);
        const subPulse = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-phase * 7.5) * 0.45;
        sample = Math.tanh(chord * env * 2.2) * 0.65 + subPulse;
      } else if (type === 'liquid') {
        // G-Sonique Organic Liquid Alchemy: squelchy FM droplets, bubbling resonant chirps
        const dropRate = 5.5;
        const dropIdx = Math.floor(t * dropRate);
        const dropPhase = (t * dropRate) % 1;
        const dropEnv = Math.exp(-dropPhase * 9.5) * Math.sin(Math.min(1, dropPhase * 12) * Math.PI * 0.5);
        const startF = 160 + ((dropIdx * 137) % 420);
        const sweepF = startF * (1 + 2.4 * Math.exp(-dropPhase * 8));
        const fmMod = Math.sin(2 * Math.PI * (sweepF * 1.41) * t) * (3.5 * (1 - dropPhase));
        const bubble = Math.sin(2 * Math.PI * sweepF * t + fmMod) * dropEnv;
        const squelch = Math.tanh(Math.sin(2 * Math.PI * (95 + Math.sin(2 * Math.PI * 3.2 * t) * 45) * t) * 3.2) * 0.25;
        sample = bubble * 0.78 + squelch;
      } else if (type === 'modal') {
        // Annulus-inspired struck/bowed metallic & glass modal harmonics
        const strikeRate = 1.6;
        const sPhase = (t * strikeRate) % 1;
        const ratios = MODAL_RATIOS.glass;
        let mSum = 0;
        for (let m = 0; m < ratios.length; m++) {
          const decay = Math.exp(-sPhase * (2.5 + m * 1.4));
          mSum += (0.35 / (1 + m * 0.4)) * decay * Math.sin(2 * Math.PI * (146.8 * ratios[m]) * t);
        }
        sample = Math.tanh(mSum * 1.6) * 0.75;
      } else {
        // 'glitch': Fractal XOR-like stepped bit-crushed alien telemetry
        const stepRate = Math.floor(t * 24) % 7;
        const baseF = [146.8, 174.6, 207.6, 261.6, 311.1, 415.3, 554.3][stepRate];
        const raw = Math.sin(2 * Math.PI * baseF * t + Math.sin(2 * Math.PI * 320 * t) * 3.5);
        sample = Math.round(raw * 4) / 4 * 0.65;
      }

      fData[i] = Math.max(-0.98, Math.min(0.98, sample));
    }

    for (let i = 0; i < length; i++) {
      rData[i] = fData[length - 1 - i];
    }

    return { forward, reverse };
  }

  private _createBrownNoiseBuffer(durationSeconds: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * durationSeconds;
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = data[i];
      data[i] *= 3.2;
    }
    return buffer;
  }

  private _createDarkReverbIR(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx!.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        const white = (Math.random() * 2 - 1) * env;
        lp = lp * 0.88 + white * 0.12;
        channelData[i] = lp * 1.6;
      }
    }
    return impulse;
  }

  private _makeSoftClipCurve(driveNormalized: number): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const k = 1 + driveNormalized * 14;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  public async start(seed?: string): Promise<void> {
    if (seed) this.setSeed(seed);
    await this.init();
    if (this.ctx!.state === 'suspended') {
      await this.ctx!.resume();
    }
    this.isRunning = true;
    const now = this.ctx!.currentTime;
    this.nodes.masterGain.gain.setTargetAtTime(this.masterVolume, now, 0.2);
    this._startStochasticDrift();
    this._startSpatial3DLoop();
    this._startGranularScheduler();
  }

  public async stop(): Promise<void> {
    if (!this.ctx || !this.isRunning) return;
    this.isRunning = false;
    this._stopStochasticDrift();
    this._stopSpatial3DLoop();
    this._stopGranularScheduler();
    const now = this.ctx.currentTime;
    this.nodes.masterGain.gain.setTargetAtTime(0.0001, now, 0.12);
    setTimeout(() => {
      if (!this.isRunning && this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend();
      }
    }, 350);
  }

  public setSeed(seedStr: string): void {
    this.seed = String(seedStr).trim() || 'shadow-000';
    this.prng = this._createPRNG(this.seed);
  }

  public applySeedIdentity(seedStr?: string): void {
    if (seedStr) this.setSeed(seedStr);
    const r = this.prng;

    const roots = [34.65, 36.7, 41.2, 43.65, 46.25, 49.0, 51.9, 55.0, 61.7, 65.4, 73.4, 82.4];
    const baseFreq = roots[Math.floor(r() * roots.length)] * (0.97 + r() * 0.06);
    const waves: OscillatorWave[] = ['sawtooth', 'triangle', 'sine', 'square'];
    const textures: GrainTextureType[] = [
      'metallic',
      'choir',
      'subterranean',
      'glitch',
      'tape',
      'hypnotic',
      'liquid',
      'modal'
    ];
    const orbits: OrbitShapeType[] = ['circle', 'figure8', 'spiral', 'stalker', 'pendulum'];
    const modalMaterials: ModalMaterialType[] = ['plate', 'membrane', 'glass', 'spring'];
    const wtBanks: WavetableBankType[] = ['neuro_spline', 'spectral_formant', 'acid_fold', 'metallic_pwm'];

    this.params.synth.baseFreq = Number(baseFreq.toFixed(1));
    this.params.synth.osc1Type = waves[Math.floor(r() * 3)];
    this.params.synth.osc2Type = waves[Math.floor(r() * waves.length)];
    this.params.synth.detuneSpread = Number((6 + r() * 38).toFixed(1));
    this.params.synth.fmRatio = Number((0.45 + r() * 2.8).toFixed(2));
    this.params.synth.fmDepth = Math.round(8 + r() * 75);
    this.params.synth.noiseLevel = Number((0.12 + r() * 0.38).toFixed(2));
    this.params.synth.ringModFreq = Math.round(35 + r() * 280);
    this.params.synth.ringModMix = Number((r() * 0.45).toFixed(2));
    this.params.synth.pitchCreep = Number(((r() - 0.5) * 0.4).toFixed(2));

    this.params.filter.cutoff = Math.round(130 + r() * 750);
    this.params.filter.resonance = Number((2.0 + r() * 9.0).toFixed(1));
    this.params.filter.noiseCutoff = Math.round(280 + r() * 1700);
    this.params.filter.noiseQ = Number((3.0 + r() * 10.0).toFixed(1));
    this.params.filter.combFreq = Math.round(55 + r() * 240);
    this.params.filter.combFeedback = Number((0.32 + r() * 0.45).toFixed(2));
    this.params.filter.combMix = Number((0.1 + r() * 0.45).toFixed(2));
    this.params.filter.formantMorph = Number(r().toFixed(2));
    this.params.filter.formantMix = Number((0.15 + r() * 0.55).toFixed(2));

    this.params.granular.texture = textures[Math.floor(r() * textures.length)];
    this.params.granular.density = Number((5 + r() * 24).toFixed(1));
    this.params.granular.size = Number((0.04 + r() * 0.22).toFixed(2));
    this.params.granular.spray = Number((0.2 + r() * 0.7).toFixed(2));
    this.params.granular.pitch = Number((0.5 + r() * 1.5).toFixed(2));
    this.params.granular.pitchJitter = Number((0.08 + r() * 0.55).toFixed(2));
    this.params.granular.reverseProb = Number((0.15 + r() * 0.65).toFixed(2));
    this.params.granular.mix = Number((0.25 + r() * 0.45).toFixed(2));

    this.params.spatial.orbitShape = orbits[Math.floor(r() * orbits.length)];
    this.params.spatial.orbitSpeed = Number((0.08 + r() * 0.65).toFixed(2));
    this.params.spatial.orbitRadius = Number((1.4 + r() * 4.5).toFixed(1));
    this.params.spatial.binauralDetune = Number((1.5 + r() * 11).toFixed(1));

    this.params.modulation.lfoRate = Number((0.04 + r() * 0.5).toFixed(2));
    this.params.modulation.lfoDepth = Math.round(60 + r() * 340);
    this.params.fx.delayTime = Number((0.2 + r() * 0.55).toFixed(2));
    this.params.fx.delayFeedback = Number((0.35 + r() * 0.44).toFixed(2));

    this.params.modal = {
      enabled: this.params.granular.texture === 'modal' || r() < 0.22,
      material: modalMaterials[Math.floor(r() * modalMaterials.length)],
      inharmonicity: Number((0.1 + r() * 0.65).toFixed(2)),
      damping: Number((0.2 + r() * 0.6).toFixed(2)),
      bowPressure: Number((0.15 + r() * 0.55).toFixed(2)),
      mix: Number((0.4 + r() * 0.45).toFixed(2))
    };

    this.params.wavetable = {
      enabled: r() < 0.28,
      bank: wtBanks[Math.floor(r() * wtBanks.length)],
      position: Number(r().toFixed(2)),
      foldDrive: Number((0.2 + r() * 0.65).toFixed(2)),
      spectralTilt: Number(((r() - 0.5) * 1.2).toFixed(2)),
      mix: Number((0.45 + r() * 0.4).toFixed(2))
    };

    if (this.ctx && this.nodes.osc1) {
      this.nodes.osc1.type = this.params.synth.osc1Type;
      this.nodes.osc2.type = this.params.synth.osc2Type;
      this.wavetableFrames = createWavetableBank(
        this.ctx,
        this.params.wavetable.bank,
        this.params.wavetable.spectralTilt
      );
      if (this.nodes.wtFoldShaper) {
        this.nodes.wtFoldShaper.curve = createWavefolderCurve(this.params.wavetable.foldDrive);
      }
      if (this.nodes.modalWorkletNode) {
        this.nodes.modalWorkletNode.port.postMessage({
          type: 'ratios',
          ratios: MODAL_RATIOS[this.params.modal.material] || MODAL_RATIOS.plate
        });
      }
      this._applyParameters(0.45);
    }
  }

  // Real-time Granular Cloud Scheduler
  private _startGranularScheduler(): void {
    this._stopGranularScheduler();
    const tick = () => {
      if (!this.isRunning || !this.ctx) return;
      const g = this.params.granular;
      const { tension, instability } = this.state;

      if (g.enabled && g.mix > 0.01) {
        this._spawnGrain();
      }

      // Density increases dynamically with tension & instability (capped on mobile eco tier)
      const rawDensity = g.density * (1 + tension * 0.5 + instability * 0.4);
      const effectiveDensity = Math.max(1, this.qualityTier === 'mobile' ? Math.min(14, rawDensity) : rawDensity);
      const baseIntervalMs = 1000 / effectiveDensity;
      const jitterMs = (Math.random() * 2 - 1) * baseIntervalMs * g.spray * 0.65;
      const nextMs = Math.max(16, Math.min(1200, baseIntervalMs + jitterMs));

      this.grainTimer = setTimeout(tick, nextMs);
    };
    tick();
  }

  private _stopGranularScheduler(): void {
    if (this.grainTimer) {
      clearTimeout(this.grainTimer);
      this.grainTimer = null;
    }
  }

  private _spawnGrain(): void {
    if (!this.ctx || !this.grainBuffers || !this.nodes.grainBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const g = this.params.granular;
    const { tension, instability } = this.state;

    const texPair = this.grainBuffers[g.texture] || this.grainBuffers.metallic;
    const isReversed = Math.random() < g.reverseProb;
    const buffer = isReversed ? texPair.reverse : texPair.forward;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Calculate pitch with harmonic/microtonal jitter + drone tracking
    const droneRatio = (this.droneFreqOverride || this.params.synth.baseFreq) / 55.0;
    const jitterSemitones = (Math.random() * 2 - 1) * (g.pitchJitter + instability * 0.35) * 14;
    const rate = Math.max(
      0.15,
      Math.min(4.0, g.pitch * Math.pow(2, jitterSemitones / 12) * Math.sqrt(droneRatio) * this.spatialTelemetry.dopplerFactor)
    );
    source.playbackRate.value = rate;

    const duration = Math.max(0.015, Math.min(0.6, g.size * (0.8 + Math.random() * 0.4)));
    const maxOffset = Math.max(0.05, buffer.duration - duration * rate - 0.05);
    const startOffset = Math.random() * maxOffset * (0.25 + g.spray * 0.75);

    // Grain Window Envelope (smooth raised-cosine / Tukey style)
    const env = ctx.createGain();
    const peakGain = (0.28 + tension * 0.12) / Math.pow(Math.max(1, g.density / 8), 0.35);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peakGain, now + duration * 0.35);
    env.gain.linearRampToValueAtTime(peakGain * 0.85, now + duration * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Optional per-grain resonant filter for Liquid Alchemy & Tape warmth
    let outputNode: AudioNode = env;
    if (g.texture === 'liquid') {
      const liquidBp = ctx.createBiquadFilter();
      liquidBp.type = 'bandpass';
      const fStart = clampFinite(280 + Math.random() * 1400, 120, 4200, 700);
      const fEnd = clampFinite(fStart * (0.45 + Math.random() * 1.9), 140, 4800, 1100);
      liquidBp.frequency.setValueAtTime(fStart, now);
      liquidBp.frequency.exponentialRampToValueAtTime(fEnd, now + duration);
      liquidBp.Q.value = 5.5 + tension * 4.5;
      env.connect(liquidBp);
      outputNode = liquidBp;
    } else if (g.texture === 'tape') {
      const tapeLp = ctx.createBiquadFilter();
      tapeLp.type = 'lowpass';
      tapeLp.frequency.value = 2400 + Math.random() * 1200;
      tapeLp.Q.value = 1.2;
      env.connect(tapeLp);
      outputNode = tapeLp;
    }

    // Per-grain spatial scatter
    const panX = (Math.random() * 2 - 1) * g.spread;
    const panZ = (Math.random() * 2 - 1) * g.spread;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, panX));
      source.connect(env);
      outputNode.connect(panner);
      panner.connect(this.nodes.grainBus);
    } else {
      source.connect(env);
      outputNode.connect(this.nodes.grainBus);
    }

    source.start(now, startOffset, duration + 0.02);
    source.stop(now + duration + 0.03);

    // Record grain for HUD visualization
    this.recentGrains.push({
      id: ++this.grainIdCounter,
      x: panX,
      z: panZ,
      pitch: Math.min(1, Math.max(0, (rate - 0.25) / 2.5)),
      size: duration,
      reversed: isReversed,
      bornAt: performance.now()
    });
    if (this.recentGrains.length > 36) {
      this.recentGrains.shift();
    }
  }

  // 25Hz (HQ) or 15Hz (Mobile Eco) 3D Spatial Orbit & Relativistic Doppler Engine
  private _startSpatial3DLoop(): void {
    this._stopSpatial3DLoop();
    const intervalMs = this.qualityTier === 'mobile' ? 66 : 40;
    const dt = intervalMs / 1000;
    this.spatialTimer = setInterval(() => {
      if (!this.isRunning || !this.ctx || !this.nodes.panner3D) return;
      const sp = this.params.spatial;
      const { tension, instability, proximity } = this.state;

      // Speed increases with tension and proximity
      const speed = sp.orbitSpeed * (1 + tension * 0.8 + proximity * 1.4);
      this.orbitPhase += speed * dt * Math.PI * 2;

      // Radius contracts closer to listener's head as proximity increases!
      const effectiveRadius = Math.max(0.35, sp.orbitRadius * (1 - proximity * 0.65));

      let normX = 0;
      let normZ = -0.5;
      let normY = sp.elevation + Math.sin(this.orbitPhase * 0.6) * 0.25 * (1 + instability);

      if (sp.orbitShape === 'manual') {
        normX = sp.manualX;
        normZ = sp.manualZ;
      } else if (sp.orbitShape === 'circle') {
        normX = Math.sin(this.orbitPhase);
        normZ = -Math.cos(this.orbitPhase);
      } else if (sp.orbitShape === 'figure8') {
        normX = Math.sin(this.orbitPhase);
        normZ = Math.sin(this.orbitPhase * 2) * 0.85;
      } else if (sp.orbitShape === 'spiral') {
        const spiralMod = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.orbitPhase * 0.35));
        normX = Math.sin(this.orbitPhase) * spiralMod;
        normZ = -Math.cos(this.orbitPhase) * spiralMod;
      } else if (sp.orbitShape === 'pendulum') {
        normX = Math.sin(this.orbitPhase);
        normZ = -0.4 - Math.abs(Math.cos(this.orbitPhase)) * 0.5;
        normY = Math.cos(this.orbitPhase * 2) * 0.5;
      } else if (sp.orbitShape === 'stalker') {
        // Creepy erratic movement mostly behind the listener's head (+Z is behind in Web Audio!)
        this.driftOffsets.stalkerX += (Math.random() - 0.5) * 0.25 * (0.4 + instability);
        this.driftOffsets.stalkerZ += (Math.random() - 0.46) * 0.22 * (0.4 + instability);
        this.driftOffsets.stalkerX = Math.max(-1, Math.min(1, this.driftOffsets.stalkerX));
        this.driftOffsets.stalkerZ = Math.max(-0.9, Math.min(1, this.driftOffsets.stalkerZ));
        normX = this.driftOffsets.stalkerX;
        normZ = this.driftOffsets.stalkerZ;
      }

      const worldX = normX * effectiveRadius;
      const worldY = normY * effectiveRadius * 0.6;
      const worldZ = normZ * effectiveRadius;

      const now = this.ctx.currentTime;
      const p3d = this.nodes.panner3D;
      if (p3d.positionX) {
        p3d.positionX.setTargetAtTime(worldX, now, 0.045);
        p3d.positionY.setTargetAtTime(worldY, now, 0.045);
        p3d.positionZ.setTargetAtTime(worldZ, now, 0.045);
      } else {
        p3d.setPosition(worldX, worldY, worldZ);
      }

      // Calculate radial velocity for Doppler pitch shifting
      const dist = Math.sqrt(worldX * worldX + worldY * worldY + worldZ * worldZ);
      const radialVel = (this.prevListenerDist - dist) / dt; // positive when approaching
      this.prevListenerDist = dist;

      const doppler = 1.0 + Math.max(-0.22, Math.min(0.22, radialVel * 0.035 * sp.dopplerShift));
      this.spatialTelemetry = {
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY)),
        z: Math.max(-1, Math.min(1, normZ)),
        dopplerFactor: doppler,
        angle: Math.atan2(normX, -normZ),
        distance: dist
      };

      // Smooth bounded pitch creep (prevents runaway high pitch) + texture-aware motion
      const tex = this.params.granular.texture;
      if (Math.abs(this.params.synth.pitchCreep) > 0.01 || sp.dopplerShift > 0.02 || tex === 'tape') {
        this.driftOffsets.creepPhase = (this.driftOffsets.creepPhase + this.params.synth.pitchCreep * 0.006) % 1;
        this._applyPitchOnly(0.05);
      }
    }, intervalMs);
  }

  private _stopSpatial3DLoop(): void {
    if (this.spatialTimer) {
      clearInterval(this.spatialTimer);
      this.spatialTimer = null;
    }
  }

  public setManualSpatialPosition(normX: number, normZ: number): void {
    this.params.spatial.orbitShape = 'manual';
    this.params.spatial.manualX = Math.max(-1, Math.min(1, normX));
    this.params.spatial.manualZ = Math.max(-1, Math.min(1, normZ));
  }

  private _startStochasticDrift(): void {
    this._stopStochasticDrift();
    this.driftTimer = setInterval(() => {
      if (!this.isRunning || !this.ctx) return;
      const r = this.prng;
      const speed = clampFinite(this.params.modulation.driftSpeed, 0, 1, 0.35);
      const inst = clampFinite(this.state.instability, 0, 1, 0.25);
      const chaos = Math.min(1, speed * 0.6 + inst * 0.7);

      this.driftOffsets.detune = (r() * 2 - 1) * 32 * chaos;
      this.driftOffsets.cutoffFactor = 0.78 + r() * (0.45 + chaos * 0.55);
      this.driftOffsets.noiseFactor = 0.7 + r() * (0.6 + chaos * 0.8);
      this.driftOffsets.fmAdd = r() * 40 * chaos;

      const lfoJitter = clampFinite(this.params.modulation.lfoRate, 0.02, 12, 0.12) * (0.85 + r() * 0.3);
      this.nodes.lfoFilter.frequency.setTargetAtTime(Math.max(0.02, lfoJitter), this.ctx.currentTime, 0.8);
      this._applyParameters(0.42);
    }, 400);
  }

  private _stopStochasticDrift(): void {
    if (this.driftTimer) {
      clearInterval(this.driftTimer);
      this.driftTimer = null;
    }
  }

  private _applyPitchOnly(glideTime = 0.06): void {
    if (!this.ctx || !this.nodes.osc1) return;
    const now = this.ctx.currentTime;
    const { synth, spatial, granular } = this.params;
    const progression = clampFinite(this.state.progression, 0, 1, 0.1);

    const progPitchMultiplier = 1 + progression * 0.22;
    // Smooth cyclic Shepard-like creep bounded to [-0.35, +0.35] octaves (no abrupt jumps or runaway pitch!)
    const creepNorm = Math.sin(this.driftOffsets.creepPhase * Math.PI * 2) * (Math.abs(synth.pitchCreep) > 0.01 ? 0.28 : 0);
    const creepMultiplier = Math.pow(2, creepNorm);

    // Subtle analog tape wow/flutter when Tape Loop texture is active
    const tapeFlutter =
      granular.texture === 'tape'
        ? 1 + Math.sin(now * 3.1) * 0.008 + Math.sin(now * 7.7) * 0.004
        : 1;

    const activeRoot = clampFinite(this.droneFreqOverride ?? synth.baseFreq, 20, 880, 55);
    const doppler = clampFinite(this.spatialTelemetry.dopplerFactor, 0.75, 1.25, 1);
    const baseFreq = clampFinite(activeRoot * progPitchMultiplier * creepMultiplier * doppler * tapeFlutter, 18, 1600, 55);

    // Binaural frequency offset between Osc 1 and Osc 2
    const binOffset = clampFinite(spatial.binauralDetune, 0, 25, 3.5) * 0.5;
    const fmRatio = clampFinite(synth.fmRatio, 0.2, 6.0, 1.41);
    this.nodes.osc1.frequency.setTargetAtTime(Math.max(18, baseFreq - binOffset), now, glideTime);
    this.nodes.osc2.frequency.setTargetAtTime(Math.max(18, baseFreq + binOffset), now, glideTime);
    this.nodes.subOsc.frequency.setTargetAtTime(Math.max(14, baseFreq * 0.5), now, glideTime);
    this.nodes.fmOsc.frequency.setTargetAtTime(clampFinite(baseFreq * fmRatio, 10, 4800, 80), now, glideTime);

    // Wavetable & Modal pitch tracking
    if (this.nodes.wtOscA && this.nodes.wtOscB && this.nodes.wtSubOsc) {
      this.nodes.wtOscA.frequency.setTargetAtTime(Math.max(18, baseFreq), now, glideTime);
      this.nodes.wtOscB.frequency.setTargetAtTime(Math.max(18, baseFreq * 1.003), now, glideTime);
      this.nodes.wtSubOsc.frequency.setTargetAtTime(Math.max(14, baseFreq * 0.5), now, glideTime);
    }
    if (this.nodes.modalWorkletNode) {
      const freqParam = this.nodes.modalWorkletNode.parameters.get('baseFreq');
      if (freqParam) {
        freqParam.setTargetAtTime(clampFinite(baseFreq * 2, 25, 1200, 110), now, glideTime);
      }
    }
  }

  private _applyParameters(glideTime = 0.15): void {
    if (!this.ctx || !this.nodes.osc1) return;
    const now = this.ctx.currentTime;
    const { synth, filter, granular, spatial, modulation, fx } = this.params;
    const tension = clampFinite(this.state.tension, 0, 1, 0.2);
    const instability = clampFinite(this.state.instability, 0, 1, 0.25);
    const proximity = clampFinite(this.state.proximity, 0, 1, 0);

    // 1. Pitch & Detune
    this._applyPitchOnly(glideTime);

    const totalDetune = clampFinite(synth.detuneSpread, 0, 100, 14) + instability * 28 + this.driftOffsets.detune;
    this.nodes.osc1.detune.setTargetAtTime(clampFinite(-totalDetune * 0.5, -120, 120, -7), now, glideTime);
    this.nodes.osc2.detune.setTargetAtTime(clampFinite(totalDetune * 0.5, -120, 120, 7), now, glideTime);

    // 2. FM, Sub & Ring Modulator
    const effectiveFm = clampFinite(
      clampFinite(synth.fmDepth, 0, 200, 18) + tension * 55 + instability * 35 + this.driftOffsets.fmAdd,
      0,
      260,
      18
    );
    this.nodes.fmGain.gain.setTargetAtTime(effectiveFm, now, glideTime);
    const effectiveSub = clampFinite((clampFinite(synth.subLevel, 0, 1, 0.45) + proximity * 0.3) * 0.55, 0, 0.9, 0.25);
    this.nodes.subGain.gain.setTargetAtTime(effectiveSub, now, glideTime);

    const effectiveRingMix = clampFinite(clampFinite(synth.ringModMix, 0, 1, 0.15) + instability * 0.2, 0, 0.95, 0.15);
    this.nodes.ringOsc.frequency.setTargetAtTime(
      clampFinite(clampFinite(synth.ringModFreq, 10, 1200, 92) * (1 + tension * 0.4), 10, 1600, 92),
      now,
      glideTime
    );
    this.nodes.ringDryGain.gain.setTargetAtTime(1 - effectiveRingMix * 0.65, now, glideTime);
    this.nodes.ringWetGain.gain.setTargetAtTime(effectiveRingMix, now, glideTime);

    // 3. Main Filter Cutoff & Resonance (strictly bounded Q to prevent IIR blowup)
    const tensionCutoffBoost = 1 + tension * 2.0 + proximity * 0.7;
    const targetCutoff = clampFinite(
      clampFinite(filter.cutoff, 35, 5000, 320) * tensionCutoffBoost * this.driftOffsets.cutoffFactor,
      38,
      6800,
      320
    );
    const targetRes = clampFinite(clampFinite(filter.resonance, 0.5, 16, 4.2) + tension * 3.5, 0.5, 14.5, 4.2);
    this.nodes.mainFilter.frequency.setTargetAtTime(targetCutoff, now, glideTime);
    this.nodes.mainFilter.Q.setTargetAtTime(targetRes, now, glideTime);

    // 4. Noise & Vocal Formant Cavity Filter
    const targetNoiseFreq = clampFinite(
      clampFinite(filter.noiseCutoff, 80, 5000, 680) * (1 + tension * 0.85) * this.driftOffsets.noiseFactor,
      80,
      5800,
      680
    );
    this.nodes.noiseFilter.frequency.setTargetAtTime(targetNoiseFreq, now, glideTime);
    this.nodes.noiseFilter.Q.setTargetAtTime(clampFinite(filter.noiseQ + instability * 4, 0.5, 14.5, 6.5), now, glideTime);
    this.nodes.noiseGain.gain.setTargetAtTime(clampFinite((synth.noiseLevel + tension * 0.15) * 0.45, 0, 0.65, 0.12), now, glideTime);

    // Interpolate Dark Vowel Formants
    const morphIdx = clampFinite(filter.formantMorph, 0, 1, 0.3) * (DARK_FORMANTS.length - 1);
    const i0 = Math.min(DARK_FORMANTS.length - 2, Math.floor(morphIdx));
    const frac = Math.max(0, Math.min(1, morphIdx - i0));
    const f1 = DARK_FORMANTS[i0][0] * (1 - frac) + DARK_FORMANTS[i0 + 1][0] * frac;
    const f2 = DARK_FORMANTS[i0][1] * (1 - frac) + DARK_FORMANTS[i0 + 1][1] * frac;
    this.nodes.formantF1.frequency.setTargetAtTime(f1, now, glideTime);
    this.nodes.formantF2.frequency.setTargetAtTime(f2, now, glideTime);
    this.nodes.formantGain.gain.setTargetAtTime(clampFinite(filter.formantMix, 0, 1, 0.35) * 0.55, now, glideTime);

    // 5. Metallic Comb Resonator (safe delay & feedback <= 0.86)
    const doppler = clampFinite(this.spatialTelemetry.dopplerFactor, 0.75, 1.25, 1);
    const combHz = clampFinite(clampFinite(filter.combFreq, 30, 750, 110) * doppler, 30, 800, 110);
    this.nodes.combDelay.delayTime.setTargetAtTime(1 / combHz, now, glideTime);
    this.nodes.combFeedbackGain.gain.setTargetAtTime(
      clampFinite(filter.combFeedback + tension * 0.06, 0, 0.86, 0.55),
      now,
      glideTime
    );
    this.nodes.combWetGain.gain.setTargetAtTime(clampFinite(filter.combMix, 0, 1, 0.22) * 0.65, now, glideTime);

    // 6. Granular Mix & Haas Widener
    this.nodes.grainBus.gain.setTargetAtTime(
      granular.enabled ? clampFinite(granular.mix, 0, 1, 0.42) : 0.0001,
      now,
      glideTime
    );
    this.nodes.haasDelayR.delayTime.setTargetAtTime(clampFinite(spatial.haasWidth, 0, 0.035, 0.008), now, glideTime);

    // 7. Modulation & FX (clamp LFO depth <= 72% of targetCutoff so filter freq never hits 0/negative!)
    const rawLfoDepth = clampFinite(modulation.lfoDepth, 0, 900, 140) * (1 + tension * 0.6 + instability * 0.5);
    const safeLfoDepth = Math.min(rawLfoDepth, targetCutoff * 0.72);
    this.nodes.lfoFilter.frequency.setTargetAtTime(clampFinite(modulation.lfoRate, 0.02, 12, 0.12), now, glideTime);
    this.nodes.lfoFilterGain.gain.setTargetAtTime(safeLfoDepth, now, glideTime);
    this.nodes.lfoPanGain.gain.setTargetAtTime(clampFinite(modulation.stereoWidth, 0, 1, 0.6) * 0.75, now, glideTime);
    this.nodes.lfoPan.frequency.setTargetAtTime(0.06 + proximity * 1.4, now, glideTime);

    this.nodes.delayNode.delayTime.setTargetAtTime(clampFinite(fx.delayTime, 0.05, 1.5, 0.42), now, glideTime);
    this.nodes.delayFeedback.gain.setTargetAtTime(clampFinite(fx.delayFeedback + tension * 0.1, 0, 0.86, 0.48), now, glideTime);
    this.nodes.delayWet.gain.setTargetAtTime(clampFinite(fx.delayMix, 0, 0.9, 0.32), now, glideTime);
    this.nodes.reverbWet.gain.setTargetAtTime(clampFinite(fx.reverbMix, 0, 0.95, 0.45), now, glideTime);

    // 8. Zebralette Wavetable Morphing & Wavefolder
    const wt = this.params.wavetable;
    if (this.nodes.wtBus) {
      this.nodes.wtBus.gain.setTargetAtTime(
        wt.enabled ? clampFinite(wt.mix, 0, 1, 0.6) * 0.65 : 0.0001,
        now,
        glideTime
      );
      if (this.wavetableFrames.length > 1) {
        const scaledPos = clampFinite(wt.position + tension * 0.15, 0, 1, 0.35) * (this.wavetableFrames.length - 1);
        const f0 = Math.min(this.wavetableFrames.length - 2, Math.floor(scaledPos));
        const frac = Math.max(0, Math.min(1, scaledPos - f0));
        this.nodes.wtOscA.setPeriodicWave(this.wavetableFrames[f0]);
        this.nodes.wtOscB.setPeriodicWave(this.wavetableFrames[f0 + 1]);
        this.nodes.wtGainA.gain.setTargetAtTime(1 - frac, now, 0.04);
        this.nodes.wtGainB.gain.setTargetAtTime(frac, now, 0.04);
      }
    }

    // 9. Annulus Physical Modeling Modal Resonator
    const mod = this.params.modal;
    if (this.nodes.modalBus) {
      this.nodes.modalBus.gain.setTargetAtTime(
        mod.enabled ? clampFinite(mod.mix, 0, 1, 0.55) : 0.0001,
        now,
        glideTime
      );
      if (this.nodes.modalWorkletNode) {
        const p = this.nodes.modalWorkletNode.parameters;
        p.get('inharmonicity')?.setTargetAtTime(clampFinite(mod.inharmonicity + instability * 0.15, 0, 1, 0.35), now, glideTime);
        p.get('damping')?.setTargetAtTime(clampFinite(mod.damping, 0, 1, 0.45), now, glideTime);
        p.get('bowPressure')?.setTargetAtTime(clampFinite(mod.bowPressure + tension * 0.25, 0, 1, 0.32), now, glideTime);
      } else if (Array.isArray(this.nodes.modalFallbackFilters)) {
        const ratios = MODAL_RATIOS[mod.material] || MODAL_RATIOS.plate;
        this.nodes.modalFallbackFilters.forEach((bp: BiquadFilterNode, idx: number) => {
          const r = ratios[idx] || (idx + 1);
          const f = clampFinite(synth.baseFreq * 2 * r * (1 + mod.inharmonicity * 0.25 * idx), 40, 5200, 220);
          bp.frequency.setTargetAtTime(f, now, glideTime);
        });
      }
    }
  }

  public setState(partialState: Partial<GameplayStateVector>): void {
    Object.assign(this.state, partialState);
    this._applyParameters(0.16);
  }

  public setQualityTier(tier: QualityTier): void {
    this.qualityTier = tier;
    if (this.nodes.panner3D) {
      this.nodes.panner3D.panningModel = tier === 'mobile' ? 'equalpower' : 'HRTF';
    }
    if (this.isRunning) {
      this._startSpatial3DLoop();
    }
  }

  public triggerModalStrike(freq?: number, velocity = 0.85): void {
    if (!this.ctx || !this.isRunning) return;
    if (this.nodes.modalWorkletNode) {
      if (freq && Number.isFinite(freq)) {
        this.nodes.modalWorkletNode.parameters
          .get('baseFreq')
          ?.setTargetAtTime(clampFinite(freq, 25, 1200, 110), this.ctx.currentTime, 0.01);
      }
      this.nodes.modalWorkletNode.port.postMessage({ type: 'strike', velocity });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setParam(category: keyof EchoEngine['params'], key: string, value: any): void {
    if (!this.params[category]) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.params[category] as any)[key] = value;
    if (!this.ctx || !this.nodes.osc1) return;

    if (category === 'synth' && (key === 'osc1Type' || key === 'osc2Type')) {
      this.nodes[key === 'osc1Type' ? 'osc1' : 'osc2'].type = value;
      return;
    }
    if (category === 'fx' && key === 'drive') {
      this.nodes.shaper.curve = this._makeSoftClipCurve(Number(value));
      return;
    }
    if (category === 'wavetable') {
      if (key === 'bank' || key === 'spectralTilt') {
        this.wavetableFrames = createWavetableBank(
          this.ctx,
          this.params.wavetable.bank,
          this.params.wavetable.spectralTilt
        );
      }
      if (key === 'foldDrive' && this.nodes.wtFoldShaper) {
        this.nodes.wtFoldShaper.curve = createWavefolderCurve(Number(value));
      }
    }
    if (category === 'modal' && key === 'material' && this.nodes.modalWorkletNode) {
      this.nodes.modalWorkletNode.port.postMessage({
        type: 'ratios',
        ratios: MODAL_RATIOS[value as ModalMaterialType] || MODAL_RATIOS.plate
      });
    }
    this._applyParameters(0.08);
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, Number(val)));
    if (this.ctx && this.isRunning) {
      this.nodes.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  // Set or release temporary drone root pitch from the Keyboard / Piano Roll
  public setDroneNote(freq: number | null, glideTime = 0.08): void {
    this.droneFreqOverride = freq;
    this._applyPitchOnly(glideTime);
  }

  // Trigger a playable polyphonic dark FM / Comb / Formant synth note (for Keyboard & Sequencer)
  public triggerNote(
    freq: number,
    duration = 0.35,
    velocity = 0.8,
    options: { modY?: number; routeToDrone?: boolean; glide?: number } = {}
  ): void {
    if (!this.ctx || !this.isRunning) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const modY = options.modY ?? 0.5;

    if (options.routeToDrone) {
      this.setDroneNote(freq, options.glide ?? 0.06);
    }

    if (this.params.modal.enabled) {
      this.triggerModalStrike(freq, velocity * 0.85);
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const fmOsc = ctx.createOscillator();
    const fmGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc1.type = this.params.synth.osc1Type;
    osc2.type = this.params.synth.osc2Type;
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc1.detune.value = -this.params.synth.detuneSpread * 0.6;
    osc2.detune.value = this.params.synth.detuneSpread * 0.6;

    fmOsc.type = 'sine';
    fmOsc.frequency.setValueAtTime(freq * this.params.synth.fmRatio, now);
    const fmIndex = (this.params.synth.fmDepth + modY * 140) * velocity;
    fmGain.gain.setValueAtTime(fmIndex, now);
    fmGain.gain.exponentialRampToValueAtTime(Math.max(1, fmIndex * 0.15), now + duration);

    filter.type = 'lowpass';
    const peakCutoff = Math.min(7500, Math.max(180, this.params.filter.cutoff * (1.5 + modY * 3.5)));
    filter.frequency.setValueAtTime(peakCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(90, this.params.filter.cutoff * 0.8), now + duration);
    filter.Q.value = Math.min(18, this.params.filter.resonance * 0.85);

    const peakLevel = 0.26 * velocity;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peakLevel, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    fmOsc.connect(fmGain);
    fmGain.connect(osc1.frequency);
    fmGain.connect(osc2.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);

    // Connect into both Comb Resonator and main VoiceBus for full 3D & Cavern FX
    env.connect(this.nodes.combInput);
    env.connect(this.nodes.voiceBus);

    osc1.start(now);
    osc2.start(now);
    fmOsc.start(now);
    osc1.stop(now + duration + 0.04);
    osc2.stop(now + duration + 0.04);
    fmOsc.stop(now + duration + 0.04);
  }

  public triggerEvent(type: string, options: { intensity?: number; seed?: string } = {}): void {
    if (!this.ctx || !this.isRunning) return;
    const now = this.ctx.currentTime;
    const intensity = options.intensity ?? 0.85;
    const r = this.prng;

    switch (type) {
      case 'newGame': {
        const newSeed = options.seed || 'sf-' + Math.floor(100 + Math.random() * 899);
        this.applySeedIdentity(newSeed);
        this._spawnTransient({
          freqStart: this.params.synth.baseFreq * 2,
          freqEnd: this.params.synth.baseFreq,
          duration: 1.4,
          type: 'sine',
          fmFreq: this.params.synth.baseFreq * 1.5,
          fmIndex: 45,
          gain: 0.35
        });
        break;
      }
      case 'portal': {
        this.nodes.mainFilter.frequency.setTargetAtTime(2600, now, 0.12);
        this.nodes.mainFilter.frequency.setTargetAtTime(this.params.filter.cutoff, now + 0.45, 0.45);
        this._spawnTransient({
          freqStart: 180 + r() * 90,
          freqEnd: 780 + r() * 220,
          duration: 1.15,
          type: 'triangle',
          fmFreq: 110,
          fmIndex: 150 * intensity,
          gain: 0.3
        });
        break;
      }
      case 'approachingObstacle': {
        this.nodes.noiseFilter.frequency.setTargetAtTime(1750, now, 0.08);
        this.nodes.noiseFilter.frequency.setTargetAtTime(this.params.filter.noiseCutoff, now + 0.3, 0.25);
        this._spawnTransient({
          freqStart: this.params.synth.baseFreq * 2.5,
          freqEnd: this.params.synth.baseFreq * 3.2,
          duration: 0.45,
          type: 'sawtooth',
          fmFreq: 68,
          fmIndex: 65,
          gain: 0.2
        });
        break;
      }
      case 'obstaclePassed': {
        if (this.params.modal.enabled) {
          this.triggerModalStrike(this.params.synth.baseFreq * 3, 0.75);
        }
        this._spawnTransient({
          freqStart: this.params.synth.baseFreq * 3,
          freqEnd: this.params.synth.baseFreq * 1.5,
          duration: 0.65,
          type: 'sine',
          fmFreq: this.params.synth.baseFreq,
          fmIndex: 15,
          gain: 0.24
        });
        break;
      }
      case 'nearMiss': {
        if (this.params.modal.enabled) {
          this.triggerModalStrike(this.params.synth.baseFreq * 4, 0.95 * intensity);
        }
        this._spawnTransient({
          freqStart: 660 + r() * 180,
          freqEnd: 130,
          duration: 0.55,
          type: 'sawtooth',
          fmFreq: 233,
          fmIndex: 240 * intensity,
          gain: 0.32
        });
        break;
      }
      case 'collision': {
        if (this.params.modal.enabled) {
          this.triggerModalStrike(this.params.synth.baseFreq * 1.5, 1.3 * intensity);
        }
        this._spawnTransient({
          freqStart: 140,
          freqEnd: 26,
          duration: 0.7,
          type: 'triangle',
          fmFreq: 53,
          fmIndex: 360 * intensity,
          gain: 0.52
        });
        this._spawnTransient({
          freqStart: 410,
          freqEnd: 185,
          duration: 0.48,
          type: 'square',
          fmFreq: 147,
          fmIndex: 310,
          gain: 0.26
        });
        break;
      }
      case 'sanityDrop': {
        // Psychedelic horror warp: extreme ring mod + reverse grain burst + pitch bend
        this.nodes.ringWetGain.gain.cancelScheduledValues(now);
        this.nodes.ringOsc.frequency.cancelScheduledValues(now);
        this.nodes.ringWetGain.gain.setTargetAtTime(0.9, now, 0.05);
        this.nodes.ringOsc.frequency.setValueAtTime(48, now);
        this.nodes.ringOsc.frequency.exponentialRampToValueAtTime(620, now + 1.1);
        for (let i = 0; i < 6; i++) {
          setTimeout(() => this._spawnGrain(), i * 55);
        }
        this._spawnTransient({
          freqStart: 520,
          freqEnd: 62,
          duration: 1.3,
          type: 'sawtooth',
          fmFreq: 93,
          fmIndex: 280,
          gain: 0.32
        });
        setTimeout(() => {
          if (this.isRunning) this._applyParameters(0.6);
        }, 1150);
        break;
      }
      case 'stalkerSpawn': {
        // Creepy metallic comb screech + sub-heartbeat thud behind listener
        this.nodes.combFeedbackGain.gain.cancelScheduledValues(now);
        this.nodes.combFeedbackGain.gain.setTargetAtTime(0.84, now, 0.04);
        this._spawnTransient({
          freqStart: 88,
          freqEnd: 34,
          duration: 0.4,
          type: 'sine',
          fmFreq: 44,
          fmIndex: 90,
          gain: 0.48
        });
        setTimeout(() => {
          if (!this.isRunning) return;
          this._spawnTransient({
            freqStart: 82,
            freqEnd: 31,
            duration: 0.55,
            type: 'sine',
            fmFreq: 41,
            fmIndex: 110,
            gain: 0.42
          });
          this._applyParameters(0.5);
        }, 280);
        break;
      }
      case 'gameOver': {
        const base = this.params.synth.baseFreq;
        this.nodes.osc1.frequency.setTargetAtTime(base * 0.5, now, 0.7);
        this.nodes.osc2.frequency.setTargetAtTime(base * 0.49, now, 0.7);
        this.nodes.mainFilter.frequency.setTargetAtTime(90, now, 0.6);
        this._spawnTransient({
          freqStart: base * 2,
          freqEnd: base * 0.5,
          duration: 2.2,
          type: 'sine',
          fmFreq: base * 0.75,
          fmIndex: 85,
          gain: 0.36
        });
        setTimeout(() => {
          if (this.isRunning) this._applyParameters(1.2);
        }, 2300);
        break;
      }
    }
  }

  private _spawnTransient({
    freqStart,
    freqEnd,
    duration,
    type = 'sine',
    fmFreq = 80,
    fmIndex = 50,
    gain = 0.25
  }: {
    freqStart: number;
    freqEnd: number;
    duration: number;
    type?: OscillatorWave;
    fmFreq?: number;
    fmIndex?: number;
    gain?: number;
  }): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    carrier.type = type;
    carrier.frequency.setValueAtTime(freqStart, now);
    carrier.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(fmFreq, now);
    modGain.gain.setValueAtTime(fmIndex, now);
    modGain.gain.exponentialRampToValueAtTime(0.1, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(env);
    env.connect(this.nodes.combInput);
    env.connect(this.nodes.voiceBus);

    carrier.start(now);
    mod.start(now);
    carrier.stop(now + duration + 0.05);
    mod.stop(now + duration + 0.05);
  }

  public loadPreset(preset: Partial<EchoPreset>, preserveSeed = false): void {
    if (!preserveSeed && preset.seed) {
      this.setSeed(preset.seed);
    }
    if (preset.synth) Object.assign(this.params.synth, preset.synth);
    if (preset.filter) Object.assign(this.params.filter, preset.filter);
    if (preset.granular) Object.assign(this.params.granular, preset.granular);
    if (preset.spatial) Object.assign(this.params.spatial, preset.spatial);
    if (preset.modulation) Object.assign(this.params.modulation, preset.modulation);
    if (preset.fx) Object.assign(this.params.fx, preset.fx);

    // Reset modal & wavetable unless explicitly enabled by the loaded preset
    this.params.modal = {
      enabled: false,
      material: 'plate',
      inharmonicity: 0.35,
      damping: 0.45,
      bowPressure: 0.32,
      mix: 0.55,
      ...(preset.modal || {})
    };
    this.params.wavetable = {
      enabled: false,
      bank: 'neuro_spline',
      position: 0.35,
      foldDrive: 0.42,
      spectralTilt: 0.0,
      mix: 0.6,
      ...(preset.wavetable || {})
    };

    // Reset transient pitch/drift state so switching presets never inherits runaway offsets
    this.droneFreqOverride = null;
    this.driftOffsets = {
      detune: 0,
      cutoffFactor: 1,
      noiseFactor: 1,
      fmAdd: 0,
      creepPhase: 0,
      stalkerX: 0,
      stalkerZ: -1
    };

    if (this.ctx && this.nodes.osc1) {
      const now = this.ctx.currentTime;
      // Cancel any in-flight scheduled ramps from events or previous presets
      [
        this.nodes.osc1.frequency,
        this.nodes.osc2.frequency,
        this.nodes.subOsc.frequency,
        this.nodes.fmOsc.frequency,
        this.nodes.ringOsc.frequency,
        this.nodes.mainFilter.frequency,
        this.nodes.combDelay.delayTime,
        this.nodes.combFeedbackGain.gain
      ].forEach((param) => {
        try {
          param.cancelScheduledValues(now);
        } catch {
          // ignore
        }
      });

      this.nodes.osc1.type = this.params.synth.osc1Type;
      this.nodes.osc2.type = this.params.synth.osc2Type;
      this.nodes.shaper.curve = this._makeSoftClipCurve(clampFinite(this.params.fx.drive, 0, 1, 0.2));
      this.wavetableFrames = createWavetableBank(
        this.ctx,
        this.params.wavetable.bank,
        this.params.wavetable.spectralTilt
      );
      if (this.nodes.wtFoldShaper) {
        this.nodes.wtFoldShaper.curve = createWavefolderCurve(this.params.wavetable.foldDrive);
      }
      if (this.nodes.modalWorkletNode) {
        this.nodes.modalWorkletNode.port.postMessage({
          type: 'ratios',
          ratios: MODAL_RATIOS[this.params.modal.material] || MODAL_RATIOS.plate
        });
        this.nodes.modalWorkletNode.port.postMessage({ type: 'reset' });
      }
      this._applyParameters(0.18);
    }
  }

  public async panicReset(): Promise<void> {
    const wasRunning = this.isRunning;
    this.isRunning = false;
    this._stopStochasticDrift();
    this._stopSpatial3DLoop();
    this._stopGranularScheduler();
    this.droneFreqOverride = null;
    this.driftOffsets = {
      detune: 0,
      cutoffFactor: 1,
      noiseFactor: 1,
      fmAdd: 0,
      creepPhase: 0,
      stalkerX: 0,
      stalkerZ: -1
    };
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
    this.nodes = {};
    this.grainBuffers = null;
    this.modalWorkletReady = false;
    if (wasRunning) {
      await this.start(this.seed);
    }
  }

  public exportPreset(name = 'Custom Soundscape', category: PresetCategory = 'custom'): EchoPreset {
    return {
      name,
      category,
      version: '2.0',
      seed: this.seed,
      synth: { ...this.params.synth },
      filter: { ...this.params.filter },
      granular: { ...this.params.granular },
      spatial: { ...this.params.spatial },
      modulation: { ...this.params.modulation },
      fx: { ...this.params.fx },
      modal: { ...this.params.modal },
      wavetable: { ...this.params.wavetable }
    };
  }

  public getAnalyser(): AnalyserNode | null {
    return this.nodes.analyser || null;
  }

  public getStereoAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
    return {
      left: this.nodes.analyserL || null,
      right: this.nodes.analyserR || null
    };
  }

  private _bindLifecycle(): void {
    const suspendAudio = () => {
      if (!this.ctx || !this.isRunning) return;
      this.nodes.masterGain?.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      setTimeout(() => {
        if ((document.hidden || !document.hasFocus()) && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend();
        }
      }, 160);
    };

    const resumeAudio = () => {
      if (!this.ctx || !this.isRunning) return;
      this.ctx.resume().then(() => {
        if (this.ctx && this.nodes.masterGain) {
          this.nodes.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.15);
        }
      });
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) suspendAudio();
      else resumeAudio();
    });

    // Mobile Safari / iOS backgrounding support
    window.addEventListener('pagehide', suspendAudio);
    window.addEventListener('pageshow', resumeAudio);
  }
}
