import React, { createContext, useReducer, useEffect } from 'react';
import type { GameState, GameAction } from '../types';
import { ELEMENTS } from '../data/elements';
import { RECIPES } from '../data/recipes';
import { findRecipe } from '../engine/recipeEngine';
import { calculateWorldInfluence, DEFAULT_WORLD_INFLUENCE } from '../engine/worldInfluence';
import { generateHint } from '../engine/hintEngine';
import { saveGame, loadGame } from './saveLoad';

const PRIMORDIAL_ELEMENTS = ['fire', 'water', 'earth', 'air'];

function createInitialState(): GameState {
  const seed = Math.floor(Math.random() * 0xffffffff);
  return {
    seed,
    bigBangDone: false,
    discoveredElements: new Set<string>(),
    worldInfluence: { ...DEFAULT_WORLD_INFLUENCE },
    recentDiscoveries: [],
    eventLog: [],
    selectedSlotA: null,
    selectedSlotB: null,
    masterRecipes: [],
    hints: ['Click the cosmic orb to begin...'],
    lastCombinationResult: null,
  };
}

const MAJOR_ELEMENT_EVENTS: Record<string, string> = {
  life: '✨ Life emerged from the primordial soup!',
  human: '👤 Humans have appeared on the world!',
  city: '🏙️ A great city has risen!',
  computer: '💻 The age of computing has begun!',
  internet: '🌐 The world is now connected!',
  singularity: '🌀 The Singularity has been reached!',
  cosmos: '🔮 You have discovered the Cosmos!',
  void: '🌑 The Void has been touched...',
  magic: '✨ Magic has entered the world!',
  factory: '🏭 The Industrial Age begins!',
  pollution: '💀 Pollution spreads across the land...',
  galaxy: '🌌 A galaxy forms in the cosmos!',
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BIG_BANG': {
      const discovered = new Set(PRIMORDIAL_ELEMENTS);
      const worldInfluence = calculateWorldInfluence(PRIMORDIAL_ELEMENTS, ELEMENTS);
      return {
        ...state,
        bigBangDone: true,
        discoveredElements: discovered,
        worldInfluence,
        recentDiscoveries: [...PRIMORDIAL_ELEMENTS],
        eventLog: ['🌌 The Big Bang! The universe springs into existence!', '🔥💧🟫💨 The primordial elements emerge: Fire, Water, Earth, Air'],
        hints: ['Combine two elements to discover new ones!'],
      };
    }

    case 'SELECT_SLOT_A':
      return { ...state, selectedSlotA: action.elementId, lastCombinationResult: null };

    case 'SELECT_SLOT_B':
      return { ...state, selectedSlotB: action.elementId, lastCombinationResult: null };

    case 'TRY_COMBINE': {
      const { selectedSlotA, selectedSlotB } = state;
      if (!selectedSlotA || !selectedSlotB) {
        return { ...state, lastCombinationResult: { success: false } };
      }

      const allRecipes = [...state.masterRecipes, ...RECIPES];
      const recipe = findRecipe(selectedSlotA, selectedSlotB, allRecipes);
      
      if (!recipe) {
        return { ...state, lastCombinationResult: { success: false } };
      }

      const outputId = recipe.output;
      const alreadyDiscovered = state.discoveredElements.has(outputId);
      
      const newDiscovered = new Set(state.discoveredElements);
      newDiscovered.add(outputId);
      
      const newRecent = alreadyDiscovered
        ? state.recentDiscoveries
        : [outputId, ...state.recentDiscoveries].slice(0, 10);
      
      const worldInfluence = calculateWorldInfluence(Array.from(newDiscovered), ELEMENTS);
      
      const newEventLog = [...state.eventLog];
      if (!alreadyDiscovered && MAJOR_ELEMENT_EVENTS[outputId]) {
        newEventLog.push(MAJOR_ELEMENT_EVENTS[outputId]);
      }

      return {
        ...state,
        discoveredElements: newDiscovered,
        worldInfluence,
        recentDiscoveries: newRecent,
        eventLog: newEventLog,
        selectedSlotA: null,
        selectedSlotB: null,
        lastCombinationResult: { success: true, elementId: outputId, isNew: !alreadyDiscovered },
      };
    }

    case 'ADD_MASTER_RECIPE': {
      const normalizePair = (a: string, b: string) => [a, b].sort().join('|');
      const incoming = normalizePair(action.recipe.inputA, action.recipe.inputB);
      const filtered = state.masterRecipes.filter((recipe) => normalizePair(recipe.inputA, recipe.inputB) !== incoming);

      return {
        ...state,
        masterRecipes: [action.recipe, ...filtered].slice(0, 300),
        eventLog: [...state.eventLog, `🧪 Master recipe added: ${action.recipe.inputA} + ${action.recipe.inputB} -> ${action.recipe.output}`],
      };
    }

    case 'REMOVE_MASTER_RECIPE': {
      return {
        ...state,
        masterRecipes: state.masterRecipes.filter((recipe) => recipe.id !== action.recipeId),
      };
    }

    case 'REQUEST_HINT': {
      const hint = generateHint(
        Array.from(state.discoveredElements),
        RECIPES,
        ELEMENTS
      );
      return { ...state, hints: [hint, ...state.hints].slice(0, 5) };
    }

    case 'RESET_WORLD': {
      return createInitialState();
    }

    case 'LOAD_STATE': {
      const saved = action.state;
      if (!saved) return state;
      const discovered = new Set<string>(saved.discoveredElements ?? []);
      const worldInfluence = saved.worldInfluence ?? calculateWorldInfluence(Array.from(discovered), ELEMENTS);
      return {
        ...state,
        seed: saved.seed ?? state.seed,
        bigBangDone: saved.bigBangDone ?? false,
        discoveredElements: discovered,
        worldInfluence,
        recentDiscoveries: saved.recentDiscoveries ?? [],
        eventLog: saved.eventLog ?? [],
        masterRecipes: saved.masterRecipes ?? [],
        hints: saved.hints ?? ['Welcome back!'],
        selectedSlotA: null,
        selectedSlotB: null,
        lastCombinationResult: null,
      };
    }

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: 'LOAD_STATE', state: saved });
    }
  }, []);

  useEffect(() => {
    if (state.bigBangDone) {
      saveGame(state);
    }
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}
