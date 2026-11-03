<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { SongDefinition, ResultsData, ReplayEvent } from './types';
  import type { HudData } from './gameEngine';
  import type { GameplaySettings } from './settings';
  import { transformChart, type ModId } from './mods';
  import { KEY_LANES, MAX_SCORE } from './types';
  import { AudioEngine } from './audioEngine';
  import { GameEngine } from './gameEngine';
  import { GameRenderer } from './renderer';

  let {
    song,
    difficulty,
    settings,
    mods,
    replayEvents,
    onEnd,
    onQuit,
  }: {
    song: SongDefinition;
    difficulty: keyof SongDefinition['charts'];
    settings: GameplaySettings;
    mods: ModId[];
    replayEvents?: ReplayEvent[];
    onEnd: (results: ResultsData) => void;
    onQuit: () => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let audio: AudioEngine;
  let engine: GameEngine;
  let renderer: GameRenderer;
  let rafId = 0;

  let hud = $state<HudData>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 100,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    lastJudgement: null,
    lastJudgementAt: 0,
  });

  let countdown = $state(3);
  let countdownVisible = $state(true);
  let started = false;
  const pressedLanes = new Set<number>();
  const recordedInputs: ReplayEvent[] = [];
  const replayTimers: number[] = [];
  const replayMode = Boolean(replayEvents?.length);

  const HIT_LINE_RATIO = 0.82;
  const MAX_LANE_WIDTH = 130;
  const LEAD_IN_MS = 3000;

  function computeGrade(accuracy: number): string {
    if (accuracy >= 98) return 'S';
    if (accuracy >= 93) return 'A';
    if (accuracy >= 85) return 'B';
    if (accuracy >= 75) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
  }

  function finishGame() {
    cancelAnimationFrame(rafId);
    audio.stopMusic();

    const h = engine.getHud();
    const results: ResultsData = {
      songId: song.id,
      songName: song.name,
      difficulty,
      score: h.score,
      maxScore: MAX_SCORE,
      accuracy: h.accuracy,
      maxCombo: h.maxCombo,
      counts: { ...h.counts },
      grade: computeGrade(h.accuracy),
      fullCombo: h.counts.miss === 0,
      mods: [...mods],
      replayEvents: replayMode ? [...(replayEvents ?? [])] : [...recordedInputs],
    };

    onEnd(results);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === 'escape') {
      onQuit();
      return;
    }
    const lane = KEY_LANES[key];
    if (lane === undefined) return;
    e.preventDefault();
    if (!started || replayMode) return;
    audio.playClick(settings.clickVolume);
    pressedLanes.add(lane);
    recordedInputs.push({ atMs: Math.max(0, engine.getElapsedMs()), lane, down: true });
    engine.onKeyDown(lane);
  }

  function handleKeyup(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const lane = KEY_LANES[key];
    if (lane === undefined || !engine) return;
    if (replayMode) return;
    pressedLanes.delete(lane);
    if (started) recordedInputs.push({ atMs: Math.max(0, engine.getElapsedMs()), lane, down: false });
    engine.onKeyUp(lane);
  }

  async function startGame() {
    audio = new AudioEngine();
    await audio.resume();

    const chart = transformChart(song.charts[difficulty], mods, `${song.id}-${difficulty}`);
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const hitLineY = cssH * HIT_LINE_RATIO;
    const laneWidth = Math.min(cssW / 4, MAX_LANE_WIDTH);

    renderer = new GameRenderer(ctx, {
      originX: (cssW - laneWidth * 4) / 2,
      laneWidth,
      canvasWidth: cssW,
      canvasHeight: cssH,
      hitLineY,
      scrollSpeed: settings.scrollSpeed,
    });

    engine = new GameEngine(
      chart,
      {
        onHud: (newHud: HudData) => {
          hud = newHud;
        },
        onEnd: () => {
          setTimeout(() => finishGame(), 800);
        },
      },
      LEAD_IN_MS,
      settings.timingOffsetMs,
      { easy: mods.includes('easy'), hardRock: mods.includes('hard-rock'), perfect: mods.includes('perfect') },
    );

    engine.start();

    countdown = 3;
    countdownVisible = true;
    const cdInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(cdInterval);
        countdownVisible = false;
        started = true;
        audio.startMusic(chart.bpm, chart.notes.length, () => {});
        if (replayMode) {
          for (const event of replayEvents ?? []) {
            const timer = window.setTimeout(() => {
              if (event.down) { pressedLanes.add(event.lane); engine.onKeyDown(event.lane); }
              else { pressedLanes.delete(event.lane); engine.onKeyUp(event.lane); }
            }, Math.max(0, event.atMs));
            replayTimers.push(timer);
          }
        }
      }
    }, 1000);
  }

  function renderLoop() {
    if (engine && renderer && started && !engine.isEnded()) {
      engine.updateMisses();

      const h = engine.getHud();
      const judgeAge = performance.now() - h.lastJudgementAt;

      renderer.render({
        elapsedMs: engine.getElapsedMs(),
        notes: engine.getNotes(),
        pressedLanes,
        judgement:
          h.lastJudgement && judgeAge < 600
            ? { name: h.lastJudgement, at: h.lastJudgementAt }
            : null,
        combo: h.combo,
      });
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    void startGame();
    rafId = requestAnimationFrame(renderLoop);
  });

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    replayTimers.forEach((timer) => clearTimeout(timer));
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    audio?.stopMusic();
    audio?.destroy();
  });

  const accuracyPct = $derived(hud.accuracy.toFixed(2));
