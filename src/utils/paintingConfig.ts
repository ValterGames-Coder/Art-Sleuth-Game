import type { GameData } from '../types/game';

const STORAGE_PREFIX = 'art-sleuth.config';

function getStorageKey(paintingId: string) {
  return `${STORAGE_PREFIX}.${paintingId}`;
}

export function savePaintingConfig(data: GameData) {
  if (!data.painting.id) return;
  localStorage.setItem(getStorageKey(data.painting.id), JSON.stringify(data));
}

export function loadPaintingConfig(paintingId: string) {
  const raw = localStorage.getItem(getStorageKey(paintingId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameData;
  } catch {
    return null;
  }
}
