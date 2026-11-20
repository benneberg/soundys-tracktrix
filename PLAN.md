# Shadowflap // Echo Engine v2.0 — Soundscape & Mobile Game Integration Plan

## 1. Implemented Soundscape Engines (from Reference Examples)

Three of the five reference soundscape styles are now implemented directly in `src/audio/EchoEngine.ts` and `src/audio/presets.ts`:

1. **Hainbach — *Noises* (`tape` texture & `tape` preset category)**
   - **Implemented**: Procedural magnetic tape-loop grain buffer featuring decaying analog test-equipment tones, continuous tape wow/flutter modulation in `_applyPitchOnly`, shortwave heterodyne sweeps, dusty vinyl pops, and per-grain warm lowpass shaping.
   - **Factory Presets**: `Hainbach Tape Loops`, `Shortwave Test Bench`.
   - **Sequencer Motif**: `Hainbach Tape Reel`.

2. **Hypnus Records — *Hypnus Slink* (`hypnotic` texture & `hypnotic` preset category)**
   - **Implemented**: Minor-9th / suspended dub-techno chord grain buffer paired with a resonant sub-pulse, long dotted-delay feedback wash, and Nordic cavernous reverb.
   - **Factory Presets**: `Hypnus Cavern Slink`, `Subterranean Modular Dub`.
   - **Sequencer Motif**: `Hypnus Slink Dub` (with `Nordic Minor 9th (Dub)` scale).

3. **G-Sonique — *Organic Liquid Alchemy* (`liquid` texture & `liquid` preset category)**
   - **Implemented**: FM-swept water/acid droplet grain synthesis with per-grain sweeping high-Q resonant bandpass filters, rapid stereo scatter, and bubbling modular modulation.
   - **Factory Presets**: `Organic Liquid Alchemy`, `Psycore Acid Drip`.
   - **Sequencer Motif**: `Liquid Alchemy Bubbles`.

---

## 2. Roadmap for Remaining Two Soundscape Engines

### A. Physical Modeling Modal & Waveguide Engine (Inspired by *Annulus*)

**Sonic Goal**: Bowed metallic plates, struck glass membranes, spring tanks, and resonant acoustic cavities that respond organically to game collisions, scrapes, and proximity.

#### DSP Architecture
1. **Exciter Stage (Impulses, Friction & Bowing)**
   - **Strike Exciter**: Short filtered noise/sine burst (`2–15 ms`) shaped by velocity (`collision`, `nearMiss`, `obstaclePassed`).
   - **Continuous Bow / Scrape Exciter**: Filtered pink/brown noise fed through a nonlinear friction curve (`tanh(bowPressure * (v_rel))`) to sustain eerie bowed-metal drones.
2. **Resonator Stage (Modal Bank + Dispersive Waveguide)**
   - **Modal Bank (`AudioWorkletNode`)**: 12–16 parallel second-order damped resonators (`y[n] = b0*x[n] - a1*y[n-1] - a2*y[n-2]`) tuned to inharmonic plate/bell ratios:
     - *Metallic Plate*: `[1.0, 1.58, 2.24, 2.92, 3.71, 4.45, 5.38, 6.19]`
     - *Membrane / Drum*: `[1.0, 1.59, 2.14, 2.30, 2.65, 2.92, 3.16, 3.50]`
     - *Stretched Glass*: `[1.0, 2.0, 2.76, 3.84, 5.12, 6.45]`
   - **Damping & Material Morph**: Frequency-dependent decay so higher partials fade faster on "wood/membrane" settings and ring longer on "metal/glass".
   - **2D Waveguide Coupling**: Feed the modal bank output softly into the existing `combDelay` with an allpass dispersion filter in the feedback loop for metallic spring/tank shimmer.
3. **Parameters to Expose**:
   - `model.material` (`'plate' | 'membrane' | 'glass' | 'spring'`)
   - `model.inharmonicity` (`0.0 – 1.0`, stretches partial ratios)
   - `model.damping` (`0.0 – 1.0`, high-frequency decay)
   - `model.bowPressure` (`0.0 – 1.0`, continuous friction excitation vs. plucked)
