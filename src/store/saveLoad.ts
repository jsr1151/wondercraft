import type { GameState, SerializableGameState, SerializablePlanetState, PlanetState, Element, MasterRecipe } from '../types';

const SAVE_KEY = 'wondercraft_save_v1';
const BACKUP_SAVE_KEY = 'wondercraft_save_v1_backup';
const ELEMENT_REGISTRY_KEY = 'wondercraft_custom_elements_registry';
const RECIPE_REGISTRY_KEY = 'wondercraft_custom_recipes_registry';

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

function mergeUnique<T>(left: T[] = [], right: T[] = [], key: (value: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of right) merged.set(key(item), item);
  for (const item of left) merged.set(key(item), item);
  return Array.from(merged.values());
}

function mergeStringArrays(left: string[] = [], right: string[] = []): string[] {
  return Array.from(new Set([...right, ...left]));
}

function mergeRecord<T>(left: Record<string, T> = {}, right: Record<string, T> = {}): Record<string, T> {
  return { ...right, ...left };
}

function chooseRicherSave(
  primary: Partial<SerializableGameState> | null,
  backup: Partial<SerializableGameState> | null,
): Partial<SerializableGameState> | null {
  if (!primary) return backup;
  if (!backup) return primary;
  return countDiscoveredEntries(primary) >= countDiscoveredEntries(backup) ? primary : backup;
}

function mergeSaves(
  primary: Partial<SerializableGameState> | null,
  backup: Partial<SerializableGameState> | null,
): Partial<SerializableGameState> | null {
  const base = chooseRicherSave(primary, backup);
  if (!base) return null;
  const other = base === primary ? backup : primary;
  if (!other) return base;

  return {
    ...other,
    ...base,
    planets: base.planets ?? other.planets,
    activePlanetIndex: base.activePlanetIndex ?? other.activePlanetIndex,
    profile: base.profile ?? other.profile,
    discoveredElements: mergeStringArrays(base.discoveredElements, other.discoveredElements),
    recentDiscoveries: mergeStringArrays(base.recentDiscoveries, other.recentDiscoveries),
    eventLog: [...(other.eventLog ?? []), ...(base.eventLog ?? [])].slice(-400),
    attemptedCombinations: mergeStringArrays(base.attemptedCombinations, other.attemptedCombinations),
    favoriteElementIds: mergeStringArrays(base.favoriteElementIds, other.favoriteElementIds),
    masterRecipes: mergeUnique(base.masterRecipes, other.masterRecipes, (recipe) => [recipe.inputA, recipe.inputB].sort().join('|')),
    customElements: mergeUnique(base.customElements, other.customElements, (element) => element.id),
    iconOverrides: mergeRecord(base.iconOverrides, other.iconOverrides),
    nameOverrides: mergeRecord(base.nameOverrides, other.nameOverrides),
    descriptionOverrides: mergeRecord(base.descriptionOverrides, other.descriptionOverrides),
    categoryOverrides: mergeRecord(base.categoryOverrides, other.categoryOverrides),
    actsAsOverrides: mergeRecord(base.actsAsOverrides, other.actsAsOverrides),
    effectOverrides: mergeRecord(base.effectOverrides, other.effectOverrides),
  };
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
    const merged = mergeSaves(primary, backup);
    if (!merged) return null;

    if (primary && backup) {
      const primaryCount = countDiscoveredEntries(primary);
      const backupCount = countDiscoveredEntries(backup);
      if (backupCount >= primaryCount + 50 && primaryCount <= Math.floor(backupCount * 0.6)) {
        console.warn('Primary Wondercraft save looks truncated; merged with richer backup data.');
      }
    }

    return merged;
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

// ---------------------------------------------------------------------------
// Independent registry: append-only backup of custom elements and recipes.
// Even if the main save is lost or corrupted, the registry preserves all
// custom data the player ever created.
// ---------------------------------------------------------------------------

/** Merge new custom elements into the registry (append-only, never shrinks). */
export function updateElementRegistry(elements: Element[]): void {
  try {
    const existing = loadElementRegistry();
    const map = new Map(existing.map((el) => [el.id, el]));
    for (const el of elements) map.set(el.id, el);
    localStorage.setItem(ELEMENT_REGISTRY_KEY, JSON.stringify(Array.from(map.values())));
  } catch { /* best effort */ }
}

/** Load the custom element registry. */
export function loadElementRegistry(): Element[] {
  try {
    const raw = localStorage.getItem(ELEMENT_REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Element[];
  } catch {
    return [];
  }
}

/** Merge new master recipes into the registry (append-only, never shrinks). */
export function updateRecipeRegistry(recipes: MasterRecipe[]): void {
  try {
    const existing = loadRecipeRegistry();
    const map = new Map(existing.map((r) => [[r.inputA, r.inputB].sort().join('|'), r]));
    for (const r of recipes) map.set([r.inputA, r.inputB].sort().join('|'), r);
    localStorage.setItem(RECIPE_REGISTRY_KEY, JSON.stringify(Array.from(map.values())));
  } catch { /* best effort */ }
}

/** Load the recipe registry. */
export function loadRecipeRegistry(): MasterRecipe[] {
  try {
    const raw = localStorage.getItem(RECIPE_REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MasterRecipe[];
  } catch {
    return [];
  }
}
