/**
 * ============================================================================
 * ZEBRALETTE-INSPIRED SPLINE / SPECTRAL WAVETABLE & WAVEFOLDER GENERATOR
 * Pure Web Audio API (PeriodicWave frames + West-Coast Wavefolder curves)
 * ============================================================================
 */

export type WavetableBankType =
  | 'neuro_spline'
  | 'spectral_formant'
  | 'acid_fold'
  | 'metallic_pwm';

const NUM_HARMONICS = 48;
const NUM_FRAMES = 8;

/**
 * Generates an array of 8 morphable PeriodicWave frames for the given bank
 * and spectral tilt (-1.0 dark to +1.0 bright).
 */
export function createWavetableBank(
  ctx: AudioContext,
  bank: WavetableBankType,
  spectralTilt = 0
): PeriodicWave[] {
  const frames: PeriodicWave[] = [];
  const tilt = Math.max(-1, Math.min(1, spectralTilt));

  for (let f = 0; f < NUM_FRAMES; f++) {
    const pos = f / (NUM_FRAMES - 1); // 0.0 to 1.0
    const real = new Float32Array(NUM_HARMONICS + 1);
    const imag = new Float32Array(NUM_HARMONICS + 1);

    for (let h = 1; h <= NUM_HARMONICS; h++) {
      let amp = 0;

      if (bank === 'neuro_spline') {
        // Smooth spline-carved comb notches sweeping through sawtooth harmonics
        const base = 1 / Math.pow(h, 0.85);
        const notchCenter = 2 + pos * 24;
        const notch = 1 - 0.85 * Math.exp(-Math.pow((h - notchCenter) / 3.2, 2));
        const bump = 0.7 * Math.exp(-Math.pow((h - (notchCenter * 1.8)) / 2.5, 2));
        amp = base * (notch + bump);
      } else if (bank === 'spectral_formant') {
        // Vowel-like dual spectral peaks morphing across harmonic bins
        const peak1 = 2 + pos * 10;
        const peak2 = 16 - pos * 9;
        const env1 = Math.exp(-Math.pow((h - peak1) / 2.8, 2));
        const env2 = 0.75 * Math.exp(-Math.pow((h - peak2) / 3.8, 2));
        amp = (env1 + env2) / Math.sqrt(h);
      } else if (bank === 'acid_fold') {
        // Odd/even harmonic emphasis with FM-like Bessel sideband lobes
        const modIdx = 0.5 + pos * 6.5;
        const sideband = Math.abs(Math.sin(h * 0.45 + modIdx));
        amp = (1 / Math.pow(h, 0.72)) * (0.25 + 0.75 * sideband);
      } else {
        // 'metallic_pwm': Asymmetric pulse-width & inharmonic spectral clusters
        const duty = 0.1 + pos * 0.4;
        const pwm = Math.abs(Math.sin(Math.PI * h * duty)) / h;
        const cluster = h % 3 === 0 ? 1.35 : 0.65;
        amp = pwm * cluster;
      }

      // Apply spectral tilt (-1 darkens highs, +1 boosts highs)
      const tiltGain = Math.pow(h, tilt * 0.55);
      imag[h] = amp * tiltGain;
      // Subtle phase shift across harmonics for richer spline asymmetry
      real[h] = amp * tiltGain * Math.sin(h * (0.3 + pos * 1.2)) * 0.25;
    }

    // Normalize harmonic amplitudes to prevent DC/clipping
    let maxSum = 0;
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      maxSum += Math.hypot(real[h], imag[h]);
    }
    const norm = maxSum > 0 ? 1.4 / Math.sqrt(maxSum) : 1;
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      real[h] *= norm;
      imag[h] *= norm;
    }

    frames.push(ctx.createPeriodicWave(real, imag, { disableNormalization: false }));
  }

  return frames;
}

/**
 * Generates a West-Coast sinusoidal multi-stage wavefolder curve.
 * Normalized safely to [-0.98, 0.98].
 */
export function createWavefolderCurve(foldDrive: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  const drive = 1 + Math.max(0, Math.min(1, foldDrive)) * 7.5;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    if (foldDrive <= 0.01) {
      curve[i] = x;
    } else {
      const folded =
        Math.sin(drive * x) +
        0.35 * Math.sin(drive * 2.1 * x) * Math.min(1, foldDrive * 1.4);
      curve[i] = Math.tanh(folded * 1.15) * 0.92;
    }
  }

  return curve;
}
