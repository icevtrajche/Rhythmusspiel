<script lang="ts">
  import { SONGS } from '../lib/songs';
  import type { SongDefinition } from '../lib/types';
  import { LANE_ARROWS, LANE_ARROW_NAMES } from '../lib/types';

  let {
    onPlay,
  }: {
    onPlay: (songId: string, difficulty: keyof SongDefinition['charts']) => void;
  } = $props();

  let selectedSong = $state<string>(SONGS[0].id);
  let selectedDifficulty = $state<keyof SongDefinition['charts']>('Normal');
  let search = $state('');
  let sortBy = $state<'title' | 'bpm' | 'notes'>('title');
  let showControls = $state(false);

  const difficulties: (keyof SongDefinition['charts'])[] = ['Easy', 'Normal', 'Hard'];
  const selectedTrack = $derived(SONGS.find((song) => song.id === selectedSong) ?? SONGS[0]);
  const selectedChart = $derived(selectedTrack.charts[selectedDifficulty]);
  const filteredSongs = $derived.by(() => {
    const term = search.trim().toLowerCase();
    return SONGS
      .filter((song) => !term || song.name.toLowerCase().includes(term) || song.artist.toLowerCase().includes(term))
      .slice()
      .sort((a, b) => {
        if (sortBy === 'bpm') return a.charts[selectedDifficulty].bpm - b.charts[selectedDifficulty].bpm;
        if (sortBy === 'notes') return a.charts[selectedDifficulty].notes.length - b.charts[selectedDifficulty].notes.length;
        return a.name.localeCompare(b.name);
      });
  });

  function handlePlay() {
    onPlay(selectedSong, selectedDifficulty);
  }
</script>

