import React, { createContext, useReducer, useEffect } from 'react';
import type { GameState, GameAction, Recipe, WorldEffectMap } from '../types';
import { ELEMENTS } from '../data/elements';
import { RECIPES } from '../data/recipes';
import { findRecipe } from '../engine/recipeEngine';
import { calculateWorldInfluence, DEFAULT_WORLD_INFLUENCE } from '../engine/worldInfluence';
import { generateHint } from '../engine/hintEngine';
import { resolveActsAsElementId } from '../engine/actingAs';
import { getAvailableElementIdSet, getAvailableElements } from '../utils/elementAvailability';
import { saveGame, loadGame } from './saveLoad';
import { fetchGlobalRecipes } from './globalRecipes';

const PRIMORDIAL_ELEMENTS = ['fire', 'water', 'earth', 'air'];

function allRecipes(state: Pick<GameState, 'masterRecipes' | 'sharedRecipes'>): Recipe[] {
  return [...state.masterRecipes, ...state.sharedRecipes, ...RECIPES];
}

function allElements(state: Pick<GameState, 'customElements' | 'masterRecipes' | 'sharedRecipes'>) {
  return getAvailableElements([...ELEMENTS, ...state.customElements], allRecipes(state));
}

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
    sharedRecipes: [],
    customElements: [],
    iconOverrides: {},
    nameOverrides: {},
    descriptionOverrides: {},
    categoryOverrides: {},
    actsAsOverrides: {},
    effectOverrides: {},
    attemptedCombinations: new Set<string>(),
    favoriteElementIds: new Set<string>(),
    hints: ['Click the cosmic orb to begin...'],
    lastCombinationResult: null,
  };
}

function comboKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function recipePairKey(inputA: string, inputB: string): string {
  return [inputA, inputB].sort().join('|');
}

function removeElementIdsFromState(state: GameState, removedIds: Set<string>): GameState {
  if (removedIds.size === 0) return state;

  const discoveredElements = new Set(
    Array.from(state.discoveredElements).filter((id) => !removedIds.has(id))
  );

  const attemptedCombinations = new Set(
    Array.from(state.attemptedCombinations).filter((key) => {
      const [a, b] = key.split('|');
      return !removedIds.has(a) && !removedIds.has(b);
    })
  );

  return {
    ...state,
    discoveredElements,
    favoriteElementIds: new Set(
      Array.from(state.favoriteElementIds).filter((id) => !removedIds.has(id))
    ),
    attemptedCombinations,
    recentDiscoveries: state.recentDiscoveries.filter((id) => !removedIds.has(id)),
    selectedSlotA: state.selectedSlotA && removedIds.has(state.selectedSlotA) ? null : state.selectedSlotA,
    selectedSlotB: state.selectedSlotB && removedIds.has(state.selectedSlotB) ? null : state.selectedSlotB,
    lastCombinationResult:
      state.lastCombinationResult?.elementId && removedIds.has(state.lastCombinationResult.elementId)
        ? null
        : state.lastCombinationResult,
    worldInfluence: calculateWorldInfluence(Array.from(discoveredElements), allElements(state), state.effectOverrides),
  };
}

function withAvailableElementPool(state: GameState, recipes: Recipe[]): GameState {
  const availableIds = getAvailableElementIdSet(recipes);
  const knownIds = new Set<string>([
    ...ELEMENTS.map((element) => element.id),
    ...state.customElements.map((element) => element.id),
  ]);
  const removedIds = new Set(Array.from(knownIds).filter((id) => !availableIds.has(id)));
  if (removedIds.size === 0) return state;

  const next = removeElementIdsFromState(state, removedIds);
  return {
    ...next,
    customElements: next.customElements.filter((element) => availableIds.has(element.id)),
    worldInfluence: calculateWorldInfluence(Array.from(next.discoveredElements), allElements(next), next.effectOverrides),
  };
}

