import type {
  ChartNote,
  JudgementName,
  JudgementResult,
  Chart,
} from './types';
import {
  JUDGEMENT_WINDOWS,
  JUDGEMENT_SCORES,
} from './types';

interface ActiveNote {
  note: ChartNote;
  hit: boolean;
  missed: boolean;
  // Hold note state
  holding: boolean;
  holdComplete: boolean;
  holdDropped: boolean;
  /** ms accumulated while holding (for tick scoring) */
  holdTicksAwarded: number;
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
  onJudgement: (j: JudgementResult) => void;
  onHud: (hud: HudData) => void;
  onEnd: () => void;
}

export interface EngineConfig {
  scrollSpeed: number;
  hitLineY: number;
  leadInMs: number;
}

/** Score per ms while holding a hold note */
const HOLD_TICK_SCORE = 0.5;
/** Award a hold tick every N ms */
const HOLD_TICK_INTERVAL = 50;

export class GameEngine {
  private notes: ActiveNote[] = [];
  private pressed: Set<number> = new Set();
  private startTime = 0;
  private ended = false;
  private callbacks: EngineCallbacks;
  private config: EngineConfig;

  readonly totalNotes: number;

  constructor(
    chart: Chart,
    callbacks: EngineCallbacks,
    config: EngineConfig,
  ) {
    this.callbacks = callbacks;
    this.config = config;
    this.notes = chart.notes
      .slice()
      .sort((a, b) => a.timeMs - b.timeMs)
      .map((note) => ({
        note,
        hit: false,
        missed: false,
        holding: false,
        holdComplete: false,
        holdDropped: false,
        holdTicksAwarded: 0,
      }));
    this.totalNotes = this.notes.length;
  }

  start(): void {
    this.startTime = performance.now() + this.config.leadInMs;
  }

  getElapsedMs(): number {
    return performance.now() - this.startTime;
  }

  getNotes(): ActiveNote[] {
    return this.notes;
  }