<div class="menu-shell">
  <header class="topbar">
    <a class="brand" href="/" aria-label="BeatDrop home">BEAT<span>DROP</span></a>
    <div class="topbar-right">
      <span class="status-dot"></span>
      <span class="version-label">RHYTHM GAME · 4K</span>
    </div>
  </header>

  <main class="menu-layout">
    <section class="hero">
      <div class="eyebrow"><span></span> FIND YOUR RHYTHM</div>
      <h1>Feel the beat.<br /><span>Own the drop.</span></h1>
      <p class="hero-copy">A four-lane rhythm challenge. Pick a track, find your tempo, and hit every note.</p>
      <div class="hero-actions">
        <button type="button" class="primary-play" onclick={handlePlay}>
          <span class="play-icon">▶</span> PLAY SELECTED TRACK
        </button>
        <button type="button" class="text-action" onclick={() => (showControls = !showControls)}>
          {showControls ? 'HIDE' : 'VIEW'} CONTROLS <span>⌄</span>
        </button>
      </div>
      {#if showControls}
        <div class="controls-panel">
          {#each LANE_ARROWS as arrow, i}
            <div class="control-key">
              <kbd>{['D', 'F', 'J', 'K'][i]}</kbd>
              <span class="control-arrow">{arrow}</span>
              <span>{LANE_ARROW_NAMES[i]}</span>
            </div>
          {/each}
          <p>Tap when notes reach the receptors. Keep the key held for hold notes.</p>
        </div>
      {/if}
      <div class="hero-foot"><span class="pulse"></span> BUILT FOR THE BEAT</div>
    </section>

    <section class="library">
      <div class="library-heading">
        <div>
          <div class="eyebrow">THE LIBRARY</div>
          <h2>Select a track</h2>
        </div>
        <span class="track-count">{SONGS.length.toString().padStart(2, '0')} TRACKS</span>
      </div>

      <div class="library-tools">
        <label class="search-box">
          <span>⌕</span>
          <input aria-label="Search tracks" placeholder="Search title or artist..." bind:value={search} />
          {#if search}
            <button type="button" aria-label="Clear search" onclick={() => (search = '')}>×</button>
          {/if}
        </label>
        <label class="sort-select">
          <span>SORT</span>
          <select bind:value={sortBy} aria-label="Sort tracks">
            <option value="title">Title</option>
            <option value="bpm">BPM</option>
            <option value="notes">Note count</option>
          </select>
        </label>
      </div>

      <div class="track-list">
        {#each filteredSongs as song, i (song.id)}
          <button
            type="button"
            class="track-card"
            class:selected={selectedSong === song.id}
            onclick={() => (selectedSong = song.id)}
          >
            <span class="track-index">{(i + 1).toString().padStart(2, '0')}</span>
            <span class="track-art" aria-hidden="true"><span>{song.name.slice(0, 1)}</span></span>
            <span class="track-details">
              <strong>{song.name}</strong>
              <small>{song.artist}</small>
            </span>
            <span class="track-bpm">{song.charts[selectedDifficulty].bpm}<small>BPM</small></span>
            <span class="track-chevron">›</span>
          </button>
        {:else}
          <div class="empty-state">No tracks match “{search}”. Try another search.</div>
        {/each}
      </div>

      <div class="difficulty-area">
        <div class="difficulty-heading">
          <span>DIFFICULTY</span>
          <span class="selected-track-name">{selectedTrack.name}</span>
        </div>
        <div class="difficulty-options">
          {#each difficulties as diff}
            <button
              type="button"
              class="difficulty-option"
              class:active={selectedDifficulty === diff}
              class:easy={diff === 'Easy'}
              class:normal={diff === 'Normal'}
              class:hard={diff === 'Hard'}
              onclick={() => (selectedDifficulty = diff)}
            >
              <span>{diff.toUpperCase()}</span>
              <small>{selectedTrack.charts[diff].notes.length} NOTES</small>
            </button>
          {/each}
        </div>
        <div class="chart-summary">
          <div><small>TEMPO</small><strong>{selectedChart.bpm} <i>BPM</i></strong></div>
          <div><small>NOTES</small><strong>{selectedChart.notes.length}</strong></div>
          <div><small>LANES</small><strong>04</strong></div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>BEATDROP <b>///</b> HIT THE NOTE. FEEL THE FLOW.</span>
    <span>USE <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> TO PLAY</span>
  </footer>
</div>

<style>
  .menu-shell{min-height:100svh;background:radial-gradient(ellipse at 18% 34%,rgba(124,58,237,.12),transparent 42%),radial-gradient(ellipse at 90% 80%,rgba(6,182,212,.08),transparent 38%),#080910;color:#f4f4f8;padding:0 clamp(20px,6vw,92px);display:flex;flex-direction:column}
  .topbar{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08)}
  .brand{font-size:21px;font-weight:950;letter-spacing:-1.2px;color:#fff;text-decoration:none}.brand span{color:#a78bfa}
  .topbar-right{display:flex;align-items:center;gap:9px;color:#77788b;font-size:10px;font-weight:800;letter-spacing:1.8px}
  .status-dot,.hero-foot .pulse{width:7px;height:7px;border-radius:50%;background:#a78bfa;box-shadow:0 0 12px #a78bfa}
  .menu-layout{width:min(1180px,100%);margin:auto;display:grid;grid-template-columns:minmax(280px,.85fr) minmax(440px,1.15fr);gap:clamp(42px,8vw,120px);padding:66px 0 72px;align-items:center}
  .eyebrow{font-size:10px;font-weight:850;letter-spacing:2.3px;color:#a78bfa;display:flex;align-items:center;gap:9px}.eyebrow span{width:19px;height:1px;background:#a78bfa}
  .hero h1{font-size:clamp(42px,5.5vw,70px);line-height:.99;letter-spacing:-3.8px;margin:22px 0 20px;font-weight:950}.hero h1 span{color:#a78bfa}
  .hero-copy{color:#9293a6;line-height:1.8;font-size:14px;max-width:360px;margin:0}
  .hero-actions{display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-top:34px}
  button{font:inherit;cursor:pointer}
  .primary-play{border:0;border-radius:9px;padding:16px 21px;background:#a78bfa;color:#100b20;font-size:10px;font-weight:950;letter-spacing:1.1px;box-shadow:0 8px 28px rgba(167,139,250,.22);transition:transform .18s,background .18s}.primary-play:hover{transform:translateY(-2px);background:#c4b5fd}
  .play-icon{margin-right:10px;font-size:11px}
  .text-action{border:0;background:none;color:#b9b9c8;font-size:9px;font-weight:850;letter-spacing:1.2px;padding:10px 0}.text-action span{color:#a78bfa;margin-left:5px}
  .hero-foot{display:flex;align-items:center;gap:10px;margin-top:70px;color:#666779;font-size:9px;font-weight:800;letter-spacing:1.6px}
  .controls-panel{margin-top:22px;padding:15px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.025)}
  .control-key{display:inline-flex;align-items:center;gap:7px;margin:0 12px 8px 0;color:#9293a6;font-size:10px}.control-arrow{color:#a78bfa;font-size:15px}
  kbd{display:inline-flex;align-items:center;justify-content:center;min-width:25px;height:25px;padding:0 6px;border:1px solid rgba(255,255,255,.16);border-radius:5px;background:#171725;color:#fff;font:700 10px ui-monospace,monospace}
  .controls-panel p{margin:7px 0 0;color:#77788b;font-size:10px}
  .library{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:linear-gradient(145deg,rgba(25,25,43,.96),rgba(13,14,24,.96));padding:clamp(20px,3vw,32px);box-shadow:0 28px 80px rgba(0,0,0,.3)}
  .library-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:22px}.library-heading h2{font-size:25px;letter-spacing:-.8px;margin:7px 0 0;color:#f4f4f8;text-transform:none}
  .track-count{color:#77788b;font-size:9px;font-weight:850;letter-spacing:1.4px;padding-bottom:4px}
  .library-tools{display:flex;gap:10px;margin-bottom:12px}
  .search-box{height:39px;display:flex;align-items:center;gap:9px;flex:1;padding:0 11px;border:1px solid rgba(255,255,255,.09);border-radius:7px;background:rgba(0,0,0,.18);color:#77788b}
  .search-box>span{font-size:19px}.search-box input{min-width:0;flex:1;border:0;outline:0;background:none;color:#f4f4f8;font-size:11px}.search-box input::placeholder{color:#626375}.search-box button{border:0;background:none;color:#a5a5b5;font-size:17px}
  .sort-select{display:flex;align-items:center;gap:7px;padding:0 9px;border:1px solid rgba(255,255,255,.09);border-radius:7px;color:#77788b;font-size:8px;font-weight:850;letter-spacing:1px}.sort-select select{max-width:88px;border:0;outline:0;background:#171725;color:#c7c7d2;font-size:10px;padding:8px 2px}
  .track-list{display:flex;flex-direction:column;gap:5px;max-height:260px;overflow:auto}
  .track-card{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px;border:1px solid transparent;border-radius:8px;background:rgba(255,255,255,.025);color:#f4f4f8;transition:background .15s,border .15s}
  .track-card:hover{background:rgba(255,255,255,.055)}.track-card.selected{background:rgba(167,139,250,.09);border-color:rgba(167,139,250,.45)}
  .track-index{width:17px;color:#666779;font:700 9px ui-monospace,monospace}
  .track-art{width:39px;height:39px;flex:none;display:grid;place-items:center;border-radius:6px;background:linear-gradient(135deg,#5b21b6,#0891b2);font-size:17px;font-weight:950;color:#fff;box-shadow:inset 0 0 15px rgba(255,255,255,.13)}
  .track-card:nth-child(2) .track-art{background:linear-gradient(135deg,#164e63,#6d28d9)}.track-card:nth-child(3) .track-art{background:linear-gradient(135deg,#9a3412,#7e22ce)}
  .track-details{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}.track-details strong{font-size:12px;font-weight:800}.track-details small{font-size:10px;color:#85869a}
  .track-bpm{display:flex;align-items:center;gap:4px;color:#d4d4df;font:700 12px ui-monospace,monospace}.track-bpm small{font:700 8px var(--sans);color:#77788b;letter-spacing:.7px}
  .track-chevron{color:#77788b;font-size:21px}.track-card.selected .track-chevron{color:#a78bfa}
  .empty-state{padding:28px 12px;text-align:center;color:#85869a;font-size:11px}
  .difficulty-area{border-top:1px solid rgba(255,255,255,.08);margin-top:20px;padding-top:18px}
  .difficulty-heading{display:flex;justify-content:space-between;gap:10px;color:#85869a;font-size:9px;font-weight:850;letter-spacing:1.4px;margin-bottom:11px}.selected-track-name{color:#b9b9c8;letter-spacing:0;text-transform:none;font-weight:600}
  .difficulty-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .difficulty-option{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.025);color:#85869a;text-align:left}
  .difficulty-option span{font-size:9px;font-weight:900;letter-spacing:1px}.difficulty-option small{font-size:8px;color:#666779}
  .difficulty-option.active.easy{border-color:#22d3ee;background:rgba(34,211,238,.08);color:#67e8f9}.difficulty-option.active.normal{border-color:#a78bfa;background:rgba(167,139,250,.1);color:#c4b5fd}.difficulty-option.active.hard{border-color:#fb7185;background:rgba(251,113,133,.08);color:#fda4af}
  .chart-summary{display:grid;grid-template-columns:repeat(3,1fr);margin-top:17px;padding-top:15px;border-top:1px solid rgba(255,255,255,.07)}
  .chart-summary>div{display:flex;flex-direction:column;gap:4px}.chart-summary small{color:#6f7083;font-size:8px;font-weight:850;letter-spacing:1.3px}.chart-summary strong{font-size:16px;font-weight:850;font-variant-numeric:tabular-nums}.chart-summary i{font-style:normal;font-size:9px;color:#85869a}
  .footer{height:55px;border-top:1px solid rgba(255,255,255,.07);display:flex;justify-content:space-between;align-items:center;color:#656678;font-size:8px;font-weight:850;letter-spacing:1.2px}.footer b{color:#a78bfa;margin:0 7px}.footer kbd{height:19px;min-width:20px;font-size:8px;margin-left:3px}
  @media(max-width:850px){.menu-layout{grid-template-columns:1fr;gap:38px;padding:48px 0}.hero-foot{margin-top:32px}.hero h1{font-size:56px}}
  @media(max-width:520px){.menu-shell{padding:0 16px}.topbar{height:62px}.menu-layout{padding:34px 0}.hero h1{font-size:46px;letter-spacing:-2.5px}.library{padding:18px}.library-tools{flex-direction:column}.sort-select{height:36px;justify-content:space-between}.footer{height:auto;padding:16px 0;gap:12px;align-items:flex-start;flex-direction:column}.track-card{gap:8px}.track-index{display:none}}
</style>