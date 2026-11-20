/**
 * ============================================================================
 * ANNULUS-INSPIRED PHYSICAL MODELING MODAL RESONATOR (AudioWorklet + Fallback)
 * Inline Blob URL AudioWorkletProcessor for singlefile & GitHub Pages support.
 * ============================================================================
 */

export type ModalMaterialType = 'plate' | 'membrane' | 'glass' | 'spring';

export const MODAL_RATIOS: Record<ModalMaterialType, number[]> = {
  plate: [1.0, 1.58, 2.24, 2.92, 3.71, 4.45, 5.38, 6.19],
  membrane: [1.0, 1.59, 2.14, 2.3, 2.65, 2.92, 3.16, 3.5],
  glass: [1.0, 2.0, 2.76, 3.84, 5.12, 6.45, 7.9, 9.25],
  spring: [1.0, 1.21, 1.49, 1.88, 2.34, 2.89, 3.55, 4.32]
};

const WORKLET_CODE = `
class ModalResonatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'baseFreq', defaultValue: 110, minValue: 25, maxValue: 1200, automationRate: 'k-rate' },
      { name: 'inharmonicity', defaultValue: 0.35, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'damping', defaultValue: 0.45, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'bowPressure', defaultValue: 0.35, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.numModes = 8;
    this.y1 = new Float32Array(this.numModes);
    this.y2 = new Float32Array(this.numModes);
    this.ratios = [1.0, 1.58, 2.24, 2.92, 3.71, 4.45, 5.38, 6.19];
    this.pendingStrike = 0;
    this.strikeDecay = 0;
    this.noiseSeed = 1337;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'ratios' && Array.isArray(msg.ratios)) {
        for (let i = 0; i < this.numModes; i++) {
          this.ratios[i] = Number.isFinite(msg.ratios[i]) ? msg.ratios[i] : (i + 1);
        }
      } else if (msg.type === 'strike') {
        const vel = Number.isFinite(msg.velocity) ? Math.max(0.05, Math.min(1.5, msg.velocity)) : 0.8;
        this.pendingStrike = Math.min(1.8, this.pendingStrike + vel);
        this.strikeDecay = 1.0;
      } else if (msg.type === 'reset') {
        this.y1.fill(0);
        this.y2.fill(0);
        this.pendingStrike = 0;
      }
    };
  }

  _nextNoise() {
    this.noiseSeed = (this.noiseSeed * 1664525 + 1013904223) >>> 0;
    return (this.noiseSeed / 4294967296) * 2 - 1;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const outL = output[0];
    const outR = output[1] || outL;
    const inBus = inputs[0] && inputs[0][0] ? inputs[0][0] : null;

    const baseFreq = parameters.baseFreq[0];
    const inharm = parameters.inharmonicity[0];
    const damping = parameters.damping[0];
    const bowPressure = parameters.bowPressure[0];
    const sr = sampleRate;

    // Precompute mode resonator coefficients per block
    const a1 = new Float32Array(this.numModes);
    const a2 = new Float32Array(this.numModes);
    const b0 = new Float32Array(this.numModes);

    for (let m = 0; m < this.numModes; m++) {
      const rawRatio = this.ratios[m] || (m + 1);
      // Stretch partial ratios nonlinearly with inharmonicity
      const stretchedRatio = rawRatio * (1 + inharm * 0.28 * m * Math.sqrt(m + 1));
      const freq = Math.max(25, Math.min(sr * 0.42, baseFreq * stretchedRatio));
      const w = (2 * Math.PI * freq) / sr;
      // Higher modes decay faster as damping increases
      const decayMs = Math.max(12, (1600 - damping * 1350) / (1 + m * (0.35 + damping * 0.65)));
      const r = Math.min(0.9992, Math.max(0.85, Math.exp(-1000 / (decayMs * sr))));
      a1[m] = -2 * r * Math.cos(w);
      a2[m] = r * r;
      b0[m] = (1 - r) * (0.55 / (1 + m * 0.25));
    }

    for (let i = 0; i < outL.length; i++) {
      const extIn = inBus ? inBus[i] * 0.25 : 0;
      const noise = this._nextNoise();

      // Continuous nonlinear bow/scrape friction exciter
      const bowExcite = bowPressure > 0.01
        ? Math.tanh(bowPressure * 3.5 * noise) * bowPressure * 0.16
        : 0;

      // Transient mallet strike burst
      let strikeExcite = 0;
      if (this.pendingStrike > 0.0005) {
        strikeExcite = this.pendingStrike * (0.65 + 0.35 * noise) * 0.45;
        this.pendingStrike *= 0.985;
      }

      const excitation = extIn + bowExcite + strikeExcite;
      let sumL = 0;
      let sumR = 0;

      for (let m = 0; m < this.numModes; m++) {
        let y = b0[m] * excitation - a1[m] * this.y1[m] - a2[m] * this.y2[m];
        if (!Number.isFinite(y)) y = 0;
        // Soft safety limit per mode
        if (y > 4) y = 4;
        else if (y < -4) y = -4;

        this.y2[m] = this.y1[m];
        this.y1[m] = y;

        // Subtle stereo mode spread (even modes lean L, odd modes lean R)
        if (m % 2 === 0) {
          sumL += y * 0.85;
          sumR += y * 0.55;
        } else {
          sumL += y * 0.55;
          sumR += y * 0.85;
        }
      }

      outL[i] = Math.tanh(sumL * 1.4) * 0.72;
      if (outR !== outL) {
        outR[i] = Math.tanh(sumR * 1.4) * 0.72;
      }
    }

    return true;
  }
}

registerProcessor('modal-resonator-processor', ModalResonatorProcessor);
`;

let cachedWorkletUrl: string | null = null;

export function getModalWorkletUrl(): string {
  if (!cachedWorkletUrl) {
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    cachedWorkletUrl = URL.createObjectURL(blob);
  }
  return cachedWorkletUrl;
}
