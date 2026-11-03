import type { ResultsData } from './types';

export interface StoredRun extends ResultsData {
  playedAt: string;
}

export interface StatsSummary {
  totalPlays: number;
  bestScore: number;
  bestAccuracy: number;
  fullCombos: number;
}

const STORAGE_KEY = 'beatdrop-runs';
const MAX_SAVED_RUNS = 500;

export function loadRuns(): StoredRun[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_RUNS) as StoredRun[] : [];
  } catch {
    return [];
  }
}

export function recordRun(result: ResultsData): { personalBest: boolean; bestScore: number } {
  const runs = loadRuns();
  const previousBest = runs
    .filter((run) => run.songName === result.songName && run.difficulty === result.difficulty)
    .reduce((best, run) => Math.max(best, run.score), 0);
  const personalBest = result.score > previousBest;
  const saved: StoredRun = { ...result, playedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...runs].slice(0, MAX_SAVED_RUNS)));
  return { personalBest, bestScore: Math.max(previousBest, result.score) };
}

export function getStatsSummary(): StatsSummary {
  const runs = loadRuns();
  return {
    totalPlays: runs.length,
    bestScore: runs.reduce((best, run) => Math.max(best, run.score), 0),
    bestAccuracy: runs.reduce((best, run) => Math.max(best, run.accuracy), 0),
    fullCombos: runs.filter((run) => run.fullCombo).length,
  };
}
