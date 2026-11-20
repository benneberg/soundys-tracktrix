import { EchoPreset } from './EchoEngine';

export const FACTORY_PRESETS: EchoPreset[] = [
  // ==========================================================================
  // CATEGORY 1: INDUSTRIAL
  // ==========================================================================
  {
    name: 'Subterranean Reactor',
    category: 'industrial',
    description: 'Deep pulsing sub-reactor hum with metallic grain scatter & resonant lowpass.',
    version: '2.0',
    seed: 'shadow-409',
    synth: {
      baseFreq: 55.0,
      osc1Type: 'sawtooth',
      osc2Type: 'triangle',
      detuneSpread: 14.0,
      subLevel: 0.55,
      fmRatio: 1.41,
      fmDepth: 18.0,
      noiseLevel: 0.25,
      ringModFreq: 82.0,
      ringModMix: 0.12,
      pitchCreep: 0.0
    },
    filter: {
      cutoff: 320.0,
      resonance: 4.2,
      noiseCutoff: 680.0,
      noiseQ: 6.5,
      combFreq: 110.0,
      combFeedback: 0.52,
      combMix: 0.22,
      formantMorph: 0.25,
      formantMix: 0.3
    },
    granular: {
      enabled: true,
      texture: 'metallic',
      density: 10.0,
      size: 0.12,
      spray: 0.4,
      pitch: 1.0,
      pitchJitter: 0.18,
      spread: 0.65,
      reverseProb: 0.25,
      mix: 0.35
    },
    spatial: {
      orbitShape: 'circle',
      orbitSpeed: 0.18,
      orbitRadius: 3.5,
      elevation: 0.1,
      dopplerShift: 0.25,
      binauralDetune: 3.0,
      haasWidth: 0.007,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.12, lfoDepth: 140, driftSpeed: 0.35, stereoWidth: 0.6 },
    fx: { delayTime: 0.42, delayFeedback: 0.48, delayMix: 0.32, reverbMix: 0.45, drive: 0.22 }
  },
  {
    name: 'Rusted Monolith',
    category: 'industrial',
    description: 'Scraping industrial decay, square/saw cross-FM, high-feedback comb pipes.',
    version: '2.0',
    seed: 'monolith-88',
    synth: {
      baseFreq: 41.2,
      osc1Type: 'sawtooth',
      osc2Type: 'square',
      detuneSpread: 26.0,
      subLevel: 0.62,
      fmRatio: 2.13,
      fmDepth: 48.0,
      noiseLevel: 0.35,
      ringModFreq: 123.6,
      ringModMix: 0.28,
      pitchCreep: -0.08
    },
    filter: {
      cutoff: 210.0,
      resonance: 7.5,
      noiseCutoff: 1120.0,
      noiseQ: 9.2,
      combFreq: 82.4,
      combFeedback: 0.78,
      combMix: 0.48,
      formantMorph: 0.45,
      formantMix: 0.35
    },
    granular: {
      enabled: true,
      texture: 'metallic',
      density: 16.0,
      size: 0.08,
      spray: 0.65,
      pitch: 0.75,
      pitchJitter: 0.35,
      spread: 0.85,
      reverseProb: 0.45,
      mix: 0.48
    },
    spatial: {
      orbitShape: 'pendulum',
      orbitSpeed: 0.25,
      orbitRadius: 2.8,
      elevation: -0.2,
      dopplerShift: 0.4,
      binauralDetune: 4.5,
      haasWidth: 0.011,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.07, lfoDepth: 220, driftSpeed: 0.55, stereoWidth: 0.75 },
    fx: { delayTime: 0.58, delayFeedback: 0.62, delayMix: 0.4, reverbMix: 0.6, drive: 0.45 }
  },
  {
    name: 'Corroded Turbine',
    category: 'industrial',
    description: 'Grinding mechanical rotation, heavy Doppler shift & rhythmic subterranean grains.',
    version: '2.0',
    seed: 'turbine-501',
    synth: {
      baseFreq: 46.25,
      osc1Type: 'square',
      osc2Type: 'sawtooth',
      detuneSpread: 32.0,
      subLevel: 0.7,
      fmRatio: 0.75,
      fmDepth: 62.0,
      noiseLevel: 0.42,
      ringModFreq: 69.3,
      ringModMix: 0.35,
      pitchCreep: 0.0
    },
    filter: {
      cutoff: 280.0,
      resonance: 8.8,
      noiseCutoff: 840.0,
      noiseQ: 11.0,
      combFreq: 138.5,
      combFeedback: 0.84,
      combMix: 0.55,
      formantMorph: 0.15,
      formantMix: 0.25
    },
    granular: {
      enabled: true,
      texture: 'subterranean',
      density: 22.0,
      size: 0.05,
      spray: 0.2,
      pitch: 1.2,
      pitchJitter: 0.12,
      spread: 0.7,
      reverseProb: 0.15,
      mix: 0.52
    },
    spatial: {
      orbitShape: 'circle',
      orbitSpeed: 0.85,
      orbitRadius: 2.0,
      elevation: 0.0,
      dopplerShift: 0.75,
      binauralDetune: 6.0,
      haasWidth: 0.009,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.65, lfoDepth: 290, driftSpeed: 0.45, stereoWidth: 0.8 },
    fx: { delayTime: 0.24, delayFeedback: 0.58, delayMix: 0.36, reverbMix: 0.5, drive: 0.55 }
  },
  {
    name: 'Cryo-Chamber Leak',
    category: 'industrial',
    description: 'Hissing pressurized formant steam and crystalline frozen comb resonances.',
    version: '2.0',
    seed: 'cryo-904',
    synth: {
      baseFreq: 61.7,
      osc1Type: 'triangle',
      osc2Type: 'sine',
      detuneSpread: 11.0,
      subLevel: 0.4,
      fmRatio: 3.14,
      fmDepth: 34.0,
      noiseLevel: 0.58,
      ringModFreq: 246.8,
      ringModMix: 0.22,
      pitchCreep: 0.05
    },
    filter: {
      cutoff: 460.0,
      resonance: 6.4,
      noiseCutoff: 2450.0,
      noiseQ: 14.5,
      combFreq: 370.0,
      combFeedback: 0.86,
      combMix: 0.52,
      formantMorph: 0.85,
      formantMix: 0.5
    },
    granular: {
      enabled: true,
      texture: 'metallic',
      density: 28.0,
      size: 0.035,
      spray: 0.85,
      pitch: 2.1,
      pitchJitter: 0.45,
      spread: 0.95,
      reverseProb: 0.5,
      mix: 0.45
    },
    spatial: {
      orbitShape: 'figure8',
      orbitSpeed: 0.32,
      orbitRadius: 3.8,
      elevation: 0.45,
      dopplerShift: 0.3,
      binauralDetune: 2.5,
      haasWidth: 0.014,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.19, lfoDepth: 210, driftSpeed: 0.5, stereoWidth: 0.9 },
    fx: { delayTime: 0.37, delayFeedback: 0.68, delayMix: 0.45, reverbMix: 0.68, drive: 0.15 }
  },

  // ==========================================================================
  // CATEGORY 2: VOID
  // ==========================================================================
  {
    name: 'Void Transmission',
    category: 'void',
    description: 'Eerie shortwave ghost frequencies, alien telemetry grains & high-Q bandpass.',
    version: '2.0',
    seed: 'void-773',
    synth: {
      baseFreq: 65.4,
      osc1Type: 'sine',
      osc2Type: 'triangle',
      detuneSpread: 9.5,
      subLevel: 0.35,
      fmRatio: 2.82,
      fmDepth: 64.0,
      noiseLevel: 0.42,
      ringModFreq: 196.0,
      ringModMix: 0.38,
      pitchCreep: 0.0
    },
    filter: {
      cutoff: 540.0,
      resonance: 9.8,
      noiseCutoff: 1850.0,
      noiseQ: 14.0,
      combFreq: 196.0,
      combFeedback: 0.65,
      combMix: 0.32,
      formantMorph: 0.65,
      formantMix: 0.42
    },
    granular: {
      enabled: true,
      texture: 'glitch',
      density: 14.0,
      size: 0.09,
      spray: 0.75,
      pitch: 1.45,
      pitchJitter: 0.6,
      spread: 0.9,
      reverseProb: 0.4,
      mix: 0.5
    },
    spatial: {
      orbitShape: 'spiral',
      orbitSpeed: 0.28,
      orbitRadius: 4.5,
      elevation: 0.3,
      dopplerShift: 0.5,
      binauralDetune: 5.2,
      haasWidth: 0.012,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.28, lfoDepth: 340, driftSpeed: 0.72, stereoWidth: 0.85 },
    fx: { delayTime: 0.33, delayFeedback: 0.66, delayMix: 0.48, reverbMix: 0.58, drive: 0.18 }
  },
  {
    name: 'Abyssal Pressure',
    category: 'void',
    description: 'Crushing 34Hz sub-bass, groaning hull resonance, cavernous dark reverb.',
    version: '2.0',
    seed: 'abyss-12',
    synth: {
      baseFreq: 34.65,
      osc1Type: 'triangle',
      osc2Type: 'sawtooth',
      detuneSpread: 19.0,
      subLevel: 0.88,
      fmRatio: 0.5,
      fmDepth: 14.0,
      noiseLevel: 0.2,
      ringModFreq: 34.65,
      ringModMix: 0.1,
      pitchCreep: -0.12
    },
    filter: {
      cutoff: 135.0,
      resonance: 3.8,
      noiseCutoff: 320.0,
      noiseQ: 5.0,
      combFreq: 52.0,
      combFeedback: 0.72,
      combMix: 0.35,
      formantMorph: 0.5,
      formantMix: 0.4
    },
    granular: {
      enabled: true,
      texture: 'subterranean',
      density: 7.0,
      size: 0.28,
      spray: 0.5,
      pitch: 0.5,
      pitchJitter: 0.15,
      spread: 0.6,
      reverseProb: 0.6,
      mix: 0.45
    },
    spatial: {
      orbitShape: 'circle',
      orbitSpeed: 0.08,
      orbitRadius: 5.5,
      elevation: -0.6,
      dopplerShift: 0.2,
      binauralDetune: 1.8,
      haasWidth: 0.016,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.05, lfoDepth: 95, driftSpeed: 0.25, stereoWidth: 0.55 },
    fx: { delayTime: 0.72, delayFeedback: 0.56, delayMix: 0.38, reverbMix: 0.75, drive: 0.32 }
  },
  {
    name: 'Event Horizon',
    category: 'void',
    description: 'Relativistic gravitational pitch descent with extreme 3D orbital Doppler warp.',
    version: '2.0',
    seed: 'horizon-00',
    synth: {
      baseFreq: 49.0,
      osc1Type: 'sawtooth',
      osc2Type: 'sine',
      detuneSpread: 42.0,
      subLevel: 0.75,
      fmRatio: 1.618,
      fmDepth: 52.0,
      noiseLevel: 0.3,
      ringModFreq: 79.3,
      ringModMix: 0.42,
      pitchCreep: -0.45
    },
    filter: {
      cutoff: 290.0,
      resonance: 10.5,
      noiseCutoff: 920.0,
      noiseQ: 12.0,
      combFreq: 98.0,
      combFeedback: 0.82,
      combMix: 0.4,
      formantMorph: 0.35,
      formantMix: 0.45
    },
    granular: {
      enabled: true,
      texture: 'choir',
      density: 18.0,
      size: 0.18,
      spray: 0.6,
      pitch: 0.85,
      pitchJitter: 0.4,
      spread: 0.95,
      reverseProb: 0.75,
      mix: 0.55
    },
    spatial: {
      orbitShape: 'spiral',
      orbitSpeed: 0.55,
      orbitRadius: 2.4,
      elevation: 0.2,
      dopplerShift: 0.9,
      binauralDetune: 7.8,
      haasWidth: 0.018,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.14, lfoDepth: 380, driftSpeed: 0.65, stereoWidth: 0.95 },
    fx: { delayTime: 0.64, delayFeedback: 0.74, delayMix: 0.5, reverbMix: 0.78, drive: 0.28 }
  },
  {
    name: 'Dead Orbit Telemetry',
    category: 'void',
    description: 'Cold vacuum isolation with sparse glittering micro-grains & distant echoes.',
    version: '2.0',
    seed: 'satellite-7',
    synth: {
      baseFreq: 73.4,
      osc1Type: 'sine',
      osc2Type: 'sine',
      detuneSpread: 6.5,
      subLevel: 0.3,
      fmRatio: 3.5,
      fmDepth: 28.0,
      noiseLevel: 0.15,
      ringModFreq: 311.1,
      ringModMix: 0.3,
      pitchCreep: 0.0
    },
    filter: {
      cutoff: 620.0,
      resonance: 12.0,
      noiseCutoff: 2800.0,
      noiseQ: 16.0,
      combFreq: 440.0,
      combFeedback: 0.75,
      combMix: 0.38,
      formantMorph: 0.9,
      formantMix: 0.25
    },
    granular: {
      enabled: true,
      texture: 'glitch',
      density: 6.5,
      size: 0.045,
      spray: 0.9,
      pitch: 1.85,
      pitchJitter: 0.75,
      spread: 1.0,
      reverseProb: 0.3,
      mix: 0.62
    },
    spatial: {
      orbitShape: 'figure8',
      orbitSpeed: 0.15,
      orbitRadius: 6.0,
      elevation: 0.6,
      dopplerShift: 0.35,
      binauralDetune: 4.0,
      haasWidth: 0.015,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.09, lfoDepth: 180, driftSpeed: 0.4, stereoWidth: 0.9 },
    fx: { delayTime: 0.82, delayFeedback: 0.78, delayMix: 0.55, reverbMix: 0.8, drive: 0.1 }
  },

  // ==========================================================================
  // CATEGORY 3: PSYCHEDELIC
  // ==========================================================================
  {
    name: 'Looming Singularity',
    category: 'psychedelic',
    description: 'Ring-modulated psychedelic shimmer, wide binaural beats & rising pitch illusion.',
    version: '2.0',
    seed: 'singularity-9',
    synth: {
      baseFreq: 58.27,
      osc1Type: 'sawtooth',
      osc2Type: 'triangle',
      detuneSpread: 38.0,
      subLevel: 0.55,
      fmRatio: 1.732,
      fmDepth: 85.0,
      noiseLevel: 0.28,
      ringModFreq: 116.5,
      ringModMix: 0.62,
      pitchCreep: 0.38
    },
    filter: {
      cutoff: 780.0,
      resonance: 11.5,
      noiseCutoff: 1450.0,
      noiseQ: 10.5,
      combFreq: 233.0,
      combFeedback: 0.85,
      combMix: 0.55,
      formantMorph: 0.6,
      formantMix: 0.52
    },
    granular: {
      enabled: true,
      texture: 'choir',
      density: 24.0,
      size: 0.16,
      spray: 0.7,
      pitch: 1.35,
      pitchJitter: 0.55,
      spread: 0.95,
      reverseProb: 0.8,
      mix: 0.6
    },
    spatial: {
      orbitShape: 'figure8',
      orbitSpeed: 0.65,
      orbitRadius: 1.8,
      elevation: 0.35,
      dopplerShift: 0.65,
      binauralDetune: 10.5,
      haasWidth: 0.02,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.42, lfoDepth: 520, driftSpeed: 0.8, stereoWidth: 1.0 },
    fx: { delayTime: 0.38, delayFeedback: 0.76, delayMix: 0.52, reverbMix: 0.65, drive: 0.35 }
  },
  {
    name: 'Mycelial Nightmare',
    category: 'psychedelic',
    description: 'Organic squelching acid-void filters, chaotic reverse grain clouds & spore echoes.',
    version: '2.0',
    seed: 'mycelium-42',
    synth: {
      baseFreq: 51.9,
      osc1Type: 'sawtooth',
      osc2Type: 'sawtooth',
      detuneSpread: 29.0,
      subLevel: 0.5,
      fmRatio: 2.41,
      fmDepth: 94.0,
      noiseLevel: 0.32,
      ringModFreq: 155.5,
      ringModMix: 0.48,
      pitchCreep: 0.18
    },
    filter: {
      cutoff: 420.0,
      resonance: 15.2,
      noiseCutoff: 1920.0,
      noiseQ: 15.0,
      combFreq: 175.0,
      combFeedback: 0.8,
      combMix: 0.46,
      formantMorph: 0.75,
      formantMix: 0.65
    },
    granular: {
      enabled: true,
      texture: 'glitch',
      density: 32.0,
      size: 0.065,
      spray: 0.9,
      pitch: 1.6,
      pitchJitter: 0.85,
      spread: 0.95,
      reverseProb: 0.7,
      mix: 0.65
    },
    spatial: {
      orbitShape: 'stalker',
      orbitSpeed: 0.75,
      orbitRadius: 2.2,
      elevation: 0.25,
      dopplerShift: 0.55,
      binauralDetune: 8.4,
      haasWidth: 0.017,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.88, lfoDepth: 640, driftSpeed: 0.9, stereoWidth: 0.95 },
    fx: { delayTime: 0.29, delayFeedback: 0.72, delayMix: 0.54, reverbMix: 0.55, drive: 0.4 }
  },
  {
    name: 'Dimensional Rift',
    category: 'psychedelic',
    description: 'Fractured stereo phase shifting, Bohlen-Pierce intervals & rapid 3D elevation.',
    version: '2.0',
    seed: 'rift-303',
    synth: {
      baseFreq: 69.3,
      osc1Type: 'square',
      osc2Type: 'triangle',
      detuneSpread: 54.0,
      subLevel: 0.48,
      fmRatio: 1.46,
      fmDepth: 110.0,
      noiseLevel: 0.36,
      ringModFreq: 207.9,
      ringModMix: 0.7,
      pitchCreep: -0.32
    },
    filter: {
      cutoff: 920.0,
      resonance: 12.8,
      noiseCutoff: 2200.0,
      noiseQ: 11.5,
      combFreq: 311.0,
      combFeedback: 0.88,
      combMix: 0.62,
      formantMorph: 0.4,
      formantMix: 0.5
    },
    granular: {
      enabled: true,
      texture: 'choir',
      density: 26.0,
      size: 0.14,
      spray: 0.8,
      pitch: 1.75,
      pitchJitter: 0.7,
      spread: 1.0,
      reverseProb: 0.65,
      mix: 0.58
    },
    spatial: {
      orbitShape: 'spiral',
      orbitSpeed: 1.15,
      orbitRadius: 1.6,
      elevation: 0.7,
      dopplerShift: 0.85,
      binauralDetune: 14.0,
      haasWidth: 0.022,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 1.2, lfoDepth: 580, driftSpeed: 0.85, stereoWidth: 1.0 },
    fx: { delayTime: 0.19, delayFeedback: 0.8, delayMix: 0.56, reverbMix: 0.62, drive: 0.48 }
  },
  {
    name: 'Hypnagogic Paralysis',
    category: 'psychedelic',
    description: 'Throbbing 6.5Hz theta binaural beat, uncanny vocal whispers & sleep-paralysis dread.',
    version: '2.0',
    seed: 'hypno-66',
    synth: {
      baseFreq: 43.65,
      osc1Type: 'sine',
      osc2Type: 'triangle',
      detuneSpread: 16.0,
      subLevel: 0.68,
      fmRatio: 1.98,
      fmDepth: 36.0,
      noiseLevel: 0.48,
      ringModFreq: 87.3,
      ringModMix: 0.34,
      pitchCreep: -0.15
    },
    filter: {
      cutoff: 240.0,
      resonance: 7.2,
      noiseCutoff: 1320.0,
      noiseQ: 16.5,
      combFreq: 131.0,
      combFeedback: 0.76,
      combMix: 0.42,
      formantMorph: 0.2,
      formantMix: 0.78
    },
    granular: {
      enabled: true,
      texture: 'choir',
      density: 15.0,
      size: 0.24,
      spray: 0.65,
      pitch: 0.92,
      pitchJitter: 0.22,
      spread: 0.85,
      reverseProb: 0.85,
      mix: 0.58
    },
    spatial: {
      orbitShape: 'stalker',
      orbitSpeed: 0.16,
      orbitRadius: 1.1,
      elevation: 0.05,
      dopplerShift: 0.3,
      binauralDetune: 6.5,
      haasWidth: 0.019,
      manualX: 0,
      manualZ: 0.6
    },
    modulation: { lfoRate: 0.11, lfoDepth: 160, driftSpeed: 0.6, stereoWidth: 0.9 },
    fx: { delayTime: 0.52, delayFeedback: 0.68, delayMix: 0.46, reverbMix: 0.76, drive: 0.24 }
  },

  // ==========================================================================
  // CATEGORY 4: HORROR
  // ==========================================================================
  {
    name: 'Flesh Cathedral',
    category: 'horror',
    description: 'Throat-like formant vowels, unsettling microtonal choir grains & wet cavern acoustics.',
    version: '2.0',
    seed: 'cathedral-13',
    synth: {
      baseFreq: 38.89,
      osc1Type: 'sawtooth',
      osc2Type: 'sawtooth',
      detuneSpread: 34.0,
      subLevel: 0.65,
      fmRatio: 1.33,
      fmDepth: 58.0,
      noiseLevel: 0.45,
      ringModFreq: 58.3,
      ringModMix: 0.36,
      pitchCreep: -0.2
    },
    filter: {
      cutoff: 310.0,
      resonance: 9.2,
      noiseCutoff: 780.0,
      noiseQ: 13.0,
      combFreq: 77.78,
      combFeedback: 0.83,
      combMix: 0.5,
      formantMorph: 0.12,
      formantMix: 0.88
    },
    granular: {
      enabled: true,
      texture: 'choir',
      density: 19.0,
      size: 0.26,
      spray: 0.55,
      pitch: 0.68,
      pitchJitter: 0.32,
      spread: 0.88,
      reverseProb: 0.75,
      mix: 0.68
    },
    spatial: {
      orbitShape: 'circle',
      orbitSpeed: 0.14,
      orbitRadius: 2.2,
      elevation: 0.4,
      dopplerShift: 0.45,
      binauralDetune: 4.8,
      haasWidth: 0.016,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.08, lfoDepth: 260, driftSpeed: 0.68, stereoWidth: 0.85 },
    fx: { delayTime: 0.66, delayFeedback: 0.7, delayMix: 0.48, reverbMix: 0.84, drive: 0.44 }
  },
  {
    name: 'Siren of the Mire',
    category: 'horror',
    description: 'Wailing pitch-gliding dissonance, comb-filtered metallic screech & blood-curdling proximity.',
    version: '2.0',
    seed: 'siren-666',
    synth: {
      baseFreq: 82.4,
      osc1Type: 'triangle',
      osc2Type: 'sawtooth',
      detuneSpread: 48.0,
      subLevel: 0.45,
      fmRatio: 2.66,
      fmDepth: 115.0,
      noiseLevel: 0.38,
      ringModFreq: 293.6,
      ringModMix: 0.55,
      pitchCreep: 0.52
    },
    filter: {
      cutoff: 860.0,
      resonance: 16.5,
      noiseCutoff: 1680.0,
      noiseQ: 17.5,
      combFreq: 466.16,
      combFeedback: 0.9,
      combMix: 0.68,
      formantMorph: 0.92,
      formantMix: 0.75
    },
    granular: {
      enabled: true,
      texture: 'metallic',
      density: 25.0,
      size: 0.15,
      spray: 0.6,
      pitch: 1.9,
      pitchJitter: 0.5,
      spread: 0.9,
      reverseProb: 0.6,
      mix: 0.56
    },
    spatial: {
      orbitShape: 'pendulum',
      orbitSpeed: 0.48,
      orbitRadius: 1.5,
      elevation: 0.5,
      dopplerShift: 0.8,
      binauralDetune: 9.2,
      haasWidth: 0.015,
      manualX: 0,
      manualZ: -0.5
    },
    modulation: { lfoRate: 0.36, lfoDepth: 680, driftSpeed: 0.82, stereoWidth: 0.92 },
    fx: { delayTime: 0.46, delayFeedback: 0.75, delayMix: 0.52, reverbMix: 0.72, drive: 0.58 }
  },
  {
    name: 'Arachnid Swarm',
    category: 'horror',
    description: 'High-density jittering micro-grains scuttling 360° around the back of your head.',
    version: '2.0',
    seed: 'swarm-808',
    synth: {
      baseFreq: 48.99,
      osc1Type: 'square',
      osc2Type: 'sawtooth',
      detuneSpread: 45.0,
      subLevel: 0.52,
      fmRatio: 3.73,
      fmDepth: 130.0,
      noiseLevel: 0.52,
      ringModFreq: 415.3,
      ringModMix: 0.68,
      pitchCreep: 0.1
    },
    filter: {
      cutoff: 640.0,
      resonance: 13.5,
      noiseCutoff: 3100.0,
      noiseQ: 18.0,
      combFreq: 523.25,
      combFeedback: 0.87,
      combMix: 0.6,
      formantMorph: 0.78,
      formantMix: 0.55
    },
    granular: {
      enabled: true,
      texture: 'glitch',
      density: 42.0,
      size: 0.025,
      spray: 0.95,
      pitch: 2.4,
      pitchJitter: 0.9,
      spread: 1.0,
      reverseProb: 0.5,
      mix: 0.78
    },
    spatial: {
      orbitShape: 'stalker',
      orbitSpeed: 1.45,
      orbitRadius: 0.85,
      elevation: -0.35,
      dopplerShift: 0.6,
      binauralDetune: 12.0,
      haasWidth: 0.021,
      manualX: 0,
      manualZ: 0.8
    },
    modulation: { lfoRate: 1.65, lfoDepth: 540, driftSpeed: 0.95, stereoWidth: 1.0 },
    fx: { delayTime: 0.14, delayFeedback: 0.68, delayMix: 0.45, reverbMix: 0.48, drive: 0.62 }
  },
  {
    name: 'The Unseen Watcher',
    category: 'horror',
    description: 'Sub-audible infrasound dread, sudden stochastic metallic scrapes & close breathing.',
    version: '2.0',
    seed: 'watcher-01',
    synth: {
      baseFreq: 32.7,
      osc1Type: 'sine',
      osc2Type: 'sawtooth',
      detuneSpread: 22.0,
      subLevel: 0.92,
      fmRatio: 1.06,
      fmDepth: 42.0,
      noiseLevel: 0.5,
      ringModFreq: 49.0,
      ringModMix: 0.28,
      pitchCreep: -0.25
    },
    filter: {
      cutoff: 165.0,
      resonance: 8.5,
      noiseCutoff: 1180.0,
      noiseQ: 15.5,
      combFreq: 65.4,
      combFeedback: 0.89,
      combMix: 0.58,
      formantMorph: 0.32,
      formantMix: 0.72
    },
    granular: {
      enabled: true,
      texture: 'metallic',
      density: 8.5,
      size: 0.19,
      spray: 0.92,
      pitch: 0.6,
      pitchJitter: 0.65,
      spread: 0.95,
      reverseProb: 0.8,
      mix: 0.52
    },
    spatial: {
      orbitShape: 'stalker',
      orbitSpeed: 0.22,
      orbitRadius: 0.95,
      elevation: 0.1,
      dopplerShift: 0.4,
      binauralDetune: 3.8,
      haasWidth: 0.023,
      manualX: 0.3,
      manualZ: 0.75
    },
    modulation: { lfoRate: 0.06, lfoDepth: 190, driftSpeed: 0.75, stereoWidth: 0.95 },
    fx: { delayTime: 0.55, delayFeedback: 0.74, delayMix: 0.42, reverbMix: 0.82, drive: 0.38 }
  }
];