</script>

<div class="game-container">
  {#if replayMode}<div class="replay-indicator">REPLAY · INPUT PLAYBACK</div>{/if}
  <div class="hud-bar">
    <button type="button" class="quit-btn" onclick={onQuit}>✕</button>
    <div class="hud-item">
      <span class="hud-label">Score</span>
      <span class="hud-value">{hud.score.toLocaleString()}</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Combo</span>
      <span class="hud-value combo">{hud.combo}</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Accuracy</span>
      <span class="hud-value">{accuracyPct}%</span>
    </div>
    <div class="hud-item diff-display">
      <span class="hud-label">Track</span>
      <span class="hud-value small">{song.name} · {difficulty}{mods.length ? ` · ${mods.map((mod) => mod.toUpperCase()).join(' / ')}` : ''}</span>
    </div>
  </div>

  <div class="combo-bar">
    <div
      class="combo-fill"
      style="width: {Math.min((hud.combo / Math.max(hud.maxCombo, 1)) * 100, 100)}%"
    ></div>
  </div>

  <canvas bind:this={canvas} class="game-canvas"></canvas>

  {#if countdownVisible}
    <div class="countdown-overlay">
      <span class="countdown-num" in:fade={{ duration: 200 }}>
        {countdown > 0 ? countdown : 'GO!'}
      </span>
    </div>
  {/if}
</div>

<style>
  .game-container {
    position: fixed;
    inset: 0;
    background: #0a0a12;
    display: flex;
    flex-direction: column;
  }

  .hud-bar {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 10;
  }

  .quit-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.6);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  }
  .quit-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
  }

  .hud-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .hud-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 600;
  }
  .hud-value {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .hud-value.combo {
    color: #fbbf24;
  }
  .hud-value.small {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
  }
  .diff-display {
    margin-left: auto;
  }

  .combo-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }
  .combo-fill {
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #f97316);
    transition: width 0.3s ease;
  }

  .game-canvas {
    flex: 1;
    width: 100%;
    display: block;
  }

  .countdown-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    pointer-events: none;
    background: rgba(10, 10, 18, 0.5);
  }
  .countdown-num {
    font-size: 120px;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
  }

  .replay-indicator{position:absolute;top:58px;right:18px;z-index:11;padding:6px 9px;border:1px solid rgba(167,139,250,.35);border-radius:5px;background:rgba(167,139,250,.1);color:#c4b5fd;font-size:8px;font-weight:900;letter-spacing:1px}
  @media (max-width: 600px) {
    .hud-bar {
      gap: 14px;
      padding: 8px 14px;
    }
    .hud-value {
      font-size: 15px;
    }
    .countdown-num {
      font-size: 80px;
    }
  }
</style>
