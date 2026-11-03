import { generateChart } from './chartGenerator';
import type { SongDefinition } from './types';

export const SONGS: SongDefinition[] = [
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    artist: 'Synthwave Engine',
    charts: {
      Easy: generateChart(100, 'Easy', 101),
      Normal: generateChart(120, 'Normal', 102),
      Hard: generateChart(140, 'Hard', 103),
    },
  },
  {
    id: 'crystal-vision',
    name: 'Crystal Vision',
    artist: 'Chiptune Orchestra',
    charts: {
      Easy: generateChart(90, 'Easy', 201),
      Normal: generateChart(115, 'Normal', 202),
      Hard: generateChart(150, 'Hard', 203),
    },
  },
  {
    id: 'midnight-drive',
    name: 'Midnight Drive',
    artist: 'Bass Theory',
    charts: {
      Easy: generateChart(110, 'Easy', 301),
      Normal: generateChart(130, 'Normal', 302),
      Hard: generateChart(160, 'Hard', 303),
    },
  },
];

export function findSong(id: string): SongDefinition | undefined {
  return SONGS.find((s) => s.id === id);
}
