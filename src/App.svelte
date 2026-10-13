<script lang="ts">
  import StartScreen from './lib/StartScreen.svelte';
  import ChartPlayer from './lib/ChartPlayer.svelte';
  import ResultsScreen from './lib/ResultsScreen.svelte';
  import { findSong } from './lib/songs';
  import type { GameState, ResultsData, SongDefinition } from './lib/types';

  let gameState = $state<GameState>('menu');
  let currentSongId = $state('');
  let currentDifficulty = $state<keyof SongDefinition['charts']>('Normal');
  let results = $state<ResultsData | null>(null);

  function handlePlay(
    songId: string,
    difficulty: keyof SongDefinition['charts'],
  ) {
    currentSongId = songId;
    currentDifficulty = difficulty;
    gameState = 'playing';
  }

  function handleEnd(r: ResultsData) {
    results = r;
    gameState = 'results';
  }

  function handleReplay() {
    results = null;
    gameState = 'playing';
  }

  function handleMenu() {
    results = null;
    gameState = 'menu';
  }

  function handleQuit() {
    gameState = 'menu';
  }

  const currentSong = $derived(findSong(currentSongId));
</script>

<main>
  {#if gameState === 'menu'}
    <StartScreen onPlay={handlePlay} />
  {:else if gameState === 'playing' && currentSong}
    <ChartPlayer
      song={currentSong}
      difficulty={currentDifficulty}
      onEnd={handleEnd}
      onQuit={handleQuit}
    />
  {:else if gameState === 'results' && results}
    <ResultsScreen
      results={results}
      onReplay={handleReplay}
      onMenu={handleMenu}
    />
  {/if}
</main>
