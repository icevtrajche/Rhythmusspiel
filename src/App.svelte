<script lang="ts">
  import StartScreen from './lib/StartScreen.svelte';
  import ChartPlayer from './lib/ChartPlayer.svelte';
  import ResultsScreen from './lib/ResultsScreen.svelte';
  import TutorialScreen from './lib/TutorialScreen.svelte';
  import { findSong } from './lib/songs';
  import type { GameState, ResultsData, SongDefinition } from './lib/types';
  import { loadSettings, type GameplaySettings } from './lib/settings';
  import { recordRun } from './lib/stats';
  import type { ModId } from './lib/mods';

  let gameState = $state<GameState>('menu');
  let currentSongId = $state('');
  let currentDifficulty = $state<keyof SongDefinition['charts']>('Normal');
  let results = $state<ResultsData | null>(null);
  let currentSettings = $state<GameplaySettings>(loadSettings());
  let currentMods = $state<ModId[]>([]);

  function handlePlay(
    songId: string,
    difficulty: keyof SongDefinition['charts'],
    settings: GameplaySettings,
    mods: ModId[],
  ) {
    currentSettings = settings;
    currentMods = mods;
    currentSongId = songId;
    currentDifficulty = difficulty;
    gameState = 'playing';
  }

  function handleEnd(r: ResultsData) {
    const personal = recordRun(r);
    results = { ...r, personalBest: personal.personalBest, bestScore: personal.bestScore };
    gameState = 'results';
  }

  function handleReplay() {
    results = null;
    gameState = 'playing';
  }

  function handleTutorial() {
    gameState = 'tutorial';
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
    <StartScreen onPlay={handlePlay} onTutorial={handleTutorial} />
  {:else if gameState === 'playing' && currentSong}
    <ChartPlayer
      song={currentSong}
      difficulty={currentDifficulty}
      settings={currentSettings}
      mods={currentMods}
      onEnd={handleEnd}
      onQuit={handleQuit}
    />
  {:else if gameState === 'tutorial'}
    <TutorialScreen onBack={handleMenu} />
  {:else if gameState === 'results' && results}
    <ResultsScreen
      results={results}
      onReplay={handleReplay}
      onMenu={handleMenu}
    />
  {/if}
</main>
