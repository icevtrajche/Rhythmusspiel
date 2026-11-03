import type { LaneIndex } from './types';

export interface GameplaySettings {
  scrollSpeed: number;
  timingOffsetMs: number;
  clickVolume: number;
  keyBindings: Record<LaneIndex, string>;
}

export const DEFAULT_SETTINGS: GameplaySettings = {
  scrollSpeed: 600,
  timingOffsetMs: 0,
  clickVolume: 0.15,
  keyBindings: { 0: 'd', 1: 'f', 2: 'j', 3: 'k' },
};

const STORAGE_KEY = 'beatdrop-settings';

export function loadSettings(): GameplaySettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_SETTINGS.keyBindings } };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<GameplaySettings> | null;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      scrollSpeed: clamp(Number(saved?.scrollSpeed ?? DEFAULT_SETTINGS.scrollSpeed), 300, 1000),
      timingOffsetMs: clamp(Number(saved?.timingOffsetMs ?? 0), -150, 150),
      clickVolume: clamp(Number(saved?.clickVolume ?? DEFAULT_SETTINGS.clickVolume), 0, 0.5),
      keyBindings: { ...DEFAULT_SETTINGS.keyBindings, ...saved?.keyBindings },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_SETTINGS.keyBindings } };
  }
}

export function saveSettings(settings: GameplaySettings): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
