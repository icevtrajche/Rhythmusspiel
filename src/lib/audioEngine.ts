export class AudioEngine {
  private ctx: AudioContext | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private endCb: (() => void) | null = null;

  get currentTime(): number {
    return this.ctx ? this.ctx.currentTime * 1000 : 0;
  }

  get latencyMs(): number {
    if (!this.ctx) return 0;
    return (this.ctx.baseLatency ?? 0) * 1000;
  }

  async resume(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 44100;
  }

  /**
   * Click for key presses & judgement feedback — short filtered noise burst.
   */
  playClick(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 0.02,
      this.ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.15));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t);
  }

  /**
   * A short melodic phrase that plays alongside the chart as backing music.
   */
  playTone(
    freq: number,
    durationMs: number,
    whenMs = 0,
    type: OscillatorType = 'triangle',
    volume = 0.12,
  ): void {
    if (!this.ctx) return;
    const startSec = this.ctx.currentTime + whenMs / 1000;
    const durSec = durationMs / 1000;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startSec);
    gain.gain.linearRampToValueAtTime(volume, startSec + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, startSec + durSec);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(startSec);
    osc.stop(startSec + durSec + 0.05);
  }

  private noteFreqs: number[] = [];

  private buildMelody(bpm: number, noteCount: number): void {
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    let seed = bpm;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    this.noteFreqs = [];
    for (let i = 0; i < noteCount; i++) {
      this.noteFreqs.push(scale[Math.floor(rand() * scale.length)]);
    }
  }

  startMusic(
    bpm: number,
    noteCount: number,
    onEnd: () => void,
  ): void {
    this.endCb = onEnd;
    const beatMs = 60_000 / bpm;
    const introMs = beatMs * 4;
    const noteSpacing = beatMs * 0.5;
    const totalMs = introMs + noteSpacing * noteCount + 1000;

    this.buildMelody(bpm, noteCount);

    // Sequence melody notes with setTimeout, each scheduled precisely
    // via Web Audio's clock (playTone uses ctx.currentTime internally).
    for (let i = 0; i < noteCount; i++) {
      const whenMs = introMs + i * noteSpacing;
      const freq = this.noteFreqs[i];
      const dur = beatMs * 0.4;
      const type: OscillatorType = i % 4 === 0 ? 'sawtooth' : 'triangle';
      const vol = i % 4 === 0 ? 0.1 : 0.07;
      this.playTone(freq, dur, whenMs, type, vol);

      // Bass kick on every 4th note
      if (i % 4 === 0) {
        this.playTone(65, beatMs * 0.3, whenMs, 'sine', 0.18);
      }
    }

    this.endTimer = setTimeout(() => {
      this.endCb?.();
    }, totalMs);
  }

  stopMusic(): void {
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    this.endCb = null;
  }

  destroy(): void {
    this.stopMusic();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
