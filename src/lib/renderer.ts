import type { ActiveNote } from './gameEngine';
import type { JudgementName, LaneIndex } from './types';
import { JUDGEMENT_DISPLAY, KEY_BINDINGS } from './types';

export interface RenderConfig {
  originX: number;
  laneWidth: number;
  canvasWidth: number;
  canvasHeight: number;
  hitLineY: number;
  scrollSpeed: number;
}

export interface RenderState {
  elapsedMs: number;
  notes: ActiveNote[];
  pressedLanes: ReadonlySet<number>;
  judgement: { name: JudgementName; at: number } | null;
  combo: number;
}

interface LaneColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

const LANE_COLORS: LaneColor[] = [
  { r: 74, g: 222, b: 128, hex: '#4ade80' },
  { r: 96, g: 165, b: 250, hex: '#60a5fa' },
  { r: 251, g: 146, b: 60, hex: '#fb923c' },
  { r: 239, g: 68, b: 68, hex: '#ef4444' },
];

const MISSED_COLOR: LaneColor = { r: 75, g: 85, b: 99, hex: '#4b5563' };

const JUDGE_COLORS: Record<JudgementName, string> = {
  perfect: '#fbbf24',
  great: '#22d3ee',
  good: '#a3e635',
  miss: '#ef4444',
};

const LANE_ROTATIONS = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];

const MAX_ARROW_SIZE = 104;
const ARROW_LANE_RATIO = 0.74;

