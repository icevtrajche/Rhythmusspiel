import type { Chart, ChartNote, JudgementName } from './types';
import { JUDGEMENT_WINDOWS, JUDGEMENT_SCORES } from './types';

export interface ActiveNote {
  note: ChartNote;
  /** Null until the note is pressed or passes its window unhit. */
  judgement: JudgementName | null;
  /** True while a hold note's key must stay down. */
  holding: boolean;
}

export interface HudData {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  counts: Record<JudgementName, number>;
  lastJudgement: JudgementName | null;
  lastJudgementAt: number;
}

export interface EngineCallbacks {
  onHud: (hud: HudData) => void;
  onEnd: () => void;
}

const ACCURACY_WEIGHTS: Record<JudgementName, number> = {
  perfect: 1,
  great: 0.75,
  good: 0.4,
  miss: 0,
};

const HOLD_BONUS_RATIO = 0.5;

export class GameEngine {
  private notes: ActiveNote[];
  private pressed = new Set<number>();
  private startTime = 0;
  private ended = false;
  private hud: HudData = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 100,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    lastJudgement: null,
    lastJudgementAt: 0,
  };
  private callbacks: EngineCallbacks;
  private leadInMs: number;
  private timingOffsetMs: number;

  constructor(chart: Chart, callbacks: EngineCallbacks, leadInMs: number, timingOffsetMs = 0) {
    this.callbacks = callbacks;
    this.leadInMs = leadInMs;
    this.timingOffsetMs = timingOffsetMs;
    this.notes = chart.notes
      .slice()
      .sort((a, b) => a.timeMs - b.timeMs)
      .map((note) => ({ note, judgement: null, holding: false }));
  }

  start(): void {
    this.startTime = performance.now() + this.leadInMs;
  }

  getElapsedMs(): number {
    return performance.now() - this.startTime;
  }

  private getJudgementElapsedMs(): number {
    return this.getElapsedMs() + this.timingOffsetMs;
  }

  getNotes(): ActiveNote[] {
    return this.notes;
  }

  getHud(): HudData {
    return { ...this.hud, accuracy: this.computeAccuracy() };
  }

  isEnded(): boolean {
    return this.ended;
  }

  onKeyDown(lane: number): void {
    if (this.pressed.has(lane)) return;
    this.pressed.add(lane);
    this.tryPress(lane);
  }

  onKeyUp(lane: number): void {
    if (!this.pressed.delete(lane)) return;
    this.tryRelease(lane);
  }

  /** Called each frame. Marks unhit notes as missed and completes holds that reached their end. */
  updateMisses(): void {
    if (this.ended) return;
    const elapsed = this.getJudgementElapsedMs();
    let changed = false;

    for (const n of this.notes) {
      if (n.holding) {
        const holdEnd = n.note.timeMs + (n.note.holdMs ?? 0);
        if (elapsed >= holdEnd) {
          n.holding = false;
          this.completeHold(n);
          changed = true;
        }
        continue;
      }
      if (n.judgement === null && elapsed > n.note.timeMs + JUDGEMENT_WINDOWS.good) {
        n.judgement = 'miss';
        this.registerMiss();
        changed = true;
      }
    }

    if (changed) {
      this.emit();
      this.checkEnd();
    }
  }

  private computeAccuracy(): number {
    const counts = this.hud.counts;
    const total = counts.perfect + counts.great + counts.good + counts.miss;
    if (total === 0) return 100;
    let weighted = 0;
    for (const j of Object.keys(ACCURACY_WEIGHTS) as JudgementName[]) {
      weighted += counts[j] * ACCURACY_WEIGHTS[j];
    }
    return (weighted / total) * 100;
  }

  private judge(deltaMs: number): JudgementName {
    const abs = Math.abs(deltaMs);
    if (abs <= JUDGEMENT_WINDOWS.perfect) return 'perfect';
    if (abs <= JUDGEMENT_WINDOWS.great) return 'great';
    return 'good';
  }

  private registerHit(j: JudgementName): void {
    this.hud.score += JUDGEMENT_SCORES[j] + this.hud.combo * 2;
    this.hud.combo++;
    if (this.hud.combo > this.hud.maxCombo) this.hud.maxCombo = this.hud.combo;
    this.hud.counts[j]++;
    this.hud.lastJudgement = j;
    this.hud.lastJudgementAt = performance.now();
  }

  private registerMiss(): void {
    this.hud.counts.miss++;
    this.hud.combo = 0;
    this.hud.lastJudgement = 'miss';
    this.hud.lastJudgementAt = performance.now();
  }

  private completeHold(n: ActiveNote): void {
    if (n.judgement !== null) {
      this.hud.score += Math.floor(JUDGEMENT_SCORES[n.judgement] * HOLD_BONUS_RATIO);
    }
  }

  private failHold(n: ActiveNote): void {
    if (n.judgement !== null) this.hud.counts[n.judgement]--;
    n.judgement = 'miss';
    this.registerMiss();
  }

  private tryPress(lane: number): void {
    const elapsed = this.getJudgementElapsedMs();
    let best: ActiveNote | null = null;
    let bestDelta = Infinity;

    for (const n of this.notes) {
      if (n.note.lane !== lane || n.judgement !== null) continue;
      const delta = n.note.timeMs - elapsed;
      if (delta > JUDGEMENT_WINDOWS.good) break;
      if (delta < -JUDGEMENT_WINDOWS.good) continue;
      if (Math.abs(delta) < Math.abs(bestDelta)) {
        bestDelta = delta;
        best = n;
      }
    }

    if (!best) return;

    best.judgement = this.judge(bestDelta);
    best.holding = (best.note.holdMs ?? 0) > 0;
    this.registerHit(best.judgement);
    this.emit();
    this.checkEnd();
  }

  private tryRelease(lane: number): void {
    const n = this.notes.find((x) => x.holding && x.note.lane === lane);
    if (!n) return;

    const elapsed = this.getJudgementElapsedMs();
    const holdEnd = n.note.timeMs + (n.note.holdMs ?? 0);
    n.holding = false;

    if (elapsed < holdEnd - JUDGEMENT_WINDOWS.good) {
      this.failHold(n);
    } else {
      this.completeHold(n);
    }

    this.emit();
    this.checkEnd();
  }

  private emit(): void {
    this.callbacks.onHud(this.getHud());
  }

  private checkEnd(): void {
    if (this.ended) return;
    const allDone = this.notes.every((n) => n.judgement !== null && !n.holding);
    if (allDone) {
      this.ended = true;
      this.callbacks.onEnd();
    }
  }
}
