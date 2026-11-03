<script lang="ts">
  import StartScreen from './lib/StartScreen.svelte';
  import ChartPlayer from './lib/ChartPlayer.svelte';
  import ResultsScreen from './lib/ResultsScreen.svelte';
  import TutorialScreen from './lib/TutorialScreen.svelte';
  import ReplaysScreen from './lib/ReplaysScreen.svelte';
  import { findSong } from './lib/songs';
  import type { GameState, ResultsData, SongDefinition } from './lib/types';
  import { loadSettings, type GameplaySettings } from './lib/settings';
  import { recordRun } from './lib/stats';
  import type { ModId } from './lib/mods';
  import type { StoredRun } from './lib/stats';
  import type { ReplayEvent } from './lib/types';

  let gameState = $state<GameState>('menu');
  let currentSongId = $state('');
  let currentDifficulty = $state<keyof SongDefinition['charts']>('Normal');
  let results = $state<ResultsData | null>(null);
  let currentSettings = $state<GameplaySettings>(loadSettings());
  let currentMods = $state<ModId[]>([]);
  let currentReplay = $state<ReplayEvent[] | undefined>(undefined);

  function handlePlay(
    songId: string,
    difficulty: keyof SongDefinition['charts'],
    settings: GameplaySettings,
    mods: ModId[],
  ) {
    currentSettings = settings;
    currentMods = mods;
    currentReplay = undefined;
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

  function handleReplays() {\n    gameState = 'replays';\n  }\n\n  function handleReplayRun(run: StoredRun) {\n    currentSongId = run.songId;\n    currentDifficulty = run.difficulty;\n    currentMods = (run.mods ?? []) as ModId[];\n    currentReplay = run.replayEvents ?? [];\n    gameState = 'playing';\n  }\n\n  function handleTutorial() {
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
    <StartScreen onPlay={handlePlay} onTutorial={handleTutorial} onReplays={handleReplays} />
  {:else if gameState === 'playing' && currentSong}
    <ChartPlayer
      song={currentSong}
      difficulty={currentDifficulty}
      settings={currentSettings}
      mods={currentMods}
      replayEvents={currentReplay}
      onEnd={handleEnd}
      onQuit={handleQuit}
    />
  {:else if gameState === 'replays'}\n    <ReplaysScreen onBack={handleMenu} onPlay={handleReplayRun} />\n  {:else if gameState === 'tutorial'}
    <TutorialScreen onBack={handleMenu} />
  {:else if gameState === 'results' && results}
    <ResultsScreen
      results={results}
      onReplay={handleReplay}
      onMenu={handleMenu}
    />
  {/if}
</main>
