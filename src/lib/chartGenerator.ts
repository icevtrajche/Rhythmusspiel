import type { Chart, ChartNote, LaneIndex, SongDefinition } from './types';

export type Difficulty = keyof SongDefinition['charts'];

type Rng = () => number;

interface Hit {
  step: number;
  lane: number;
  holdSteps: number;
}

interface Pattern {
  name: string;
  /** Complexity; a section only uses patterns at or below its level cap. */
  level: number;
  /** Lowest difficulty rank (0 Easy, 1 Normal, 2 Hard) that may use this pattern. */
  minRank: number;
  /** Length in sixteenth-note steps. Always a multiple of 4 so patterns start on beats. */
  len: number;
  build: (rng: Rng, s: number, out: Hit[]) => void;
}

const STEPS_PER_BEAT = 4;
const MEASURE_STEPS = 16;
const INTRO_STEPS = 16;

const DIFF_RANK: Record<Difficulty, number> = { Easy: 0, Normal: 1, Hard: 2 };
const DIFF_LEVEL_CAP = [3, 4, 5];

const SECTIONS: { measures: number; cap: number }[] = [
  { measures: 4, cap: 2 },
  { measures: 4, cap: 3 },
  { measures: 2, cap: 4 },
  { measures: 4, cap: 5 },
  { measures: 4, cap: 2 },
  { measures: 2, cap: 4 },
  { measures: 4, cap: 5 },
];

const LANES = [0, 1, 2, 3];
const JUMP_PAIRS: [number, number][] = [
  [0, 3],
  [1, 2],
  [0, 2],
  [1, 3],
  [0, 1],
  [2, 3],
];
const ALT_PAIRS: [number, number][] = [
  [0, 3],
  [1, 2],
  [0, 2],
  [1, 3],
];

