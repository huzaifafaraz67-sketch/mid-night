/**
 * Procedural WebAudio Horror Soundscape Engine
 * Fully synthesized sound effects and continuous ambient drones.
 * Requires zero external audio files.
 */

class HorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isMuted = false;
  private volume = 0.85;
  private isInitialized = false;

  public init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.isInitialized = true;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.buildNoiseBuffer();

      // 1. Sub-bass Room Drone
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.14;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 200;
      lp.Q.value = 2.5;
      this.droneGain.connect(lp);
      lp.connect(this.masterGain);

      [55, 55.8, 82.4].forEach((freq, idx) => {
        if (!this.ctx || !this.droneGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = idx === 2 ? 'triangle' : 'sawtooth';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.value = idx === 2 ? 0.3 : 0.5;
        osc.connect(g);
        g.connect(this.droneGain);
        osc.start();
      });

      // 2. Fridge Electrical Hum (60Hz + 120Hz harmonics)
      this.humGain = this.ctx.createGain();
      this.humGain.gain.value = 0.06;
      this.humGain.connect(this.masterGain);

      [60, 120, 180].forEach((freq, idx) => {
        if (!this.ctx || !this.humGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.value = 0.55 / (idx + 1);
        osc.connect(g);
        g.connect(this.humGain);
        osc.start();
      });

      // 3. Ambient Wind
      if (this.noiseBuffer) {
        const wind = this.ctx.createBufferSource();
        wind.buffer = this.noiseBuffer;
        wind.loop = true;
        const wf = this.ctx.createBiquadFilter();
        wf.type = 'bandpass';
        wf.frequency.value = 380;
        wf.Q.value = 0.8;
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.08;
        wind.connect(wf);
        wf.connect(this.windGain);
        this.windGain.connect(this.masterGain);
        wind.start();

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.08;
        const lg = this.ctx.createGain();
        lg.gain.value = 0.04;
        lfo.connect(lg);
        lg.connect(this.windGain.gain);
        lfo.start();
      }

      // 4. Heartbeat bus
      this.heartbeatGain = this.ctx.createGain();
      this.heartbeatGain.gain.value = 0;
      this.heartbeatGain.connect(this.masterGain);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  private buildNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public setFridgeHumDistance(dist: number, isPowerOn: boolean) {
    if (!this.humGain) return;
    if (!isPowerOn) {
      this.humGain.gain.value = 0;
      return;
    }
    const target = 0.06 / (1 + dist * 0.4);
    this.humGain.gain.value = Math.max(0, Math.min(0.08, target));
  }

  public playTone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, glideFreq?: number) {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      if (glideFreq) {
        osc.frequency.exponentialRampToValueAtTime(glideFreq, this.ctx.currentTime + dur);
      }
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + dur + 0.05);
    } catch {}
  }

  public playNoise(dur: number, freq: number, vol = 0.5, type: BiquadFilterType = 'bandpass') {
    if (!this.ctx || this.isMuted || !this.masterGain || !this.noiseBuffer) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const flt = this.ctx.createBiquadFilter();
      flt.type = type;
      flt.frequency.value = freq;
      flt.Q.value = 1.4;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      src.connect(flt);
      flt.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      src.stop(this.ctx.currentTime + dur + 0.05);
    } catch {}
  }

  public playKnock(intensity = 1.0) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playNoise(0.24, 180, 0.9 * intensity, 'lowpass');
        this.playTone(85, 0.2, 'triangle', 0.25 * intensity, 45);
      }, i * 500);
    }
  }

  public playFootstep(isSprint: boolean) {
    const freq = 650 + Math.random() * 300;
    const vol = isSprint ? 0.22 : 0.12;
    this.playNoise(0.09, freq, vol, 'bandpass');
  }

  public playHeartbeat(nervePercent: number) {
    if (!this.ctx || this.isMuted || nervePercent > 55) return;
    const urgency = 1 - nervePercent / 55;
    this.playTone(55, 0.18, 'sine', 0.15 + urgency * 0.25, 40);
    setTimeout(() => {
      this.playTone(50, 0.22, 'sine', 0.1 + urgency * 0.2, 35);
    }, 180);
  }

  public playSwitch() {
    this.playTone(1300, 0.04, 'square', 0.15);
    this.playNoise(0.06, 2800, 0.28, 'highpass');
  }

  public playDoor(isOpen: boolean) {
    this.playNoise(0.65, isOpen ? 320 : 260, 0.45, 'lowpass');
    this.playTone(280, 0.7, 'sawtooth', 0.06, 120);
  }

  public playLatch() {
    this.playTone(950, 0.05, 'triangle', 0.2);
    this.playNoise(0.08, 1800, 0.2, 'bandpass');
  }

  public playPhoneRing() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(1050, 0.35, 'sine', 0.18);
        this.playTone(1290, 0.35, 'sine', 0.16);
      }, i * 850);
    }
  }

  public playWhisper() {
    this.playNoise(1.8, 850, 0.38, 'bandpass');
    this.playTone(210, 1.4, 'sine', 0.07, 140);
  }

  public playTerrorStinger() {
    this.playNoise(0.8, 120, 0.95, 'lowpass');
    this.playTone(65, 1.2, 'sawtooth', 0.5, 30);
    this.playTone(720, 0.9, 'triangle', 0.35, 1100);
  }

  public playDawnChime() {
    [392, 523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.9, 'triangle', 0.22), i * 260);
    });
  }

  public playMicrowaveBeep() {
    this.playTone(1800, 0.25, 'sine', 0.2);
  }
}

export const sound = new HorrorAudioEngine();