function migrateLegacyOceanPuddleState(state: GameState): GameState {
  const OCEAN_ID = 'ocean';
  const oceanNameOverride = state.nameOverrides[OCEAN_ID]?.trim();
  const oceanDescOverride = state.descriptionOverrides[OCEAN_ID]?.trim();
  const oceanCategoryOverride = state.categoryOverrides[OCEAN_ID]?.trim();
  const oceanIconOverride = state.iconOverrides[OCEAN_ID]?.trim();
  const oceanEffectsOverride = state.effectOverrides[OCEAN_ID];
  const oceanActsAsOverride = state.actsAsOverrides[OCEAN_ID]?.trim();

  const hasAnyOceanOverride =
    !!oceanNameOverride ||
    !!oceanDescOverride ||
    !!oceanCategoryOverride ||
    !!oceanIconOverride ||
    !!oceanActsAsOverride ||
    !!(oceanEffectsOverride && Object.keys(oceanEffectsOverride).length > 0);

  if (!hasAnyOceanOverride) {
    return state;
  }

  const oceanCore = ELEMENTS.find((element) => element.id === OCEAN_ID);
  if (!oceanCore) {
    return state;
  }

  const overrideName = oceanNameOverride?.toLowerCase();
  const overrideDesc = oceanDescOverride?.toLowerCase();
  const looksLikePuddle =
    overrideName === 'puddle' ||
    overrideName === 'water puddle' ||
    !!overrideDesc?.includes('puddle');

  const existingPuddle = state.customElements.find(
    (element) => element.id === 'custom_puddle' || element.name.trim().toLowerCase() === 'puddle'
  );

  let puddleId = existingPuddle?.id ?? 'custom_puddle';
  if (!existingPuddle) {
    const usedIds = new Set(state.customElements.map((element) => element.id));
    let idx = 2;
    while (usedIds.has(puddleId)) {
      puddleId = `custom_puddle_${idx++}`;
    }
  }

  const hasRecipeForPuddle = state.masterRecipes.some((recipe) => recipe.output === OCEAN_ID);
  const nextCustomElements = existingPuddle
    ? [...state.customElements]
    : [
        ...state.customElements,
        {
          ...oceanCore,
          id: puddleId,
          name: looksLikePuddle ? 'Puddle' : (oceanNameOverride ?? 'Puddle'),
          category: oceanCategoryOverride ?? oceanCore.category,
          description: oceanDescOverride ?? oceanCore.description,
          emoji: oceanIconOverride ?? oceanCore.emoji,
          worldEffects: oceanEffectsOverride ?? oceanCore.worldEffects,
          tags: [...oceanCore.tags, 'legacy-split'],
          discovered: false,
        },
      ];

  const remappedMasterRecipes = looksLikePuddle
    ? state.masterRecipes.map((recipe) =>
        recipe.output === OCEAN_ID ? { ...recipe, output: puddleId } : recipe
      )
    : state.masterRecipes;

  const nextNameOverrides = { ...state.nameOverrides };
  if (!nextNameOverrides[puddleId]) {
    nextNameOverrides[puddleId] = oceanNameOverride ?? 'Puddle';
  }
  delete nextNameOverrides[OCEAN_ID];

  const nextDescriptionOverrides = { ...state.descriptionOverrides };
  if (oceanDescOverride && !nextDescriptionOverrides[puddleId]) {
    nextDescriptionOverrides[puddleId] = oceanDescOverride;
  }
  delete nextDescriptionOverrides[OCEAN_ID];

  const nextCategoryOverrides = { ...state.categoryOverrides };
  if (oceanCategoryOverride && !nextCategoryOverrides[puddleId]) {
    nextCategoryOverrides[puddleId] = oceanCategoryOverride;
  }
  delete nextCategoryOverrides[OCEAN_ID];

  const nextIconOverrides = { ...state.iconOverrides };
  if (oceanIconOverride && !nextIconOverrides[puddleId]) {
    nextIconOverrides[puddleId] = oceanIconOverride;
  }
  delete nextIconOverrides[OCEAN_ID];

  const nextEffectOverrides = { ...state.effectOverrides };
  if (oceanEffectsOverride && !nextEffectOverrides[puddleId]) {
    nextEffectOverrides[puddleId] = oceanEffectsOverride;
  }
  delete nextEffectOverrides[OCEAN_ID];

  const nextActsAsOverrides = { ...state.actsAsOverrides };
  if (oceanActsAsOverride && !nextActsAsOverrides[puddleId]) {
    nextActsAsOverrides[puddleId] = oceanActsAsOverride;
  }
  delete nextActsAsOverrides[OCEAN_ID];

  const discoveredElements = new Set(state.discoveredElements);
  if ((hasRecipeForPuddle || looksLikePuddle) && discoveredElements.has(OCEAN_ID)) {
    discoveredElements.add(puddleId);
  }

  return {
    ...state,
    customElements: nextCustomElements,
    masterRecipes: remappedMasterRecipes,
    discoveredElements,
    nameOverrides: nextNameOverrides,
    descriptionOverrides: nextDescriptionOverrides,
    categoryOverrides: nextCategoryOverrides,
    iconOverrides: nextIconOverrides,
    effectOverrides: nextEffectOverrides,
    actsAsOverrides: nextActsAsOverrides,
    eventLog: [...state.eventLog, '🧩 Migrated legacy Ocean/Puddle state into separate elements.'],
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
      const worldInfluence = calculateWorldInfluence(PRIMORDIAL_ELEMENTS, allElements(state), state.effectOverrides);
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

      const canonicalA = resolveActsAsElementId(selectedSlotA, state.actsAsOverrides);
      const canonicalB = resolveActsAsElementId(selectedSlotB, state.actsAsOverrides);
      const attemptedCombinations = new Set(state.attemptedCombinations);
      attemptedCombinations.add(comboKey(canonicalA, canonicalB));

      const recipes = allRecipes(state);
      const recipe = findRecipe(selectedSlotA, selectedSlotB, recipes, state.actsAsOverrides);
      
      if (!recipe) {
        return { ...state, attemptedCombinations, lastCombinationResult: { success: false } };
      }

      const outputId = recipe.output;
      const alreadyDiscovered = state.discoveredElements.has(outputId);
      const recipeEffects: WorldEffectMap | undefined =
        'outputWorldEffects' in recipe && recipe.outputWorldEffects
          ? (recipe.outputWorldEffects as WorldEffectMap)
          : undefined;
      let nextOverrides = state.effectOverrides;

      if (recipeEffects && Object.keys(recipeEffects).length > 0) {
        nextOverrides = {
          ...state.effectOverrides,
          [outputId]: recipeEffects,
        };
      }
      
      const newDiscovered = new Set(state.discoveredElements);
      newDiscovered.add(outputId);
      
      const newRecent = alreadyDiscovered
        ? state.recentDiscoveries
        : [outputId, ...state.recentDiscoveries].slice(0, 10);
      
      const worldInfluence = calculateWorldInfluence(Array.from(newDiscovered), allElements(state), nextOverrides);
      
      const newEventLog = [...state.eventLog];
      if (!alreadyDiscovered && MAJOR_ELEMENT_EVENTS[outputId]) {
        newEventLog.push(MAJOR_ELEMENT_EVENTS[outputId]);
      }

      const nextState: GameState = {
        ...state,
        discoveredElements: newDiscovered,
        worldInfluence,
        recentDiscoveries: newRecent,
        eventLog: newEventLog,
        effectOverrides: nextOverrides,
        attemptedCombinations,
        selectedSlotA: null,
        selectedSlotB: null,
        lastCombinationResult: { success: true, elementId: outputId, isNew: !alreadyDiscovered },
      };
      return withAvailableElementPool(nextState, recipes);
    }

    case 'ADD_MASTER_RECIPE': {
      const incoming = recipePairKey(action.recipe.inputA, action.recipe.inputB);
      const filtered = state.masterRecipes.filter((recipe) => recipePairKey(recipe.inputA, recipe.inputB) !== incoming);

      const nextState: GameState = {
        ...state,
        masterRecipes: [action.recipe, ...filtered].slice(0, 300),
        eventLog: [...state.eventLog, `🧪 Master recipe added: ${action.recipe.inputA} + ${action.recipe.inputB} -> ${action.recipe.output}`],
      };
      return withAvailableElementPool(nextState, allRecipes(nextState));
    }

    case 'REMOVE_MASTER_RECIPE': {
      const nextState: GameState = {
        ...state,
        masterRecipes: state.masterRecipes.filter((recipe) => recipe.id !== action.recipeId),
      };
      return withAvailableElementPool(nextState, allRecipes(nextState));
    }

    case 'REMOVE_LOCAL_RECIPES_BY_PAIR': {
      const pairSet = new Set(action.pairs);
      if (pairSet.size === 0) return state;

      const keptLocal = state.masterRecipes.filter((recipe) => !pairSet.has(recipePairKey(recipe.inputA, recipe.inputB)));
      const removedCount = state.masterRecipes.length - keptLocal.length;
      if (removedCount === 0) return state;

      const nextState: GameState = {
        ...state,
        masterRecipes: keptLocal,
        eventLog: [...state.eventLog, `☁️ Synced ${removedCount} local recipes to global and removed local duplicates.`],
      };
      return withAvailableElementPool(nextState, allRecipes(nextState));
    }

    case 'SET_SHARED_RECIPES': {
      const nextState: GameState = {
        ...state,
        sharedRecipes: action.recipes,
      };
      return withAvailableElementPool(nextState, allRecipes(nextState));
    }

    case 'UPSERT_CUSTOM_ELEMENT': {
      const index = state.customElements.findIndex((element) => element.id === action.element.id);
      const nextCustomElements = [...state.customElements];
      if (index >= 0) {
        nextCustomElements[index] = action.element;
      } else {
        nextCustomElements.push(action.element);
      }

      return {
        ...state,
        customElements: nextCustomElements,
        worldInfluence: calculateWorldInfluence(Array.from(state.discoveredElements), [...ELEMENTS, ...nextCustomElements], state.effectOverrides),
      };
    }

    case 'SET_ICON_OVERRIDE': {
      return {
        ...state,
        iconOverrides: {
          ...state.iconOverrides,
          [action.elementId]: action.icon,
        },
      };
    }

    case 'CLEAR_ICON_OVERRIDE': {
      const next = { ...state.iconOverrides };
      delete next[action.elementId];
      return {
        ...state,
        iconOverrides: next,
      };
    }

    case 'SET_NAME_OVERRIDE': {
      return {
        ...state,
        nameOverrides: {
          ...state.nameOverrides,
          [action.elementId]: action.name,
        },
      };
    }

    case 'CLEAR_NAME_OVERRIDE': {
      const next = { ...state.nameOverrides };
      delete next[action.elementId];
      return {
        ...state,
        nameOverrides: next,
      };
    }

    case 'SET_DESCRIPTION_OVERRIDE': {
      return {
        ...state,
        descriptionOverrides: {
          ...state.descriptionOverrides,
          [action.elementId]: action.description,
        },
      };
    }

    case 'CLEAR_DESCRIPTION_OVERRIDE': {
      const next = { ...state.descriptionOverrides };
      delete next[action.elementId];
      return {
        ...state,
        descriptionOverrides: next,
      };
    }

    case 'SET_CATEGORY_OVERRIDE': {
      return {
        ...state,
        categoryOverrides: {
          ...state.categoryOverrides,
          [action.elementId]: action.category,
        },
      };
    }

    case 'CLEAR_CATEGORY_OVERRIDE': {
      const next = { ...state.categoryOverrides };
      delete next[action.elementId];
      return {
        ...state,
        categoryOverrides: next,
      };
    }

    case 'SET_ACTS_AS_OVERRIDE': {
      return {
        ...state,
        actsAsOverrides: {
          ...state.actsAsOverrides,
          [action.elementId]: action.actsAsElementId,
        },
      };
    }

    case 'CLEAR_ACTS_AS_OVERRIDE': {
      const next = { ...state.actsAsOverrides };
      delete next[action.elementId];
      return {
        ...state,
        actsAsOverrides: next,
      };
    }

    case 'SET_EFFECT_OVERRIDE': {
      const nextOverrides: Record<string, WorldEffectMap> = {
        ...state.effectOverrides,
        [action.elementId]: action.worldEffects,
      };
      return {
        ...state,
        effectOverrides: nextOverrides,
        worldInfluence: calculateWorldInfluence(Array.from(state.discoveredElements), allElements(state), nextOverrides),
      };
    }

    case 'CLEAR_EFFECT_OVERRIDE': {
      const nextOverrides = { ...state.effectOverrides };
      delete nextOverrides[action.elementId];
      return {
        ...state,
        effectOverrides: nextOverrides,
        worldInfluence: calculateWorldInfluence(Array.from(state.discoveredElements), allElements(state), nextOverrides),
      };
    }

    case 'DELETE_ELEMENT': {
      return removeElementIdsFromState(state, new Set([action.elementId]));
    }

    case 'TOGGLE_FAVORITE': {
      const next = new Set(state.favoriteElementIds);
      if (next.has(action.elementId)) next.delete(action.elementId);
      else next.add(action.elementId);
      return { ...state, favoriteElementIds: next };
    }

    case 'REQUEST_HINT': {
      const hint = generateHint(
        Array.from(state.discoveredElements),
        RECIPES,
        allElements(state)
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
      const customElements = saved.customElements ?? [];
      const loadedOverrides = saved.effectOverrides ?? {};
      const computedInfluence = calculateWorldInfluence(Array.from(discovered), [...ELEMENTS, ...customElements], loadedOverrides);
      const worldInfluence = { ...computedInfluence, ...(saved.worldInfluence ?? {}) };
      const nextState: GameState = {
        ...state,
        seed: saved.seed ?? state.seed,
        bigBangDone: saved.bigBangDone ?? false,
        discoveredElements: discovered,
        worldInfluence,
        recentDiscoveries: saved.recentDiscoveries ?? [],
        eventLog: saved.eventLog ?? [],
        masterRecipes: saved.masterRecipes ?? [],
        customElements,
        sharedRecipes: state.sharedRecipes,
        iconOverrides: saved.iconOverrides ?? {},
        nameOverrides: saved.nameOverrides ?? {},
        descriptionOverrides: saved.descriptionOverrides ?? {},
        categoryOverrides: saved.categoryOverrides ?? {},
        actsAsOverrides: saved.actsAsOverrides ?? {},
        effectOverrides: loadedOverrides,
        attemptedCombinations: new Set(saved.attemptedCombinations ?? []),
        favoriteElementIds: new Set(saved.favoriteElementIds ?? []),
        hints: saved.hints ?? ['Welcome back!'],
        selectedSlotA: null,
        selectedSlotB: null,
        lastCombinationResult: null,
      };
      const migrated = migrateLegacyOceanPuddleState(nextState);
      const stabilized = {
        ...migrated,
        worldInfluence: calculateWorldInfluence(Array.from(migrated.discoveredElements), allElements(migrated), migrated.effectOverrides),
      };
      return withAvailableElementPool(stabilized, allRecipes(stabilized));
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
    fetchGlobalRecipes()
      .then((recipes) => dispatch({ type: 'SET_SHARED_RECIPES', recipes }))
      .catch(() => {
        // Keep the game playable if the global recipe feed is unavailable.
      });
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