function rgba(c: LaneColor, alpha: number): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private cfg: RenderConfig;
  private arrowSize: number;

  constructor(ctx: CanvasRenderingContext2D, cfg: RenderConfig) {
    this.ctx = ctx;
    this.cfg = cfg;
    this.arrowSize = Math.min(cfg.laneWidth * ARROW_LANE_RATIO, MAX_ARROW_SIZE);
  }

  private laneX(lane: number): number {
    return this.cfg.originX + lane * this.cfg.laneWidth;
  }

  private laneCenter(lane: number): number {
    return this.laneX(lane) + this.cfg.laneWidth / 2;
  }

  private yAt(timeMs: number, elapsedMs: number): number {
    return this.cfg.hitLineY - ((timeMs - elapsedMs) / 1000) * this.cfg.scrollSpeed;
  }

  render(state: RenderState): void {
    const { ctx } = this;
    const { canvasWidth: w, canvasHeight: h } = this.cfg;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    this.drawPlayfield(state.pressedLanes);
    this.drawReceptors(state.pressedLanes);
    this.drawHoldBodies(state);
    this.drawHeads(state);
    this.drawKeyLabels(state.pressedLanes);
    this.drawJudgement(state);
    this.drawCombo(state.combo);
  }

  private drawArrow(
    cx: number,
    cy: number,
    size: number,
    lane: number,
    fill: string | null,
    stroke: string | null,
    lineWidth: number,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(LANE_ROTATIONS[lane]);
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 0.02, -size * 0.5);
    ctx.lineTo(size * 0.02, -size * 0.22);
    ctx.lineTo(-size * 0.5, -size * 0.22);
    ctx.lineTo(-size * 0.5, size * 0.22);
    ctx.lineTo(size * 0.02, size * 0.22);
    ctx.lineTo(size * 0.02, size * 0.5);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayfield(pressed: ReadonlySet<number>): void {
    const { ctx } = this;
    const { laneWidth: lw, canvasHeight: h, hitLineY: hy, originX } = this.cfg;
    const right = originX + 4 * lw;

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#10101c' : '#0d0d18';
      ctx.fillRect(this.laneX(i), 0, lw, h);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const x = this.laneX(i) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();

    const anyPressed = pressed.size > 0;
    const glowH = anyPressed ? 36 : 20;
    const grad = ctx.createLinearGradient(0, hy - glowH, 0, hy + glowH);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${anyPressed ? 0.22 : 0.1})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(originX, hy - glowH, right - originX, glowH * 2);

    ctx.strokeStyle = anyPressed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = anyPressed ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(originX, hy);
    ctx.lineTo(right, hy);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      if (!pressed.has(i)) continue;
      const c = LANE_COLORS[i];
      const lg = ctx.createLinearGradient(0, hy - 90, 0, hy + 90);
      lg.addColorStop(0, rgba(c, 0));
      lg.addColorStop(0.5, rgba(c, 0.22));
      lg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(this.laneX(i), hy - 90, lw, 180);
    }
  }

  private drawReceptors(pressed: ReadonlySet<number>): void {
    const { ctx } = this;
    const hy = this.cfg.hitLineY;
    for (let i = 0; i < 4; i++) {
      const cx = this.laneCenter(i);
      const c = LANE_COLORS[i];
      if (pressed.has(i)) {
        ctx.save();
        ctx.shadowColor = c.hex;
        ctx.shadowBlur = 28;
        this.drawArrow(cx, hy, this.arrowSize, i, c.hex, '#ffffff', 3);
        ctx.restore();
      } else {
        this.drawArrow(cx, hy, this.arrowSize, i, rgba(c, 0.16), rgba(c, 0.85), 4);
      }
    }
  }

  private drawHoldBodies(state: RenderState): void {
    const { ctx } = this;
    const { canvasHeight: h, hitLineY: hy } = this.cfg;
    const margin = this.arrowSize;
    const bodyW = this.arrowSize * 0.5;

    for (const n of state.notes) {
      const holdMs = n.note.holdMs ?? 0;
      if (holdMs <= 0) continue;
      const failed = n.judgement === 'miss';
      if (n.judgement !== null && !failed && !n.holding) continue;

      const headY = this.yAt(n.note.timeMs, state.elapsedMs);
      const tailY = this.yAt(n.note.timeMs + holdMs, state.elapsedMs);
      const top = tailY;
      const bottom = n.holding ? hy : headY;
      if (bottom < -margin || top > h + margin) continue;

      const color = failed ? MISSED_COLOR : LANE_COLORS[n.note.lane];
      const alpha = failed ? 0.5 : 1;
      const x = this.laneCenter(n.note.lane) - bodyW / 2;
      const height = Math.max(0, bottom - top);

      const grad = ctx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, rgba(color, 0.3 * alpha));
      grad.addColorStop(1, rgba(color, (n.holding ? 0.85 : 0.6) * alpha));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, top, bodyW, height, bodyW / 2);
      ctx.fill();

      ctx.strokeStyle = rgba(color, 0.9 * alpha);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawHeads(state: RenderState): void {
    const { ctx } = this;
    const { canvasHeight: h, hitLineY: hy } = this.cfg;
    const size = this.arrowSize;

    for (const n of state.notes) {
      const failed = n.judgement === 'miss';
      const holding = n.holding;
      if (!holding && n.judgement !== null && !failed) continue;

      const y = holding ? hy : this.yAt(n.note.timeMs, state.elapsedMs);
      if (y < -size || y > h + size) continue;

      const lane = n.note.lane;
      const color = failed ? MISSED_COLOR : LANE_COLORS[lane];
      const cx = this.laneCenter(lane);

      ctx.save();
      ctx.globalAlpha = failed ? 0.3 : 1;
      if (holding) {
        ctx.shadowColor = color.hex;
        ctx.shadowBlur = 30;
      } else if (!failed) {
        const dist = Math.abs(y - hy);
        if (dist < 140) {
          ctx.shadowColor = color.hex;
          ctx.shadowBlur = 28 * (1 - dist / 140);
        }
      }
      this.drawArrow(cx, y, size, lane, color.hex, 'rgba(255,255,255,0.95)', 3);
      ctx.restore();

      if (!failed) this.drawArrow(cx, y, size * 0.45, lane, 'rgba(255,255,255,0.3)', null, 0);
    }
  }

  private drawKeyLabels(pressed: ReadonlySet<number>): void {
    const { ctx } = this;
    const hy = this.cfg.hitLineY;
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = pressed.has(i) ? LANE_COLORS[i].hex : 'rgba(255,255,255,0.35)';
      ctx.fillText(
        KEY_BINDINGS[i as LaneIndex].toUpperCase(),
        this.laneCenter(i),
        hy + this.arrowSize / 2 + 22,
      );
    }
  }

  private drawJudgement(state: RenderState): void {
    if (!state.judgement) return;
    const { ctx } = this;
    const age = performance.now() - state.judgement.at;
    const dur = 600;
    if (age >= dur) return;

    const t = age / dur;
    const color = JUDGE_COLORS[state.judgement.name];
    const cx = this.cfg.originX + (4 * this.cfg.laneWidth) / 2;
    const y = this.cfg.hitLineY - this.arrowSize / 2 - 40 - t * 20;

    ctx.save();
    ctx.font = `800 ${30 + (1 - t) * 8}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1 - t;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.fillText(JUDGEMENT_DISPLAY[state.judgement.name], cx, y);
    ctx.restore();
  }

  private drawCombo(combo: number): void {
    if (combo <= 0) return;
    const { ctx } = this;
    const cx = this.cfg.originX + (4 * this.cfg.laneWidth) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.font = '700 32px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${combo}`, cx, 40);
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('COMBO', cx, 64);
    ctx.restore();
  }
}