  private hud: HudData = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 0,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    lastJudgement: null,
    lastJudgementAt: 0,
  };

  getHud(): HudData {
    return this.hud;
  }

  private maxPossibleScore = 0;
  private currentMaxScore = 0;

  private updateHud(): void {
    this.hud.accuracy =
      this.maxPossibleScore > 0
        ? (this.currentMaxScore / this.maxPossibleScore) * 100
        : 100;
    this.callbacks.onHud({ ...this.hud });
  }

  private judge(deltaMs: number): JudgementName {
    const abs = Math.abs(deltaMs);
    if (abs <= JUDGEMENT_WINDOWS.perfect) return 'perfect';
    if (abs <= JUDGEMENT_WINDOWS.great) return 'great';
    if (abs <= JUDGEMENT_WINDOWS.good) return 'good';
    return 'miss';
  }

  private addScore(pts: number, isHit: boolean): void {
    this.hud.score += pts + (isHit ? this.hud.combo * 2 : 0);
    if (isHit) {
      this.hud.combo++;
      if (this.hud.combo > this.hud.maxCombo) {
        this.hud.maxCombo = this.hud.combo;
      }
    }
  }

  private registerJudgement(j: JudgementName, deltaMs: number, lane: number): void {
    this.hud.counts[j]++;
    this.hud.lastJudgement = j;
    this.hud.lastJudgementAt = performance.now();
    this.callbacks.onJudgement({
      name: j,
      deltaMs,
      lane: lane as 0 | 1 | 2 | 3,
    });
  }

  onKeyDown(lane: number): void {
    if (this.pressed.has(lane)) return;
    this.pressed.add(lane);
    this.tryHit(lane);
  }

  onKeyUp(lane: number): void {
    this.pressed.delete(lane);
    this.tryRelease(lane);
  }

  private tryHit(lane: number): void {
    const elapsed = this.getElapsedMs();
    let best: ActiveNote | null = null;
    let bestDelta = Infinity;

    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      if (n.note.lane !== lane) continue;
      const delta = n.note.timeMs - elapsed;
      if (Math.abs(delta) > JUDGEMENT_WINDOWS.good) {
        if (delta > JUDGEMENT_WINDOWS.good) break;
        continue;
      }
      if (Math.abs(delta) < Math.abs(bestDelta)) {
        bestDelta = delta;
        best = n;
      }
    }

    if (!best) return;

    best.hit = true;
    const j = this.judge(bestDelta);
    const pts = JUDGEMENT_SCORES[j];

    this.addScore(pts, j !== 'miss');
    this.maxPossibleScore += JUDGEMENT_SCORES.perfect + this.totalNotes * 2;
    this.currentMaxScore += pts + (j !== 'miss' ? this.hud.combo * 2 : 0);
    this.registerJudgement(j, bestDelta, lane);

    // If it's a hold note and the head was hit (not missed), start holding
    if (j !== 'miss' && (best.note.holdMs ?? 0) > 0) {
      best.holding = true;
    }

    this.updateHud();
    this.checkEnd();
  }

  private tryRelease(lane: number): void {
    const elapsed = this.getElapsedMs();

    for (const n of this.notes) {
      if (!n.holding) continue;
      if (n.note.lane !== lane) continue;

      const holdEnd = n.note.timeMs + (n.note.holdMs ?? 0);
      const releaseDelta = elapsed - holdEnd;
      const absDelta = Math.abs(releaseDelta);

      n.holding = false;

      if (absDelta <= JUDGEMENT_WINDOWS.good) {
        // Released within window — good completion
        n.holdComplete = true;
        // Bonus score for clean release
        const releaseJudge = this.judge(releaseDelta);
        const releasePts = Math.floor(JUDGEMENT_SCORES[releaseJudge] * 0.3);
        this.hud.score += releasePts;
        // Don't increment combo again (head already did), but don't break it
      } else if (releaseDelta < -JUDGEMENT_WINDOWS.good) {
        // Released too early — dropped hold
        n.holdDropped = true;
        // No combo break for dropping, but no bonus
      } else {
        // Released late — still counts as complete (held past end)
        n.holdComplete = true;
      }

      this.updateHud();
      this.checkEnd();
      return;
    }
  }

  /**
   * Called each frame. Awards hold tick scores and marks missed notes.
   */
  updateMisses(): void {
    if (this.ended) return;
    const elapsed = this.getElapsedMs();
    let changed = false;

    // Award hold ticks for actively held notes
    for (const n of this.notes) {
      if (!n.holding) continue;
      const holdEnd = n.note.timeMs + (n.note.holdMs ?? 0);

      if (elapsed >= holdEnd) {
        // Hold is complete — the player held it fully
        n.holding = false;
        n.holdComplete = true;
        changed = true;
      } else {
        // Award tick score
        const heldSoFar = elapsed - n.note.timeMs;
        const ticksSoFar = Math.floor(heldSoFar / HOLD_TICK_INTERVAL);
        if (ticksSoFar > n.holdTicksAwarded) {
          const newTicks = ticksSoFar - n.holdTicksAwarded;
          n.holdTicksAwarded = ticksSoFar;
          this.hud.score += Math.floor(newTicks * HOLD_TICK_SCORE * HOLD_TICK_INTERVAL);
          changed = true;
        }
      }
    }

    // Mark notes as missed
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      if (n.holding) continue;
      if (n.note.timeMs + JUDGEMENT_WINDOWS.good < elapsed) {
        n.missed = true;
        if ((n.note.holdMs ?? 0) > 0) {
          // Missed a hold note head — also mark as dropped
          n.holdDropped = true;
        }
        this.hud.counts.miss++;
        this.hud.combo = 0;
        this.maxPossibleScore += JUDGEMENT_SCORES.perfect + this.totalNotes * 2;
        this.registerJudgement('miss', elapsed - n.note.timeMs, n.note.lane);
        changed = true;
      }
    }

    if (changed) {
      this.updateHud();
      this.checkEnd();
    }
  }

  private checkEnd(): void {
    if (this.ended) return;
    const allDone = this.notes.every(
      (n) => n.hit || n.missed || n.holdComplete || n.holdDropped,
    );
    if (allDone) {
      this.ended = true;
      this.callbacks.onEnd();
    }
  }

  isEnded(): boolean {
    return this.ended;
  }
}
