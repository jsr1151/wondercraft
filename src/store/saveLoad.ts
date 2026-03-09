import type { GameState, SerializableGameState, SerializablePlanetState, PlanetState } from '../types';

const SAVE_KEY = 'wondercraft_save_v1';
const BACKUP_SAVE_KEY = 'wondercraft_save_v1_backup';

export interface SaveDiagnostics {
  key: 'primary' | 'backup';
  discoveredCount: number;
  planetCount: number;
  customElementCount: number;
  recipeCount: number;
}

function countDiscoveredEntries(state: Partial<SerializableGameState> | null): number {
  if (!state) return 0;
  if (state.planets && state.planets.length > 0) {
    return state.planets.reduce((sum, planet) => sum + (planet.discoveredElements?.length ?? 0), 0);
  }
  return state.discoveredElements?.length ?? 0;
}

function parseSave(data: string | null): Partial<SerializableGameState> | null {
  if (!data) return null;
  return JSON.parse(data) as SerializableGameState;
}

function summarizeSave(
  key: 'primary' | 'backup',
  state: Partial<SerializableGameState> | null,
): SaveDiagnostics | null {
  if (!state) return null;
  return {
    key,
    discoveredCount: countDiscoveredEntries(state),
    planetCount: state.planets?.length ?? 1,
    customElementCount: state.customElements?.length ?? 0,
    recipeCount: state.masterRecipes?.length ?? 0,
  };
}

function serializePlanet(planet: PlanetState): SerializablePlanetState {
  return {
    name: planet.name,
    seed: planet.seed,
    createdAt: planet.createdAt,
    bigBangDone: planet.bigBangDone,
    discoveredElements: Array.from(planet.discoveredElements),
    worldInfluence: planet.worldInfluence,
    recentDiscoveries: planet.recentDiscoveries,
    eventLog: planet.eventLog,
    attemptedCombinations: Array.from(planet.attemptedCombinations),
    favoriteElementIds: Array.from(planet.favoriteElementIds),
    insight: planet.insight,
    hints: planet.hints,
    destroyed: planet.destroyed,
  };
}

function serializeState(state: GameState): SerializableGameState {
  const activePlanet = state.planets[state.activePlanetIndex];
  return {
    // Multi-planet fields
    planets: state.planets.map(serializePlanet),
    activePlanetIndex: state.activePlanetIndex,
    profile: state.profile,
    // Legacy fields (from active planet, for backward compat)
    seed: activePlanet.seed,
    bigBangDone: activePlanet.bigBangDone,
    discoveredElements: Array.from(activePlanet.discoveredElements),
    worldInfluence: activePlanet.worldInfluence,
    recentDiscoveries: activePlanet.recentDiscoveries,
    eventLog: activePlanet.eventLog,
    // Global fields
    masterRecipes: state.masterRecipes,
    customElements: state.customElements,
    iconOverrides: state.iconOverrides,
    nameOverrides: state.nameOverrides,
    descriptionOverrides: state.descriptionOverrides,
    categoryOverrides: state.categoryOverrides,
    actsAsOverrides: state.actsAsOverrides,
    effectOverrides: state.effectOverrides,
    // Legacy fields (from active planet)
    attemptedCombinations: Array.from(activePlanet.attemptedCombinations),
    favoriteElementIds: Array.from(activePlanet.favoriteElementIds),
    insight: state.insight,
    hints: activePlanet.hints,
  };
}

export function saveGame(state: GameState): void {
  try {
    const nextSerialized = JSON.stringify(serializeState(state));
    const previousSerialized = localStorage.getItem(SAVE_KEY);
    if (previousSerialized && previousSerialized !== nextSerialized) {
      localStorage.setItem(BACKUP_SAVE_KEY, previousSerialized);
    }
    localStorage.setItem(SAVE_KEY, nextSerialized);
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame(): Partial<SerializableGameState> | null {
  try {
    const primary = parseSave(localStorage.getItem(SAVE_KEY));
    const backup = parseSave(localStorage.getItem(BACKUP_SAVE_KEY));
    if (!primary) return backup;
    if (!backup) return primary;

    const primaryCount = countDiscoveredEntries(primary);
    const backupCount = countDiscoveredEntries(backup);

    if (backupCount >= primaryCount + 50 && primaryCount <= Math.floor(backupCount * 0.6)) {
      console.warn('Primary Wondercraft save looks truncated; loading backup save instead.');
      return backup;
    }

    return primary;
  } catch (e) {
    console.warn('Failed to load game:', e);
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BACKUP_SAVE_KEY);
}

export function getSaveDiagnostics(): SaveDiagnostics[] {
  try {
    const primary = summarizeSave('primary', parseSave(localStorage.getItem(SAVE_KEY)));
    const backup = summarizeSave('backup', parseSave(localStorage.getItem(BACKUP_SAVE_KEY)));
    return [primary, backup].filter((entry): entry is SaveDiagnostics => entry !== null);
  } catch {
    return [];
  }
}

export function restoreSaveSnapshot(key: 'primary' | 'backup'): boolean {
  try {
    const sourceKey = key === 'primary' ? SAVE_KEY : BACKUP_SAVE_KEY;
    const data = localStorage.getItem(sourceKey);
    if (!data) return false;
    const current = localStorage.getItem(SAVE_KEY);
    if (current && current !== data) {
      localStorage.setItem(BACKUP_SAVE_KEY, current);
    }
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}
