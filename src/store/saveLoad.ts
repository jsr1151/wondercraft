import type { GameState, SerializableGameState } from '../types';

const SAVE_KEY = 'wondercraft_save_v1';

function serializeState(state: GameState): SerializableGameState {
  return {
    seed: state.seed,
    bigBangDone: state.bigBangDone,
    discoveredElements: Array.from(state.discoveredElements),
    worldInfluence: state.worldInfluence,
    recentDiscoveries: state.recentDiscoveries,
    eventLog: state.eventLog,
    masterRecipes: state.masterRecipes,
    customElements: state.customElements,
    iconOverrides: state.iconOverrides,
    nameOverrides: state.nameOverrides,
    descriptionOverrides: state.descriptionOverrides,
    effectOverrides: state.effectOverrides,
    attemptedCombinations: Array.from(state.attemptedCombinations),
    hints: state.hints,
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