4. **Implementation Steps**:
   - Create `public/worklets/modal-processor.js` (or inline Blob URL `AudioWorklet` so `vite-plugin-singlefile` continues to bundle into a single HTML file).
   - Register `audioWorklet.addModule(...)` inside `EchoEngine.init()` with a graceful fallback to multi-bandpass `BiquadFilterNode` banks if `AudioWorklet` is unavailable.
   - Route game impact events (`collision`, `nearMiss`) directly into the modal exciter for physically reactive SFX.

---

### B. Heavy Spline / Spectral Wavetable & Wavefolder Engine (Inspired by *Zebralette 3*)

**Sonic Goal**: Massive morphing spectral basslines, spline-shaped harmonic sweeps, aggressive West-Coast wavefolding, and heavy neuro/industrial growls.

#### DSP Architecture
1. **Morphable Spectral Wavetable Oscillator**
   - Pre-compute an array of 16 spectral frames (`Float32Array` of `real`/`imag` FFT coefficients or 2048-sample time-domain wavetables) generated from Catmull-Rom / cubic Bezier spline curves.
   - **Two Implementation Options**:
     - *Lightweight Main-Thread (`PeriodicWave` crossfade)*: Create 2 `OscillatorNode`s with different `PeriodicWave` tables and crossfade their `GainNode`s smoothly using a `wavetablePosition` (`0.0 – 1.0`) parameter. Zero `AudioWorklet` overhead on low-end mobile browsers!
     - *Full `AudioWorklet` Spectral Morph*: Interpolate directly between adjacent 2048-sample mip-mapped frames at audio rate, allowing fast LFO/envelope FM modulation of the table index (`tablePos + lfo * depth`).
2. **Multi-Stage Wavefolder + Sub-Weight**
   - Insert a custom `WaveShaperNode` curve implementing multi-fold Chebyshev / sinusoidal folding *before* `mainFilter`:
     - `f(x) = sin(foldGain * x) + 0.35 * sin(foldGain * 2.1 * x)`
   - Mix a phase-locked pure sub-octave `sine` *after* the wavefolder so the sub-bass stays clean and heavy while upper harmonics fold aggressively.
3. **Parameters to Expose**:
   - `wavetable.bank` (`'neuro_spline' | 'spectral_formant' | 'acid_fold' | 'metallic_pwm'`)
   - `wavetable.position` (`0.0 – 1.0`)
   - `wavetable.foldDrive` (`0.0 – 1.0`)
   - `wavetable.spectralTilt` (`-1.0 – +1.0`)
4. **Implementation Steps**:
   - Add a `WavetableBankGenerator` utility in `src/audio/wavetables.ts` producing `PeriodicWave` sets (or `AudioWorklet` table buffers).
   - Wire `wavetableGain` + `wavefolder` parallel to `osc1`/`osc2` into `mainFilter` so existing presets remain 100% backward-compatible.
   - Add a dedicated `heavy` / `wavetable` preset category with 3–4 bass/neuro/industrial patches.

---

## 3. Mobile Browser Game Integration Plan

To embed `EchoEngine` cleanly into the mobile browser game without frame drops or audio glitches:

1. **Single-Bundle Compatibility**: Keep any future `AudioWorklet` processors inline via `Blob` URLs (`URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }))`) so single-file builds and GitHub Pages deployments never break on relative worker paths.
2. **Mobile CPU Tiering (`qualityTier: 'low' | 'high'`)**:
   - On mobile devices (`navigator.hardwareConcurrency <= 4`), cap `granular.density` at `14/s`, switch `panner3D.panningModel` from `'HRTF'` to `'equalpower'` if CPU load spikes, and throttle the spatial 3D update loop from `25 Hz` (`40 ms`) to `15 Hz` (`66 ms`).
3. **Lifecycle & iOS Safari Unlock**:
   - Call `engine.start(levelSeed)` inside the game's first `"Tap to Start"` pointer/touch event handler.
   - Preserve the `visibilitychange` suspend/resume hook (plus `pagehide`/`pageshow` listeners for mobile Safari tab switching).
4. **Lightweight Game Binding API**:
   - Export presets as JSON from the **PRESETS** tab and embed them directly in the game bundle.
   - Drive tension/instability/proximity at `15–20 Hz` from the game loop via `engine.setState({ tension, instability, proximity })` and fire gameplay cues via `engine.triggerEvent('nearMiss' | 'collision' | 'portal' | 'sanityDrop')`.
