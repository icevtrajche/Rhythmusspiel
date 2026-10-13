import type { ChartNote } from './types';
import { LANE_ARROWS } from './types';

interface RenderConfig {
  laneWidth: number;
  laneCount: number;
  canvasWidth: number;
  canvasHeight: number;
  hitLineY: number;
  scrollSpeed: number;
  receptorY: number;
}

interface RenderNote {
  note: ChartNote;
  hit: boolean;
  missed: boolean;
  /** For hold notes: true while the player is actively holding */
  holding: boolean;
  /** For hold notes: true when the hold is complete */
  holdComplete: boolean;
  /** For hold notes: true when the hold was dropped early */
  holdDropped: boolean;
}

interface RenderState {
  elapsedMs: number;
  notes: RenderNote[];
  pressedLanes: Set<number>;
  judgement: { name: string; deltaMs: number; lane: number; at: number } | null;
  combo: number;
}

const LANE_COLORS = [
  { r: 74, g: 222, b: 128, hex: '#4ade80' }, // green - Left
  { r: 96, g: 165, b: 250, hex: '#60a5fa' }, // blue - Down
  { r: 251, g: 146, b: 60, hex: '#fb923c' }, // orange - Up
  { r: 239, g: 68, b: 68, hex: '#ef4444' }, // red - Right
];

const JUDGE_COLORS: Record<string, string> = {
  perfect: '#fbbf24',
  great: '#22d3ee',
  good: '#a3e635',
  miss: '#ef4444',
};

