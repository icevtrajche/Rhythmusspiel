import type { SongDefinition, Chart, LaneIndex, ChartNote } from './types';

function generateChart(
  bpm: number,
  noteCount: number,
  maxGap: number,
  holdChance: number = 0,
): Chart {
  const beatMs = 60_000 / bpm;

  let seed = 0x1d2a4f6c;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const notes: ChartNote[] = [];
  let time = beatMs * 4;
  let lastLane = -1;

  for (let i = 0; i < noteCount; i++) {
    let lane: LaneIndex;
    do {
      lane = Math.floor(rand() * 4) as LaneIndex;
    } while (lane === lastLane && rand() > 0.3);
    lastLane = lane;

    // Decide if this note is a hold note
    if (holdChance > 0 && rand() < holdChance && i < noteCount - 2) {
      // Hold duration: 1-2 beats
      const holdBeats = 1 + Math.floor(rand() * 2);
      const holdMs = Math.round(beatMs * holdBeats);
      notes.push({ timeMs: Math.round(time), lane, holdMs });
      // Skip ahead past the hold
      time += beatMs * (holdBeats + 0.5);
    } else {
      notes.push({ timeMs: Math.round(time), lane });
      const gap = Math.max(0.5, 1 - rand() * maxGap);
      time += beatMs * gap;
    }
  }

  return { name: '', bpm, notes };
}

export const SONGS: SongDefinition[] = [
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    artist: 'Synthwave Engine',
    charts: {
      Easy: generateChart(100, 32, 0.4, 0.1),
      Normal: generateChart(120, 45, 0.6, 0.15),
      Hard: generateChart(140, 60, 0.75, 0.22),
    },
  },
  {
    id: 'crystal-vision',
    name: 'Crystal Vision',
    artist: 'Chiptune Orchestra',
    charts: {
      Easy: generateChart(90, 28, 0.35, 0.1),
      Normal: generateChart(115, 40, 0.55, 0.18),
      Hard: generateChart(150, 55, 0.7, 0.25),
    },
  },
  {
    id: 'midnight-drive',
    name: 'Midnight Drive',
    artist: 'Bass Theory',
    charts: {
      Easy: generateChart(110, 35, 0.4, 0.12),
      Normal: generateChart(130, 50, 0.6, 0.2),
      Hard: generateChart(160, 65, 0.78, 0.28),
    },
  },
];

export function findSong(id: string): SongDefinition | undefined {
  return SONGS.find((s) => s.id === id);
}
