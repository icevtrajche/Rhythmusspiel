export type ModId = 'easy' | 'hard-rock' | 'perfect' | 'mirror' | 'random' | 'half-time' | 'double-time';

export interface ModDefinition {
  id: ModId;
  label: string;
  description: string;
  category: 'difficulty' | 'transform';
}

export const MODS: ModDefinition[] = [
  { id: 'easy', label: 'Easy', description: 'Wider timing windows for a more relaxed run.', category: 'difficulty' },
  { id: 'hard-rock', label: 'Hard Rock', description: 'Tighter timing windows for a tougher challenge.', category: 'difficulty' },
  { id: 'perfect', label: 'Perfect', description: 'Only Perfect hits count. Any lower judgement becomes a miss.', category: 'difficulty' },
  { id: 'mirror', label: 'Mirror', description: 'Reverse the lane order.', category: 'transform' },
  { id: 'random', label: 'Random', description: 'Apply a deterministic random lane permutation.', category: 'transform' },
  { id: 'half-time', label: 'Half Time', description: 'Play the chart at 75% speed.', category: 'transform' },
  { id: 'double-time', label: 'Double Time', description: 'Play the chart at 150% speed.', category: 'transform' },
];

export function normalizeMods(input: ModId[]): ModId[] {
  const unique = [...new Set(input)];
  if (unique.includes('easy')) return unique.filter((id) => id !== 'hard-rock' && id !== 'perfect');
  if (unique.includes('hard-rock')) return unique.filter((id) => id !== 'easy');
  if (unique.includes('perfect')) return unique.filter((id) => id !== 'easy');
  if (unique.includes('half-time')) return unique.filter((id) => id !== 'double-time');
  return unique;
}

export function transformChart<T extends { bpm: number; notes: { timeMs: number; lane: number; holdMs?: number }[] }>(
  chart: T,
  mods: ModId[],
  seedText: string,
): T {
  const speed = mods.includes('double-time') ? 1.5 : mods.includes('half-time') ? 0.75 : 1;
  let seed = [...seedText].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const permutation = [0, 1, 2, 3];
  if (mods.includes('random')) {
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
  }
  return {
    ...chart,
    bpm: chart.bpm * speed,
    notes: chart.notes.map((note) => ({
      ...note,
      timeMs: note.timeMs / speed,
      holdMs: note.holdMs === undefined ? undefined : note.holdMs / speed,
      lane: (mods.includes('mirror') ? 3 - note.lane : mods.includes('random') ? permutation[note.lane] : note.lane) as typeof note.lane,
    })),
  };
}
