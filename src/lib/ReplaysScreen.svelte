<script lang="ts">
  import { loadRuns, type StoredRun } from './stats';

  let { onBack, onPlay }: { onBack: () => void; onPlay: (run: StoredRun) => void } = $props();
  let runs = $state<StoredRun[]>(loadRuns());
  let query = $state('');

  const filtered = $derived(runs.filter((run) => !query.trim() || run.songName.toLowerCase().includes(query.trim().toLowerCase())));
  function refresh() { runs = loadRuns(); }
</script>

<div class="replays-shell">
  <header><a class="brand" href="/" onclick={(event) => { event.preventDefault(); onBack(); }}>BEAT<span>DROP</span></a><button type="button" onclick={onBack}>← BACK TO MENU</button></header>
  <main>
    <div class="eyebrow">YOUR RUN HISTORY</div>
    <h1>Replays<span>.</span></h1>
    <p class="intro">Every completed run is stored locally on this device. Select a run to replay its recorded keyboard inputs.</p>
    <div class="toolbar"><input aria-label="Search replays" placeholder="Search tracks..." bind:value={query}/><button type="button" onclick={refresh}>↻ REFRESH</button></div>
    {#if filtered.length}
      <div class="run-list">
        {#each filtered as run, i}
          <article class="run-card">
            <div class="run-main"><span class="run-index">{String(i + 1).padStart(2, '0')}</span><div><strong>{run.songName}</strong><small>{run.difficulty} · {new Date(run.playedAt).toLocaleString()}</small></div></div>
            <div class="run-stats"><strong>{run.score.toLocaleString()}</strong><small>{run.accuracy.toFixed(2)}% · {run.grade}</small></div>
            <button type="button" class="play" disabled={!run.songId || !run.replayEvents?.length} onclick={() => onPlay(run)}>{run.replayEvents?.length ? '▶ PLAY' : 'NO INPUT DATA'}</button>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty"><strong>No replays yet.</strong><span>Play a song and your run will appear here automatically.</span></div>
    {/if}
    <p class="storage-note">Replays are saved in this browser only. Clearing site data will remove them.</p>
  </main>
</div>

<style>
  .replays-shell{min-height:100svh;background:radial-gradient(ellipse at 20% 25%,rgba(124,58,237,.13),transparent 45%),#080910;color:#f4f4f8;padding:0 clamp(18px,6vw,90px)}
  header{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08)}
  .brand{font-size:21px;font-weight:950;letter-spacing:-1.2px;color:#fff;text-decoration:none}.brand span,h1 span{color:#a78bfa}
  header button,.toolbar button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);border-radius:7px;color:#aaaaba;padding:10px 13px;font-size:9px;font-weight:850;letter-spacing:1px}
  main{width:min(900px,100%);margin:65px auto}.eyebrow{color:#a78bfa;font-size:10px;font-weight:900;letter-spacing:2px}h1{font-size:clamp(42px,7vw,64px);letter-spacing:-3px;margin:10px 0}.intro{max-width:600px;color:#9293a6;font-size:13px;line-height:1.7}
  .toolbar{display:flex;gap:10px;margin:28px 0 14px}.toolbar input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:#11111d;color:#fff;padding:11px 13px;font-size:11px;outline:none}
  .run-list{display:grid;gap:8px}.run-card{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:22px;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.025)}
  .run-main{display:flex;align-items:center;gap:14px;min-width:0}.run-index{color:#77788b;font:700 10px ui-monospace,monospace}.run-main div,.run-stats{display:grid;gap:5px}.run-main strong{font-size:12px}.run-main small,.run-stats small{color:#85869a;font-size:9px}.run-stats{text-align:right}.run-stats strong{font:800 13px ui-monospace,monospace;color:#c4b5fd}
  .play{border:0;border-radius:6px;padding:10px 13px;background:#a78bfa;color:#100b20;font-size:9px;font-weight:950;white-space:nowrap}.play:disabled{opacity:.3;cursor:not-allowed}
  .empty{display:grid;gap:8px;place-items:center;padding:70px 20px;border:1px dashed rgba(255,255,255,.13);border-radius:10px;color:#85869a;text-align:center;font-size:11px}.empty strong{color:#ddd;font-size:16px}
  .storage-note{margin-top:18px;color:#626375;font-size:9px}
  @media(max-width:620px){main{margin:42px auto}.run-card{grid-template-columns:1fr auto;gap:12px}.run-stats{display:none}.play{grid-column:1/-1;width:100%}}
</style>