function createRng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function laneNot(rng: Rng, ...avoid: number[]): number {
  return pick(
    rng,
    LANES.filter((l) => !avoid.includes(l)),
  );
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function addTap(out: Hit[], step: number, lane: number): void {
  out.push({ step, lane, holdSteps: 0 });
}

function addHold(out: Hit[], step: number, lane: number, holdSteps: number): void {
  out.push({ step, lane, holdSteps });
}

const PATTERNS: Pattern[] = [
  {
    name: 'eighths',
    level: 1,
    minRank: 0,
    len: 8,
    build(rng, s, out) {
      let prev = -1;
      for (let i = 0; i < 8; i += 2) {
        const lane = laneNot(rng, prev);
        addTap(out, s + i, lane);
        prev = lane;
      }
    },
  },
  {
    name: 'holdShort',
    level: 2,
    minRank: 0,
    len: 8,
    build(rng, s, out) {
      const hold = laneNot(rng);
      addHold(out, s, hold, 4);
      addTap(out, s + 4, laneNot(rng, hold));
      addTap(out, s + 6, laneNot(rng, hold));
    },
  },
  {
    name: 'jumpPairs',
    level: 2,
    minRank: 0,
    len: 8,
    build(rng, s, out) {
      const [a, b] = pick(rng, JUMP_PAIRS);
      addTap(out, s, a);
      addTap(out, s, b);
      addTap(out, s + 2, laneNot(rng));
      const [c, d] = pick(rng, JUMP_PAIRS);
      addTap(out, s + 4, c);
      addTap(out, s + 4, d);
      addTap(out, s + 6, laneNot(rng));
    },
  },
  {
    name: 'alternate',
    level: 2,
    minRank: 0,
    len: 8,
    build(rng, s, out) {
      const pair = pick(rng, ALT_PAIRS);
      for (let i = 0; i < 4; i++) addTap(out, s + i * 2, pair[i % 2]);
    },
  },
  {
    name: 'alternateFast',
    level: 3,
    minRank: 1,
    len: 8,
    build(rng, s, out) {
      const pair = pick(rng, ALT_PAIRS);
      for (let i = 0; i < 8; i++) addTap(out, s + i, pair[i % 2]);
    },
  },
  {
    name: 'staircase',
    level: 3,
    minRank: 1,
    len: 8,
    build(rng, s, out) {
      let pos = Math.floor(rng() * 4);
      let dir = rng() < 0.5 ? 1 : -1;
      for (let i = 0; i < 8; i++) {
        addTap(out, s + i, pos);
        if (pos + dir < 0 || pos + dir > 3) dir = -dir;
        pos += dir;
      }
    },
  },
  {
    name: 'holdTap',
    level: 3,
    minRank: 1,
    len: 12,
    build(rng, s, out) {
      const hold = laneNot(rng);
      addHold(out, s, hold, 8);
      let prev = -1;
      for (const off of [2, 4, 6, 8]) {
        const lane = laneNot(rng, hold, prev);
        addTap(out, s + off, lane);
        prev = lane;
      }
    },
  },
  {
    name: 'burst',
    level: 4,
    minRank: 1,
    len: 8,
    build(rng, s, out) {
      for (let i = 0; i < 8; i++) {
        if (i !== 0 && rng() >= 0.6) continue;
        if (rng() < 0.3) {
          const [a, b] = pick(rng, JUMP_PAIRS);
          addTap(out, s + i, a);
          addTap(out, s + i, b);
        } else {
          addTap(out, s + i, laneNot(rng));
        }
      }
    },
  },
  {
    name: 'doubleHold',
    level: 4,
    minRank: 1,
    len: 12,
    build(rng, s, out) {
      const [a, b] = pick(rng, JUMP_PAIRS);
      addHold(out, s, a, 8);
      addHold(out, s, b, 8);
      const free = LANES.filter((l) => l !== a && l !== b);
      [2, 4, 6, 8].forEach((off, i) => addTap(out, s + off, free[i % 2]));
    },
  },
  {
    name: 'roll',
    level: 4,
    minRank: 2,
    len: 8,
    build(rng, s, out) {
      const lane = laneNot(rng);
      for (let i = 0; i < 6; i++) addTap(out, s + i, lane);
    },
  },
  {
    name: 'jumpStream',
    level: 4,
    minRank: 2,
    len: 8,
    build(rng, s, out) {
      for (const off of [0, 2, 4, 6]) {
        const [a, b] = pick(rng, JUMP_PAIRS);
        addTap(out, s + off, a);
        addTap(out, s + off, b);
      }
    },
  },
  {
    name: 'holdCross',
    level: 5,
    minRank: 2,
    len: 12,
    build(rng, s, out) {
      const [a, b, c, d] = shuffle(rng, LANES);
      addHold(out, s, a, 6);
      addHold(out, s + 2, b, 6);
      addTap(out, s + 4, c);
      addTap(out, s + 6, d);
      addTap(out, s + 8, a);
      addTap(out, s + 10, c);
    },
  },
];

function gapAfter(rng: Rng, rank: number): number {
  const chance = rank === 0 ? 0.6 : rank === 1 ? 0.35 : 0.2;
  return rng() < chance ? STEPS_PER_BEAT : 0;
}

export function generateChart(bpm: number, difficulty: Difficulty, seed: number): Chart {
  const rng = createRng(seed);
  const rank = DIFF_RANK[difficulty];
  const stepMs = 60_000 / bpm / STEPS_PER_BEAT;
  const hits: Hit[] = [];

  let cursor = 0;
  let prevName = '';
  for (const section of SECTIONS) {
    const end = cursor + section.measures * MEASURE_STEPS;
    const cap = Math.min(section.cap, DIFF_LEVEL_CAP[rank]);
    const eligible = PATTERNS.filter((p) => p.level <= cap && p.minRank <= rank);

    while (cursor < end) {
      const fits = eligible.filter((p) => p.len <= end - cursor);
      if (fits.length === 0) break;
      const others = fits.filter((p) => p.name !== prevName);
      const pat = pick(rng, others.length > 0 ? others : fits);
      pat.build(rng, cursor, hits);
      prevName = pat.name;
      cursor += pat.len + gapAfter(rng, rank);
    }
    cursor = end;
  }

  const notes: ChartNote[] = hits
    .map((h): ChartNote => ({
      timeMs: Math.round((INTRO_STEPS + h.step) * stepMs),
      lane: h.lane as LaneIndex,
      ...(h.holdSteps > 0 ? { holdMs: Math.round(h.holdSteps * stepMs) } : {}),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);

  return { name: '', bpm, notes };
}