// ============================================================================
// MUSICAL & MICROTONAL SCALES FOR KEYBOARD / PIANO ROLL
// Intervals in semitones relative to root note (can be fractional for microtonal!)
// ============================================================================
export interface ScaleDefinition {
  id: string;
  name: string;
  description: string;
  semitones: number[]; // 12 degrees per cycle
}

export const SCALES: ScaleDefinition[] = [
  {
    id: 'chromatic',
    name: 'Chromatic (12-TET)',
    description: 'Standard 12-tone equal temperament.',
    semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  },
  {
    id: 'locrian',
    name: 'Locrian Dread',
    description: 'Darkest modal scale featuring flat-2nd and diminished 5th tritone.',
    semitones: [0, 1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 18]
  },
  {
    id: 'phrygian_dom',
    name: 'Phrygian Dominant',
    description: 'Exotic ritual tension with flat-2nd and major-3rd.',
    semitones: [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19]
  },
  {
    id: 'hungarian_minor',
    name: 'Hungarian Horror Minor',
    description: 'Gothic double-harmonic minor with augmented 4th tritone & major 7th.',
    semitones: [0, 2, 3, 6, 7, 8, 11, 12, 14, 15, 18, 19]
  },
  {
    id: 'whole_tone',
    name: 'Whole Tone Psychedelic',
    description: 'Suspended dreamlike scale with no tonal gravity.',
    semitones: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
  },
  {
    id: 'bohlen_pierce',
    name: 'Bohlen-Pierce (Alien 13-Tritave)',
    description: 'Non-octave microtonal tuning based on 3:1 ratios — deeply unsettling.',
    semitones: [0, 1.46, 2.93, 4.39, 5.85, 7.32, 8.78, 10.24, 11.7, 13.17, 14.63, 16.09]
  },
  {
    id: 'quarter_dread',
    name: 'Quarter-Tone Uncanny (24-TET)',
    description: 'Microtonal cluster scale with eerie 50-cent quarter-tone bends.',
    semitones: [0, 0.5, 1.5, 3, 3.5, 5.5, 6, 6.5, 8, 9.5, 10.5, 11.5]
  }
];

