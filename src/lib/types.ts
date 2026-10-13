export type GameState = 'menu' | 'playing' | 'results';

export type LaneIndex = 0 | 1 | 2 | 3;

export interface ChartNote {
  timeMs: number;
  lane: LaneIndex;
  /** Duration in ms. 0 = tap note. >0 = hold/slider note. */
  holdMs?: number;
}

export interface Chart {
  name: string;
  bpm: number;
  notes: ChartNote[];
}

export interface SongDefinition {
  id: string;
  name: string;
  artist: string;
  charts: {
    Easy: Chart;
    Normal: Chart;
    Hard: Chart;
  };
}

export type JudgementName = 'perfect' | 'great' | 'good' | 'miss';

export interface JudgementResult {
  name: JudgementName;
  deltaMs: number;
  lane: LaneIndex;
}

export interface JudgementWindows {
  perfect: number; // ±30ms
  great: number; // ±70ms
  good: number; // ±120ms
}

export const JUDGEMENT_WINDOWS: JudgementWindows = {
  perfect: 30,
  great: 70,
  good: 120,
};

export const JUDGEMENT_SCORES: Record<JudgementName, number> = {
  perfect: 300,
  great: 200,
  good: 100,
  miss: 0,
};

export const JUDGEMENT_DISPLAY: Record<JudgementName, string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

export const KEY_BINDINGS: Record<LaneIndex, string> = {
  0: 'd',
  1: 'f',
  2: 'j',
  3: 'k',
};

export const MAX_SCORE = 1_000_000;

export interface ResultsData {
  songName: string;
  difficulty: keyof SongDefinition['charts'];
  score: number;
  maxScore: number;
  accuracy: number;
  maxCombo: number;
  counts: Record<JudgementName, number>;
  grade: string;
  fullCombo: boolean;
}

export const KEY_LANES: Record<string, LaneIndex> = {
  d: 0,
  f: 1,
  j: 2,
  k: 3,
};

export const LANE_KEYS = ['D', 'F', 'J', 'K'];

export const LANE_ARROWS = ['◀', '▼', '▲', '▶'];

export const LANE_ARROW_NAMES = ['Left', 'Down', 'Up', 'Right'];

export const NOTES_PER_SONG = 52;
