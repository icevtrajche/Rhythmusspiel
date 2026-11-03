<script lang="ts">
  import type { ResultsData } from '../lib/types';
  import { JUDGEMENT_DISPLAY } from '../lib/types';

  let {
    results,
    onReplay,
    onMenu,
  }: {
    results: ResultsData;
    onReplay: () => void;
    onMenu: () => void;
  } = $props();

  const judgements = ['perfect', 'great', 'good', 'miss'] as const;
</script>

<div class="results-container">
  <div class="grade-badge {results.grade.toLowerCase().replace('+', 'plus')}">
    {results.grade}
  </div>

  <h1>{results.songName}</h1>
  <p class="diff">{results.difficulty}</p>
  {#if results.mods?.length}<p class="result-mods">{results.mods.map((mod) => mod.toUpperCase()).join(' · ')}</p>{/if}

  {#if results.personalBest}
    <div class="pb-banner">✦ NEW PERSONAL BEST</div>
  {/if}

  <div class="score-display">
    <span class="score-value">{results.score.toLocaleString()}</span>
    <span class="score-label">SCORE</span>
  </div>

  {#if results.bestScore !== undefined}
    <p class="best-score">PERSONAL BEST <strong>{results.bestScore.toLocaleString()}</strong></p>
  {/if}

  <div class="stats-grid">
    <div class="stat-box">
      <span class="stat-value">{results.accuracy.toFixed(2)}%</span>
      <span class="stat-label">Accuracy</span>
    </div>
    <div class="stat-box">
      <span class="stat-value">{results.maxCombo}</span>
      <span class="stat-label">Max Combo</span>
    </div>
  </div>

  {#if results.fullCombo}
    <div class="fc-banner">FULL COMBO!</div>
  {/if}

  <div class="breakdown">
    <h2>Hit Breakdown</h2>
    {#each judgements as j}
      <div class="breakdown-row {j}">
        <span class="bd-label">{JUDGEMENT_DISPLAY[j]}</span>
        <span class="bd-count">{results.counts[j]}</span>
      </div>
    {/each}
  </div>

  <div class="results-actions">
    <button type="button" class="btn-secondary" onclick={onReplay}>↻ Retry</button>
    <button type="button" class="btn-primary" onclick={onMenu}>◀ Back to Menu</button>
  </div>
</div>

<style>
  .result-mods{margin:-8px 0 12px;color:#a78bfa;font-size:9px;font-weight:850;letter-spacing:1.1px}
  .pb-banner{padding:7px 13px;border:1px solid rgba(167,139,250,.45);border-radius:999px;color:#c4b5fd;background:rgba(167,139,250,.1);font-size:10px;font-weight:900;letter-spacing:1.5px}
  .best-score{margin:-8px 0 0;color:#85869a;font-size:9px;font-weight:850;letter-spacing:1.5px}
  .best-score strong{margin-left:7px;color:#c4b5fd;font:800 13px ui-monospace,monospace;letter-spacing:0}
  @media(max-width:480px){.results-actions{flex-direction:column}.results-container{padding:28px 16px}}
</style>
