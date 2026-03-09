import type { GameState, SerializableGameState, SerializablePlanetState, PlanetState } from '../types';

const SAVE_KEY = 'wondercraft_save_v1';

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
    insight: activePlanet.insight,
    hints: activePlanet.hints,
  };
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState(state)));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame(): Partial<SerializableGameState> | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data) as SerializableGameState;
  } catch (e) {
    console.warn('Failed to load game:', e);
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
