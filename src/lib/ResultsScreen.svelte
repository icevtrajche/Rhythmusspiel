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

  <div class="score-display">
    <span class="score-value">{results.score.toLocaleString()}</span>
    <span class="score-label">SCORE</span>
  </div>

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
    <button type="button" class="btn-secondary" onclick={onReplay}>
      ↻ Retry
    </button>
    <button type="button" class="btn-primary" onclick={onMenu}>
      ◀ Back to Menu
    </button>
  </div>
</div>
