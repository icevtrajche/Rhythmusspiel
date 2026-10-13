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

  const difficulties: (keyof SongDefinition['charts'])[] = [
    'Easy',
    'Normal',
    'Hard',
  ];

  function getChart(
    song: SongDefinition,
    diff: keyof SongDefinition['charts'],
  ) {
    return song.charts[diff];
  }

  function handlePlay() {
    onPlay(selectedSong, selectedDifficulty);
  }
</script>

<div class="menu-container">
  <div class="menu-header">
    <h1>BEAT<span class="accent">DROP</span></h1>
    <p class="subtitle">A 4-lane rhythm game</p>
  </div>

  <div class="menu-body">
    <div class="section">
      <h2>Choose a Track</h2>
      <div class="song-list">
        {#each SONGS as song (song.id)}
          <button
            type="button"
            class="song-card"
            class:selected={selectedSong === song.id}
            onclick={() => (selectedSong = song.id)}
          >
            <div class="song-info">
              <span class="song-name">{song.name}</span>
              <span class="song-artist">{song.artist}</span>
            </div>
            <div class="song-meta">
              <span class="bpm">{getChart(song, selectedDifficulty).bpm} BPM</span>
              <span class="note-count">{getChart(song, selectedDifficulty).notes.length} notes</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div class="section">
      <h2>Difficulty</h2>
      <div class="diff-row">
        {#each difficulties as diff}
          <button
            type="button"
            class="diff-btn {diff.toLowerCase()}"
            class:selected={selectedDifficulty === diff}
            onclick={() => (selectedDifficulty = diff)}
          >
            {diff}
          </button>
        {/each}
      </div>
    </div>

    <div class="controls-hint">
      <h2>Controls</h2>
      <div class="keys-display">
        <div class="key-group">
          <kbd>D</kbd>
          <span class="arrow-icon">{LANE_ARROWS[0]}</span>
          <span class="arrow-name">{LANE_ARROW_NAMES[0]}</span>
        </div>
        <div class="key-group">
          <kbd>F</kbd>
          <span class="arrow-icon">{LANE_ARROWS[1]}</span>
          <span class="arrow-name">{LANE_ARROW_NAMES[1]}</span>
        </div>
        <div class="key-group">
          <kbd>J</kbd>
          <span class="arrow-icon">{LANE_ARROWS[2]}</span>
          <span class="arrow-name">{LANE_ARROW_NAMES[2]}</span>
        </div>
        <div class="key-group">
          <kbd>K</kbd>
          <span class="arrow-icon">{LANE_ARROWS[3]}</span>
          <span class="arrow-name">{LANE_ARROW_NAMES[3]}</span>
        </div>
      </div>
      <p>Press the keys as notes reach the hit line. Hold for slider notes!</p>
    </div>

    <button type="button" class="play-btn" onclick={handlePlay}>
      ▶ Play
    </button>
  </div>
</div>