// ============================================================================
// 16-STEP SEQUENCER / PIANO ROLL PRESET PATTERNS
// step.noteIndex: 0..11 (or -1 for rest), velocity: 0..1
// ============================================================================
export interface SequencerStep {
  active: boolean;
  noteIndex: number; // 0 to 11
  velocity: number;  // 0.1 to 1.0
}

export interface SequencerPattern {
  id: string;
  name: string;
  scaleId: string;
  bpm: number;
  steps: SequencerStep[];
}

export const SEQUENCER_PATTERNS: SequencerPattern[] = [
  {
    id: 'ostinato_dread',
    name: 'Ostinato of Dread',
    scaleId: 'locrian',
    bpm: 112,
    steps: [
      { active: true, noteIndex: 0, velocity: 0.95 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 1, velocity: 0.7 },
      { active: true, noteIndex: 4, velocity: 0.85 },
      { active: true, noteIndex: 0, velocity: 0.9 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 5, velocity: 0.75 },
      { active: true, noteIndex: 4, velocity: 0.8 },
      { active: true, noteIndex: 0, velocity: 0.95 },
      { active: true, noteIndex: 1, velocity: 0.65 },
      { active: true, noteIndex: 7, velocity: 0.9 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 6, velocity: 0.85 },
      { active: true, noteIndex: 4, velocity: 0.75 },
      { active: true, noteIndex: 1, velocity: 0.8 },
      { active: false, noteIndex: 0, velocity: 0.5 }
    ]
  },
  {
    id: 'psychedelic_spiral',
    name: 'Psychedelic Spiral',
    scaleId: 'whole_tone',
    bpm: 128,
    steps: [
      { active: true, noteIndex: 0, velocity: 0.9 },
      { active: true, noteIndex: 2, velocity: 0.7 },
      { active: true, noteIndex: 4, velocity: 0.75 },
      { active: true, noteIndex: 6, velocity: 0.85 },
      { active: true, noteIndex: 8, velocity: 0.9 },
      { active: true, noteIndex: 10, velocity: 0.75 },
      { active: true, noteIndex: 11, velocity: 0.95 },
      { active: true, noteIndex: 9, velocity: 0.7 },
      { active: true, noteIndex: 7, velocity: 0.85 },
      { active: true, noteIndex: 5, velocity: 0.7 },
      { active: true, noteIndex: 3, velocity: 0.8 },
      { active: true, noteIndex: 1, velocity: 0.65 },
      { active: true, noteIndex: 4, velocity: 0.9 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 8, velocity: 0.85 },
      { active: true, noteIndex: 6, velocity: 0.75 }
    ]
  },
  {
    id: 'stalker_pulse',
    name: 'Stalker Heartbeat',
    scaleId: 'quarter_dread',
    bpm: 92,
    steps: [
      { active: true, noteIndex: 0, velocity: 1.0 },
      { active: true, noteIndex: 0, velocity: 0.65 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 6, velocity: 0.85 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 1, velocity: 0.7 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 0, velocity: 1.0 },
      { active: true, noteIndex: 0, velocity: 0.65 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 10, velocity: 0.95 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 7, velocity: 0.8 },
      { active: true, noteIndex: 5, velocity: 0.75 },
      { active: false, noteIndex: 0, velocity: 0.5 }
    ]
  },
  {
    id: 'cathedral_ritual',
    name: 'Cathedral Ritual',
    scaleId: 'hungarian_minor',
    bpm: 84,
    steps: [
      { active: true, noteIndex: 0, velocity: 0.95 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 3, velocity: 0.8 },
      { active: true, noteIndex: 4, velocity: 0.85 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 6, velocity: 0.9 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 7, velocity: 0.95 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 5, velocity: 0.75 },
      { active: true, noteIndex: 3, velocity: 0.85 },
      { active: true, noteIndex: 2, velocity: 0.8 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 1, velocity: 0.75 },
      { active: false, noteIndex: 0, velocity: 0.5 }
    ]
  },
  {
    id: 'alien_telemetry',
    name: 'Bohlen-Pierce Anomaly',
    scaleId: 'bohlen_pierce',
    bpm: 136,
    steps: [
      { active: true, noteIndex: 0, velocity: 0.9 },
      { active: true, noteIndex: 5, velocity: 0.75 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 9, velocity: 0.95 },
      { active: true, noteIndex: 2, velocity: 0.65 },
      { active: true, noteIndex: 7, velocity: 0.85 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 11, velocity: 0.9 },
      { active: true, noteIndex: 3, velocity: 0.7 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 8, velocity: 0.85 },
      { active: true, noteIndex: 1, velocity: 0.8 },
      { active: true, noteIndex: 10, velocity: 0.95 },
      { active: true, noteIndex: 4, velocity: 0.7 },
      { active: false, noteIndex: 0, velocity: 0.5 },
      { active: true, noteIndex: 6, velocity: 0.85 }
    ]
  }
];