const NOTE_HEIGHT = 28;
const HOLD_TAIL_WIDTH_RATIO = 0.5;

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private cfg: RenderConfig;

  constructor(ctx: CanvasRenderingContext2D, cfg: RenderConfig) {
    this.ctx = ctx;
    this.cfg = cfg;
  }

  resize(width: number, height: number, hitLineY: number): void {
    this.cfg.canvasWidth = width;
    this.cfg.canvasHeight = height;
    this.cfg.hitLineY = hitLineY;
    this.cfg.receptorY = hitLineY;
    this.cfg.laneWidth = width / this.cfg.laneCount;
  }

  private drawArrow(
    cx: number,
    cy: number,
    size: number,
    lane: number,
    color: string,
    filled: boolean,
  ): void {
    const ctx = this.ctx;
    const s = size;
    ctx.save();
    ctx.translate(cx, cy);

    // Rotate based on lane: 0=Left, 1=Down, 2=Up, 3=Right
    const rotations = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
    ctx.rotate(rotations[lane]);

    // Arrow shape pointing right (then rotated)
    ctx.beginPath();
    ctx.moveTo(s * 0.5, 0); // tip
    ctx.lineTo(-s * 0.15, -s * 0.42);
    ctx.lineTo(-s * 0.15, -s * 0.22);
    ctx.lineTo(-s * 0.5, -s * 0.22);
    ctx.lineTo(-s * 0.5, s * 0.22);
    ctx.lineTo(-s * 0.15, s * 0.22);
    ctx.lineTo(-s * 0.15, s * 0.42);
    ctx.closePath();

    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  render(state: RenderState): void {
    const ctx = this.ctx;
    const {
      canvasWidth: w,
      canvasHeight: h,
      laneWidth: lw,
      laneCount: lc,
      hitLineY: hy,
      scrollSpeed: sp,
    } = this.cfg;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    // Lane backgrounds
    for (let i = 0; i < lc; i++) {
      const x = i * lw;
      ctx.fillStyle = i % 2 === 0 ? '#10101c' : '#0d0d18';
      ctx.fillRect(x, 0, lw, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(lc * lw, 0);
    ctx.lineTo(lc * lw, h);
    ctx.stroke();

    // Hit line — glow intensifies when any lane is pressed
    const anyPressed = state.pressedLanes.size > 0;
    const glowAlpha = anyPressed ? 0.28 : 0.12;
    const glowHeight = anyPressed ? 36 : 20;
    const grad = ctx.createLinearGradient(0, hy - glowHeight, 0, hy + glowHeight);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${glowAlpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, hy - glowHeight, w, glowHeight * 2);

    ctx.strokeStyle = anyPressed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = anyPressed ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, hy);
    ctx.lineTo(w, hy);
    ctx.stroke();

    // Per-lane hit line glow when pressed
    for (let i = 0; i < lc; i++) {
      if (!state.pressedLanes.has(i)) continue;
      const c = LANE_COLORS[i];
      const lg = ctx.createLinearGradient(0, hy - 30, 0, hy + 30);
      lg.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0)`);
      lg.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},0.25)`);
      lg.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
      ctx.fillStyle = lg;
      ctx.fillRect(i * lw, hy - 30, lw, 60);
    }

    // Receptors (hit targets) — bigger, arrow-shaped
    for (let i = 0; i < lc; i++) {
      const cx = i * lw + lw / 2;
      const pressed = state.pressedLanes.has(i);
      const c = LANE_COLORS[i];
      const receptorSize = Math.min(lw * 0.38, 34);

      if (pressed) {
        // Filled glowing receptor
        ctx.shadowColor = c.hex;
        ctx.shadowBlur = 20;
        this.drawArrow(cx, hy, receptorSize, i, c.hex, true);
        ctx.shadowBlur = 0;
      } else {
        // Outlined receptor
        this.drawArrow(cx, hy, receptorSize, i, `rgba(${c.r},${c.g},${c.b},0.3)`, false);
      }
    }

    // Notes — draw hold tails first (behind heads), then heads on top
    const visibleNotes = state.notes.filter((rn) => {
      if (rn.hit && !rn.holding) return false;
      const n = rn.note;
      const y = hy - ((n.timeMs - state.elapsedMs) / 1000) * sp;
      const holdMs = n.holdMs ?? 0;
      const tailEndY = hy - ((n.timeMs + holdMs - state.elapsedMs) / 1000) * sp;
      return y > -60 || tailEndY > -60;
    });

    // Pass 1: hold tails
    for (const rn of visibleNotes) {
      const n = rn.note;
      const holdMs = n.holdMs ?? 0;
      if (holdMs <= 0) continue;
      if (rn.holdComplete) continue;

      const headY = hy - ((n.timeMs - state.elapsedMs) / 1000) * sp;
      const tailEndY = hy - ((n.timeMs + holdMs - state.elapsedMs) / 1000) * sp;

      const lane = n.lane;
      const cx = lane * lw + lw / 2;
      const c = LANE_COLORS[lane];
      const tailW = lw * HOLD_TAIL_WIDTH_RATIO;
      const nx = cx - tailW / 2;

      const topY = Math.min(headY, tailEndY);
      const botY = Math.max(headY, tailEndY);

      if (botY < -30 || topY > h + 30) continue;

      // If actively holding, the tail shrinks from the head end
      let drawTop = topY;
      let drawBot = botY;
      let alpha = 1;

      if (rn.holding) {
        // Tail is being consumed — draw from hit line up to tail end
        drawTop = Math.min(hy, tailEndY);
        drawBot = Math.max(hy, tailEndY);
        alpha = 0.7;
      } else if (rn.holdDropped) {
        alpha = 0.15;
      } else if (rn.missed) {
        alpha = 0.15;
      }

      ctx.globalAlpha = alpha;

      // Tail body
      const tailGrad = ctx.createLinearGradient(nx, 0, nx + tailW, 0);
      tailGrad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.3)`);
      tailGrad.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},0.5)`);
      tailGrad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0.3)`);
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.roundRect(nx, drawTop, tailW, drawBot - drawTop, 6);
      ctx.fill();

      // Tail outline
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.6)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(nx, drawTop, tailW, drawBot - drawTop, 6);
      ctx.stroke();

      ctx.globalAlpha = 1;
    }

    // Pass 2: note heads
    for (const rn of visibleNotes) {
      const n = rn.note;
      const holdMs = n.holdMs ?? 0;
      const isHold = holdMs > 0;

      // For holds that are being held, don't draw the head (it's consumed)
      if (rn.holding) continue;
      if (rn.holdComplete) continue;

      const y = hy - ((n.timeMs - state.elapsedMs) / 1000) * sp;
      if (y < -40 || y > h + 40) continue;

      const lane = n.lane;
      const cx = lane * lw + lw / 2;
      const c = LANE_COLORS[lane];

      if (rn.missed || rn.holdDropped) {
        ctx.globalAlpha = 0.2;
      }

      const noteW = Math.min(lw * 0.8, 56);
      const noteH = NOTE_HEIGHT;
      const nx = cx - noteW / 2;
      const ny = y - noteH / 2;

      // Glow when near hit line
      const dist = Math.abs(y - hy);
      if (dist < 100 && !rn.missed) {
        ctx.shadowColor = c.hex;
        ctx.shadowBlur = 24 * (1 - dist / 100);
      }

      // Note body — rounded rect with gradient
      const bodyGrad = ctx.createLinearGradient(nx, ny, nx, ny + noteH);
      bodyGrad.addColorStop(0, `rgba(${Math.min(255, c.r + 40)},${Math.min(255, c.g + 40)},${Math.min(255, c.b + 40)},1)`);
      bodyGrad.addColorStop(0.5, c.hex);
      bodyGrad.addColorStop(1, `rgba(${Math.max(0, c.r - 30)},${Math.max(0, c.g - 30)},${Math.max(0, c.b - 30)},1)`);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(nx, ny, noteW, noteH, 8);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = `rgba(255,255,255,0.3)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(nx, ny, noteW, noteH, 8);
      ctx.stroke();

      // Arrow icon inside the note
      const arrowSize = Math.min(noteH * 0.8, 22);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      this.drawArrow(cx, y, arrowSize, lane, '#ffffff', true);
      ctx.shadowBlur = 0;

      // For hold notes, draw a small "hold" indicator at the bottom
      if (isHold) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '600 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HOLD', cx, ny + noteH + 8);
      }

      ctx.globalAlpha = 1;
    }

    // Lane key labels with arrow icons
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lc; i++) {
      const cx = i * lw + lw / 2;
      const pressed = state.pressedLanes.has(i);
      const c = LANE_COLORS[i];

      // Arrow icon below receptor
      const arrowSize = Math.min(lw * 0.22, 18);
      this.drawArrow(cx, hy + 30, arrowSize, i,
        pressed ? c.hex : 'rgba(255,255,255,0.2)',
        pressed);

      // Key letter
      ctx.fillStyle = pressed
        ? `rgba(${c.r},${c.g},${c.b},1)`
        : 'rgba(255,255,255,0.2)';
      ctx.fillText(LANE_ARROWS[i] === '◀' ? 'D' :
        LANE_ARROWS[i] === '▼' ? 'F' :
        LANE_ARROWS[i] === '▲' ? 'J' : 'K',
        cx, hy + 52);
    }

    // Judgement text
    if (state.judgement) {
      const age = performance.now() - state.judgement.at;
      const dur = 600;
      if (age < dur) {
        const t = age / dur;
        const alpha = 1 - t;
        const yOff = -t * 20;
        const color = JUDGE_COLORS[state.judgement.name] ?? '#fff';
        ctx.font = `700 ${26 + (1 - t) * 10}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = color;
        const text =
          state.judgement.name === 'miss'
            ? 'MISS'
            : state.judgement.name.toUpperCase();
        ctx.fillText(text, w / 2, hy - 80 + yOff);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // Combo display
    if (state.combo > 0) {
      ctx.font = '700 32px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(`${state.combo}`, w / 2, 40);
      ctx.font = '500 12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('COMBO', w / 2, 64);
      ctx.shadowBlur = 0;
    }
  }
}
