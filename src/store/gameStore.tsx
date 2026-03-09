import React, { createContext, useReducer, useEffect } from 'react';
import type {
  GameState,
  GameAction,
  Recipe,
  WorldEffectMap,
  Element,
  InsightType,
  InsightCurrency,
  PlanetState,
  PlanetStartMode,
  Quest,
  ProfileState,
  SerializableGameState,
} from '../types';
import { ELEMENTS } from '../data/elements';
import { RECIPES } from '../data/recipes';
import { findRecipe } from '../engine/recipeEngine';
import { calculateWorldInfluence, DEFAULT_WORLD_INFLUENCE } from '../engine/worldInfluence';
import { generateHint } from '../engine/hintEngine';
import { resolveActsAsElementId } from '../engine/actingAs';
import {
  EMPTY_INSIGHT,
  INSIGHT_LABELS,
  calculateInsightGainPerSecond,
  applyInsightTick,
  countDiscoveredByInsightType,
  getElementInsightType,
  getHintInsightCost,
  getRandomDiscoveryInsightCost,
} from '../engine/insightEngine';
import { getAvailableElementIdSet, getAvailableElements } from '../utils/elementAvailability';
import { saveGame, loadGame } from './saveLoad';
import { fetchGlobalRecipes } from './globalRecipes';

const PRIMORDIAL_ELEMENTS = ['fire', 'water', 'earth', 'air'];
const RECOVERY_FLAG = 'wondercraft_recovery_v3_done';

const DESTRUCTIVE_ELEMENT_IDS = new Set([
  'nuke', 'nuclear_bomb', 'antimatter', 'black_hole', 'supernova',
  'asteroid', 'meteor', 'doomsday', 'apocalypse', 'gamma_ray_burst',
]);

const DEFAULT_PROFILE: ProfileState = {
  xp: 0,
  completedQuestIds: [],
  activeQuestId: null,
  discoveredRecipeKeys: [],
  completedMilestoneIds: [],
};

const MULTI_PLANET_TECH_THRESHOLD = 25;
const PLANET_CREATION_INSIGHT_TYPE: InsightType = 'cosmic';

function getPlanetCreationInsightCost(livePlanetCount: number): number {
  return 25 + Math.max(0, livePlanetCount - 1) * 15;
}

/** XP needed to reach a given level (1-indexed). */
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getProfileLevel(xp: number): number {
  let level = 1;
  let needed = xpForLevel(level);
  while (xp >= needed) {
    xp -= needed;
    level++;
    needed = xpForLevel(level);
  }
  return level;
}

const PROFILE_TITLES: Record<number, string> = {
  1: 'Dabbler',
  3: 'Apprentice',
  5: 'Alchemist',
  8: 'Sage',
  12: 'World Shaper',
  16: 'Cosmos Architect',
  20: 'Omniscient',
};

function getProfileTitle(level: number): string {
  let title = 'Dabbler';
  for (const [lvl, t] of Object.entries(PROFILE_TITLES)) {
    if (level >= Number(lvl)) title = t;
  }
  return title;
}

const PLANET_MILESTONES = [
  {
    id: 'verdant_world',
    title: 'Verdant World',
    xp: 25,
    check: (state: GameState) => activePlanet(state).worldInfluence.vegetation >= 25,
  },
  {
    id: 'city_state',
    title: 'City State',
    xp: 25,
    check: (state: GameState) => activePlanet(state).worldInfluence.civilization >= 25,
  },
  {
    id: 'advanced_age',
    title: 'Advanced Age',
    xp: 25,
    check: (state: GameState) => activePlanet(state).worldInfluence.technology >= 25,
  },
  {
    id: 'multiplanet_founder',
    title: 'Multi-Planet Founder',
    xp: 40,
    check: (state: GameState) => state.planets.filter((planet) => !planet.destroyed).length >= 2,
  },
  {
    id: 'stellar_network',
    title: 'Stellar Network',
    xp: 100,
    check: (state: GameState) => state.planets.filter((planet) => !planet.destroyed).length >= 5,
  },
] as const;

// ---- Quest Definitions ----

const QUESTS: Quest[] = [
  // Discovery quests
  {
    id: 'discover_25',
    title: 'Curious Mind',
    description: 'Discover 25 elements on a single planet.',
    type: 'discovery',
    xpReward: 50,
    badge: '🔍',
    check: { kind: 'total_discoveries', count: 25 },
  },
  {
    id: 'discover_50',
    title: 'Prolific Explorer',
    description: 'Discover 50 elements on a single planet.',
    type: 'discovery',
    xpReward: 120,
    badge: '🧭',
    check: { kind: 'total_discoveries', count: 50 },
  },
  {
    id: 'discover_100',
    title: 'Master Alchemist',
    description: 'Discover 100 elements on a single planet.',
    type: 'discovery',
    xpReward: 300,
    badge: '⚗️',
    check: { kind: 'total_discoveries', count: 100 },
  },
  {
    id: 'discover_200',
    title: 'Encyclopedist',
    description: 'Discover 200 elements on a single planet.',
    type: 'discovery',
    xpReward: 600,
    badge: '📚',
    check: { kind: 'total_discoveries', count: 200 },
  },
  // Planet quests
  {
    id: 'green_world',
    title: 'Garden World',
    description: 'Create a planet with vegetation influence above 50.',
    type: 'planet',
    xpReward: 100,
    badge: '🌿',
    check: { kind: 'planet_influence', field: 'vegetation', min: 50 },
  },
  {
    id: 'polluted_world',
    title: 'Industrial Wasteland',
    description: 'Create a planet with pollution influence above 40.',
    type: 'planet',
    xpReward: 80,
    badge: '🏭',
    check: { kind: 'planet_influence', field: 'pollution', min: 40 },
  },
  {
    id: 'tech_world',
    title: 'Digital Frontier',
    description: 'Create a planet with technology influence above 50.',
    type: 'planet',
    xpReward: 120,
    badge: '💻',
    check: { kind: 'planet_influence', field: 'technology', min: 50 },
  },
  {
    id: 'magic_world',
    title: 'Enchanted Realm',
    description: 'Create a planet with magic influence above 30.',
    type: 'planet',
    xpReward: 150,
    badge: '✨',
    check: { kind: 'planet_influence', field: 'magic', min: 30 },
  },
  // Civilization quests
  {
    id: 'founded_city',
    title: 'City Founder',
    description: 'Discover the City element.',
    type: 'civilization',
    xpReward: 60,
    badge: '🏙️',
    check: { kind: 'discover_all', elementIds: ['city'] },
  },
  {
    id: 'build_kingdom',
    title: 'Kingdom Builder',
    description: 'Discover Kingdom and Castle.',
    type: 'civilization',
    xpReward: 100,
    badge: '👑',
    check: { kind: 'discover_all', elementIds: ['kingdom', 'castle'] },
  },
  // Multi-planet quests
  {
    id: 'two_planets',
    title: 'Colonizer',
    description: 'Own 2 or more planets.',
    type: 'planet',
    xpReward: 200,
    badge: '🪐',
    check: { kind: 'planet_count', min: 2 },
  },
  {
    id: 'five_planets',
    title: 'Solar Architect',
    description: 'Own 5 or more planets.',
    type: 'planet',
    xpReward: 500,
    badge: '☀️',
    check: { kind: 'planet_count', min: 5 },
  },
  // Chaos quests
  {
    id: 'destroy_a_planet',
    title: 'World Breaker',
    description: 'Destroy a planet.',
    type: 'chaos',
    xpReward: 250,
    badge: '💥',
    check: { kind: 'destroy_planet' },
  },
];

function isQuestComplete(quest: Quest, state: GameState): boolean {
  const planet = activePlanet(state);
  const c = quest.check;
  switch (c.kind) {
    case 'discover_all':
      return c.elementIds.every((id) => planet.discoveredElements.has(id));
    case 'discover_count': {
      const elems = allElements(state);
      let count = 0;
      for (const el of elems) {
        if (planet.discoveredElements.has(el.id) && (el.category === c.category || (state.categoryOverrides[el.id] ?? '') === c.category)) count++;
      }
      return count >= c.count;
    }
    case 'planet_influence':
      return (planet.worldInfluence[c.field] ?? 0) >= c.min;
    case 'planet_count':
      return state.planets.filter((p) => !p.destroyed).length >= c.min;
    case 'destroy_planet':
      return state.planets.some((p) => p.destroyed);
    case 'total_discoveries':
      return planet.discoveredElements.size >= c.count;
  }
}

function checkAndCompleteQuests(state: GameState): GameState {
  const { profile } = state;
  if (!profile.activeQuestId) return state;
  const quest = QUESTS.find((q) => q.id === profile.activeQuestId);
  if (!quest) return state;
  if (profile.completedQuestIds.includes(quest.id)) return state;
  if (!isQuestComplete(quest, state)) return state;

  const planet = activePlanet(state);
  return updateActivePlanet({
    ...state,
    profile: {
      ...profile,
      xp: profile.xp + quest.xpReward,
      completedQuestIds: [...profile.completedQuestIds, quest.id],
      activeQuestId: null,
    },
  }, {
    eventLog: [
      ...planet.eventLog,
      `🏆 Quest complete: ${quest.title}! +${quest.xpReward} XP${quest.badge ? ' ' + quest.badge : ''}`,
    ],
  });
}

function awardPlanetMilestones(state: GameState): GameState {
  const unlocked = PLANET_MILESTONES.filter(
    (milestone) =>
      !state.profile.completedMilestoneIds.includes(milestone.id) && milestone.check(state)
  );
  if (unlocked.length === 0) return state;

  const planet = activePlanet(state);
  return updateActivePlanet(
    {
      ...state,
      profile: {
        ...state.profile,
        xp: state.profile.xp + unlocked.reduce((sum, milestone) => sum + milestone.xp, 0),
        completedMilestoneIds: [
          ...state.profile.completedMilestoneIds,
          ...unlocked.map((milestone) => milestone.id),
        ],
      },
    },
    {
      eventLog: [
        ...planet.eventLog,
        ...unlocked.map(
          (milestone) => `⭐ Milestone reached: ${milestone.title}! +${milestone.xp} XP`
        ),
      ],
    }
  );
}

function normalizeProfile(profile?: Partial<ProfileState>): ProfileState {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    completedQuestIds: profile?.completedQuestIds ?? [],
    discoveredRecipeKeys: profile?.discoveredRecipeKeys ?? [],
    completedMilestoneIds: profile?.completedMilestoneIds ?? [],
    activeQuestId: profile?.activeQuestId ?? null,
  };
}

function addInsight(a: InsightCurrency, b: InsightCurrency): InsightCurrency {
  return {
    nature: a.nature + b.nature,
    life: a.life + b.life,
    civilization: a.civilization + b.civilization,
    technology: a.technology + b.technology,
    cosmic: a.cosmic + b.cosmic,
    materials: a.materials + b.materials,
    weird: a.weird + b.weird,
    warfare: a.warfare + b.warfare,
  };
}

function getSavedGlobalInsight(saved: Partial<SerializableGameState>): InsightCurrency {
  if (saved.planets && saved.planets.length > 0) {
    return saved.planets.reduce(
      (sum, planet) => addInsight(sum, planet.insight ?? EMPTY_INSIGHT),
      { ...EMPTY_INSIGHT }
    );
  }
  return saved.insight ?? { ...EMPTY_INSIGHT };
}

function allRecipes(state: Pick<GameState, 'masterRecipes' | 'sharedRecipes'>): Recipe[] {
  return [...state.masterRecipes, ...state.sharedRecipes, ...RECIPES];
}

function allElements(state: Pick<GameState, 'customElements' | 'masterRecipes' | 'sharedRecipes'>) {
  return getAvailableElements([...ELEMENTS, ...state.customElements], allRecipes(state));
}

function createInitialPlanet(name: string = 'Genesis'): PlanetState {
  const seed = Math.floor(Math.random() * 0xffffffff);
  return {
    name,
    seed,
    createdAt: Date.now(),
    bigBangDone: false,
    discoveredElements: new Set<string>(),
    worldInfluence: { ...DEFAULT_WORLD_INFLUENCE },
    recentDiscoveries: [],
    eventLog: [],
    selectedSlotA: null,
    selectedSlotB: null,
    attemptedCombinations: new Set<string>(),
    favoriteElementIds: new Set<string>(),
    insight: { ...EMPTY_INSIGHT },
    hints: ['Click the cosmic orb to begin...'],
    lastCombinationResult: null,
    destroyed: false,
  };
}

/** Derive the flat convenience fields on GameState from the active planet. */
function withActivePlanetFields(state: GameState): GameState {
  const planet = state.planets[state.activePlanetIndex];
  return {
    ...state,
    seed: planet.seed,
    bigBangDone: planet.bigBangDone,
    discoveredElements: planet.discoveredElements,
    worldInfluence: planet.worldInfluence,
    recentDiscoveries: planet.recentDiscoveries,
    eventLog: planet.eventLog,
    selectedSlotA: planet.selectedSlotA,
    selectedSlotB: planet.selectedSlotB,
    attemptedCombinations: planet.attemptedCombinations,
    favoriteElementIds: planet.favoriteElementIds,
    hints: planet.hints,
    lastCombinationResult: planet.lastCombinationResult,
  };
}

/** Update the active planet in the planets array and re-derive convenience fields. */
function updateActivePlanet(state: GameState, update: Partial<PlanetState>): GameState {
  const planets = [...state.planets];
  planets[state.activePlanetIndex] = { ...planets[state.activePlanetIndex], ...update };
  return withActivePlanetFields({ ...state, planets });
}

/** Get the active planet. */
function activePlanet(state: GameState): PlanetState {
  return state.planets[state.activePlanetIndex];
}

function createInitialState(): GameState {
  const planet = createInitialPlanet();
  return withActivePlanetFields({
    planets: [planet],
    activePlanetIndex: 0,
    masterRecipes: [],
    sharedRecipes: [],
    customElements: [],
    iconOverrides: {},
    nameOverrides: {},
    descriptionOverrides: {},
    categoryOverrides: {},
    actsAsOverrides: {},
    effectOverrides: {},
    profile: { ...DEFAULT_PROFILE },
    insight: { ...EMPTY_INSIGHT },
    // These will be filled by withActivePlanetFields
    seed: planet.seed,
    bigBangDone: false,
    discoveredElements: new Set(),
    worldInfluence: { ...DEFAULT_WORLD_INFLUENCE },
    recentDiscoveries: [],
    eventLog: [],
    selectedSlotA: null,
    selectedSlotB: null,
    attemptedCombinations: new Set(),
    favoriteElementIds: new Set(),
    hints: [],
    lastCombinationResult: null,
  });
}

/** Check whether multi-planet is unlocked (has Rocket/Spaceship + Planet + tech threshold). */
function isMultiPlanetUnlocked(state: GameState): boolean {
  const disc = activePlanet(state).discoveredElements;
  const hasLaunchVehicle = disc.has('rocket') || disc.has('spaceship') || disc.has('spacecraft') || disc.has('space_shuttle');
  const hasPlanet = disc.has('planet') || disc.has('mars') || disc.has('jupiter') || disc.has('venus');
  const hasTechThreshold = activePlanet(state).worldInfluence.technology >= MULTI_PLANET_TECH_THRESHOLD;
  return hasLaunchVehicle && hasPlanet && hasTechThreshold;
}

function createNewPlanet(
  state: GameState,
  name: string,
  mode: PlanetStartMode,
  customElementIds?: string[],
): PlanetState {
  const planet = createInitialPlanet(name);
  // Start with Big Bang already done
  let discovered: Set<string>;
  if (mode === 'all') {
    discovered = new Set(activePlanet(state).discoveredElements);
  } else if (mode === 'custom' && customElementIds) {
    discovered = new Set([...PRIMORDIAL_ELEMENTS, ...customElementIds]);
  } else {
    // basic4
    discovered = new Set(PRIMORDIAL_ELEMENTS);
  }

  const worldInfluence = calculateWorldInfluence(
    Array.from(discovered),
    allElements(state),
    state.effectOverrides,
  );

  return {
    ...planet,
    bigBangDone: true,
    discoveredElements: discovered,
    worldInfluence,
    recentDiscoveries: [...PRIMORDIAL_ELEMENTS],
    eventLog: [`🌌 A new planet "${name}" has formed!`],
    hints: ['Explore this new world by combining elements!'],
  };
}

function comboKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function recipePairKey(inputA: string, inputB: string): string {
  return [inputA, inputB].sort().join('|');
}

function getUndiscoveredElementsByInsightType(state: GameState, insightType: InsightType): Element[] {
  const planet = activePlanet(state);
  return allElements(state).filter((element) => {
    if (planet.discoveredElements.has(element.id)) return false;
    return getElementInsightType(element, state.categoryOverrides) === insightType;
  });
}

function discoverElementInState(state: GameState, elementId: string): GameState {
  const planet = activePlanet(state);
  if (planet.discoveredElements.has(elementId)) return state;
  const discoveredElements = new Set(planet.discoveredElements);
  discoveredElements.add(elementId);

  const worldInfluence = calculateWorldInfluence(
    Array.from(discoveredElements),
    allElements(state),
    state.effectOverrides
  );

  const eventLog = [...planet.eventLog];
  if (MAJOR_ELEMENT_EVENTS[elementId]) {
    eventLog.push(MAJOR_ELEMENT_EVENTS[elementId]);
  }

  // Award XP for new discoveries
  const xpGain = 5;
  const nextState = {
    ...state,
    profile: { ...state.profile, xp: state.profile.xp + xpGain },
  };

  return checkAndCompleteQuests(
    awardPlanetMilestones(
      updateActivePlanet(nextState, {
        discoveredElements,
        worldInfluence,
        recentDiscoveries: [elementId, ...planet.recentDiscoveries].slice(0, 10),
        eventLog,
      })
    )
  );
}

function spendInsight(
  insight: GameState['insight'],
  insightType: InsightType,
  amount: number
): GameState['insight'] {
  return {
    ...insight,
    [insightType]: Math.max(0, insight[insightType] - amount),
  };
}

function buildCategoryHintText(
  state: GameState,
  insightType: InsightType,
  target: Element,
  recipes: Recipe[]
): string {
  const discovered = activePlanet(state).discoveredElements;
  const profileLevel = getProfileLevel(state.profile.xp);
  const elementMap = new Map(allElements(state).map((element) => [element.id, element]));
  const targetRecipes = recipes.filter((recipe) => recipe.output === target.id);

  if (targetRecipes.length === 0) {
    return `${INSIGHT_LABELS[insightType]} insight points toward ${target.name}, but no recipe hint is available yet.`;
  }

  const chosen = targetRecipes[Math.floor(Math.random() * targetRecipes.length)];
  const a = elementMap.get(chosen.inputA);
  const b = elementMap.get(chosen.inputB);
  const aKnown = discovered.has(chosen.inputA);
  const bKnown = discovered.has(chosen.inputB);

  if (a && b && aKnown && !bKnown) {
    const bType = getElementInsightType(b, state.categoryOverrides);
    if (profileLevel >= 8) {
      return `Insight hint: ${target.name} comes from ${a.name} and ${b.name}.`;
    }
    if (profileLevel >= 5) {
      return `Insight hint: ${target.name} pairs ${a.name} with something from ${bType ? INSIGHT_LABELS[bType] : b.category}.`;
    }
    return `Insight hint: try combining ${a.name} with something from ${bType ? INSIGHT_LABELS[bType] : b.category}.`;
  }

  if (a && b && bKnown && !aKnown) {
    const aType = getElementInsightType(a, state.categoryOverrides);
    if (profileLevel >= 8) {
      return `Insight hint: ${target.name} comes from ${a.name} and ${b.name}.`;
    }
    if (profileLevel >= 5) {
      return `Insight hint: ${target.name} pairs ${b.name} with something from ${aType ? INSIGHT_LABELS[aType] : a.category}.`;
    }
    return `Insight hint: try combining ${b.name} with something from ${aType ? INSIGHT_LABELS[aType] : a.category}.`;
  }

  if (a && b && aKnown && bKnown) {
    if (profileLevel >= 8) {
      return `Insight hint: combine ${a.name} with ${b.name} to reach ${target.name}.`;
    }
    const reveal = Math.random() < 0.5 ? a.name : b.name;
    return `Insight hint: this ${INSIGHT_LABELS[insightType]} discovery involves ${reveal}.`;
  }

  if (a && b) {
    const aType = getElementInsightType(a, state.categoryOverrides);
    const bType = getElementInsightType(b, state.categoryOverrides);
    return `Insight hint: experiment where ${aType ? INSIGHT_LABELS[aType] : a.category} meets ${bType ? INSIGHT_LABELS[bType] : b.category}.`;
  }

  return `Insight hint: ${target.name} can be reached from known combinations in ${INSIGHT_LABELS[insightType]}.`;
}

function requestInsightHintForType(state: GameState, insightType: InsightType): GameState {
  const planet = activePlanet(state);
  const candidates = getUndiscoveredElementsByInsightType(state, insightType);
  if (candidates.length === 0) {
    return updateActivePlanet(state, {
      hints: [`No undiscovered ${INSIGHT_LABELS[insightType]} elements remain.`, ...planet.hints].slice(0, 5),
    });
  }

  const discoveredCounts = countDiscoveredByInsightType(
    planet.discoveredElements,
    allElements(state),
    state.categoryOverrides
  );
  const cost = getHintInsightCost(discoveredCounts[insightType]);
  if (state.insight[insightType] < cost) {
    return updateActivePlanet(state, {
      hints: [
        `Need ${cost.toFixed(1)} ${INSIGHT_LABELS[insightType]} Insight for a hint.`,
        ...planet.hints,
      ].slice(0, 5),
    });
  }

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const recipes = allRecipes(state);
  const hint = buildCategoryHintText(state, insightType, target, recipes);

  return updateActivePlanet({
    ...state,
    insight: spendInsight(state.insight, insightType, cost),
  }, {
    hints: [hint, ...planet.hints].slice(0, 5),
    eventLog: [
      ...planet.eventLog,
      `💡 Spent ${cost.toFixed(1)} ${INSIGHT_LABELS[insightType]} Insight for a hint.`,
    ],
  });
}

function removeElementIdsFromState(state: GameState, removedIds: Set<string>): GameState {
  if (removedIds.size === 0) return state;

  const planet = activePlanet(state);
  const discoveredElements = new Set(
    Array.from(planet.discoveredElements).filter((id) => !removedIds.has(id))
  );

  const attemptedCombinations = new Set(
    Array.from(planet.attemptedCombinations).filter((key) => {
      const [a, b] = key.split('|');
      return !removedIds.has(a) && !removedIds.has(b);
    })
  );

  return updateActivePlanet(state, {
    discoveredElements,
    favoriteElementIds: new Set(
      Array.from(planet.favoriteElementIds).filter((id) => !removedIds.has(id))
    ),
    attemptedCombinations,
    recentDiscoveries: planet.recentDiscoveries.filter((id) => !removedIds.has(id)),
    selectedSlotA: planet.selectedSlotA && removedIds.has(planet.selectedSlotA) ? null : planet.selectedSlotA,
    selectedSlotB: planet.selectedSlotB && removedIds.has(planet.selectedSlotB) ? null : planet.selectedSlotB,
    lastCombinationResult:
      planet.lastCombinationResult?.elementId && removedIds.has(planet.lastCombinationResult.elementId)
        ? null
        : planet.lastCombinationResult,
    worldInfluence: calculateWorldInfluence(Array.from(discoveredElements), allElements(state), state.effectOverrides),
  });
}

function withAvailableElementPool(state: GameState, recipes: Recipe[]): GameState {
  const availableIds = getAvailableElementIdSet(recipes);

  // Only prune custom elements that have no recipe producing them.
  // Never remove core elements or discovered elements — the availability set
  // can be temporarily incomplete (e.g. sharedRecipes not yet fetched) and
  // pruning discoveredElements would cause permanent data loss once saved.
  const orphanCustom = state.customElements.filter((el) => !availableIds.has(el.id));
  if (orphanCustom.length === 0) return state;

  const removedIds = new Set(orphanCustom.map((el) => el.id));
  const next = removeElementIdsFromState(state, removedIds);
  const nextWithCustom = {
    ...next,
    customElements: next.customElements.filter((el) => !removedIds.has(el.id)),
  };
  const planet = activePlanet(nextWithCustom);
  return updateActivePlanet(nextWithCustom, {
    worldInfluence: calculateWorldInfluence(Array.from(planet.discoveredElements), allElements(nextWithCustom), nextWithCustom.effectOverrides),
  });
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

  const planet = activePlanet(state);
  const discoveredElements = new Set(planet.discoveredElements);
  if ((hasRecipeForPuddle || looksLikePuddle) && discoveredElements.has(OCEAN_ID)) {
    discoveredElements.add(puddleId);
  }

  return updateActivePlanet({
    ...state,
    customElements: nextCustomElements,
    masterRecipes: remappedMasterRecipes,
    nameOverrides: nextNameOverrides,
    descriptionOverrides: nextDescriptionOverrides,
    categoryOverrides: nextCategoryOverrides,
    iconOverrides: nextIconOverrides,
    effectOverrides: nextEffectOverrides,
    actsAsOverrides: nextActsAsOverrides,
  }, {
    discoveredElements,
    eventLog: [...planet.eventLog, '🧩 Migrated legacy Ocean/Puddle state into separate elements.'],
  });
}

/** One-time recovery: re-create custom elements and re-discover everything
 *  that was lost to the availability-pruning bug.
 *  Runs across ALL planets, not just the active one. */
function recoverLostElements(state: GameState): GameState {
  // Only run once per version
  try {
    if (localStorage.getItem(RECOVERY_FLAG)) return state;
  } catch { /* proceed */ }

  if (!activePlanet(state).bigBangDone) return state;

  const existingCustomIds = new Set(state.customElements.map((el) => el.id));
  const newCustom: Element[] = [];
  const allRec = allRecipes(state);

  // Collect every element ID referenced in any recipe
  const recipeElementIds = new Set<string>();
  for (const r of allRec) {
    recipeElementIds.add(r.inputA);
    recipeElementIds.add(r.inputB);
    recipeElementIds.add(r.output);
  }

  // For custom element IDs that exist in recipes but have no definition, create one
  for (const id of recipeElementIds) {
    if (!id.startsWith('custom_')) continue;
    if (existingCustomIds.has(id)) continue;

    // Derive a readable name from the id: custom_honey_pot -> Honey Pot
    const name = id
      .replace(/^custom_/, '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    newCustom.push({
      id,
      name,
      category: 'Weird',
      description: `A rediscovered element.`,
      tags: ['custom', 'player-made', 'recovered'],
      discovered: false,
      emoji: '✨',
    });
  }

  const nextCustom = [...state.customElements, ...newCustom];
  const allEls = [...ELEMENTS, ...nextCustom];

  // Recover discoveries across ALL planets
  const nextPlanets = state.planets.map((planet) => {
    if (!planet.bigBangDone) return planet;

    const discovered = new Set(planet.discoveredElements);
    for (const pid of PRIMORDIAL_ELEMENTS) discovered.add(pid);

    // Transitive pass: discover all outputs whose inputs are both discovered
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of allRec) {
        if (discovered.has(r.output)) continue;
        if (discovered.has(r.inputA) && discovered.has(r.inputB)) {
          discovered.add(r.output);
          changed = true;
        }
      }
    }

    return {
      ...planet,
      discoveredElements: discovered,
      worldInfluence: calculateWorldInfluence(Array.from(discovered), allEls, state.effectOverrides),
      eventLog: [...planet.eventLog, '🔧 Recovery complete — lost elements and discoveries have been restored.'],
    };
  });

  const nextState = withActivePlanetFields({
    ...state,
    planets: nextPlanets,
    customElements: nextCustom,
  });

  try {
    localStorage.setItem(RECOVERY_FLAG, '1');
  } catch { /* ok */ }

  return nextState;
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
      return updateActivePlanet(state, {
        bigBangDone: true,
        discoveredElements: discovered,
        worldInfluence,
        recentDiscoveries: [...PRIMORDIAL_ELEMENTS],
        eventLog: ['🌌 The Big Bang! The universe springs into existence!', '🔥💧🟫💨 The primordial elements emerge: Fire, Water, Earth, Air'],
        hints: ['Combine two elements to discover new ones!'],
      });
    }

    case 'SELECT_SLOT_A':
      return updateActivePlanet(state, { selectedSlotA: action.elementId, lastCombinationResult: null });

    case 'SELECT_SLOT_B':
      return updateActivePlanet(state, { selectedSlotB: action.elementId, lastCombinationResult: null });

    case 'TRY_COMBINE': {
      const planet = activePlanet(state);
      const { selectedSlotA, selectedSlotB } = planet;
      if (!selectedSlotA || !selectedSlotB) {
        return updateActivePlanet(state, { lastCombinationResult: { success: false } });
      }

      const canonicalA = resolveActsAsElementId(selectedSlotA, state.actsAsOverrides);
      const canonicalB = resolveActsAsElementId(selectedSlotB, state.actsAsOverrides);
      const attemptedCombinations = new Set(planet.attemptedCombinations);
      attemptedCombinations.add(comboKey(canonicalA, canonicalB));

      const recipes = allRecipes(state);
      const recipe = findRecipe(selectedSlotA, selectedSlotB, recipes, state.actsAsOverrides);
      
      if (!recipe) {
        return updateActivePlanet(state, { attemptedCombinations, lastCombinationResult: { success: false } });
      }

      const outputId = recipe.output;
      const recipeKey = recipePairKey(recipe.inputA, recipe.inputB);
      const alreadyDiscovered = planet.discoveredElements.has(outputId);
      const isNewRecipe = !state.profile.discoveredRecipeKeys.includes(recipeKey);
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
      
      const newDiscovered = new Set(planet.discoveredElements);
      newDiscovered.add(outputId);
      
      const newRecent = alreadyDiscovered
        ? planet.recentDiscoveries
        : [outputId, ...planet.recentDiscoveries].slice(0, 10);
      
      const worldInfluence = calculateWorldInfluence(Array.from(newDiscovered), allElements(state), nextOverrides);
      
      const newEventLog = [...planet.eventLog];
      if (!alreadyDiscovered && MAJOR_ELEMENT_EVENTS[outputId]) {
        newEventLog.push(MAJOR_ELEMENT_EVENTS[outputId]);
      }

      if (isNewRecipe) {
        newEventLog.push(`📘 New recipe discovered: ${recipe.inputA} + ${recipe.inputB}. +3 XP`);
      }

      const discoveryXp = alreadyDiscovered ? 0 : 5;
      const recipeXp = isNewRecipe ? 3 : 0;
      const nextProfile = {
        ...state.profile,
        xp: state.profile.xp + discoveryXp + recipeXp,
        discoveredRecipeKeys: isNewRecipe
          ? [...state.profile.discoveredRecipeKeys, recipeKey]
          : state.profile.discoveredRecipeKeys,
      };

      const nextState = updateActivePlanet(
        { ...state, effectOverrides: nextOverrides, profile: nextProfile },
        {
          discoveredElements: newDiscovered,
          worldInfluence,
          recentDiscoveries: newRecent,
          eventLog: newEventLog,
          attemptedCombinations,
          selectedSlotA: null,
          selectedSlotB: null,
          lastCombinationResult: { success: true, elementId: outputId, isNew: !alreadyDiscovered },
        }
      );
      return checkAndCompleteQuests(awardPlanetMilestones(withAvailableElementPool(nextState, recipes)));
    }

    case 'ADD_MASTER_RECIPE': {
      const incoming = recipePairKey(action.recipe.inputA, action.recipe.inputB);
      const filtered = state.masterRecipes.filter((recipe) => recipePairKey(recipe.inputA, recipe.inputB) !== incoming);

      const nextState: GameState = {
        ...state,
        masterRecipes: [action.recipe, ...filtered],
      };
      const planet = activePlanet(nextState);
      return withActivePlanetFields(withAvailableElementPool(
        updateActivePlanet(nextState, {
          eventLog: [...planet.eventLog, `🧪 Master recipe added: ${action.recipe.inputA} + ${action.recipe.inputB} -> ${action.recipe.output}`],
        }),
        allRecipes(nextState),
      ));
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

      const planet = activePlanet(state);
      const nextState = updateActivePlanet({
        ...state,
        masterRecipes: keptLocal,
      }, {
        eventLog: [...planet.eventLog, `☁️ Synced ${removedCount} local recipes to global and removed local duplicates.`],
      });
      return withAvailableElementPool(nextState, allRecipes(nextState));
    }

    case 'SET_SHARED_RECIPES': {
      const withShared: GameState = {
        ...state,
        sharedRecipes: action.recipes,
      };
      const recovered = recoverLostElements(withShared);
      return withAvailableElementPool(recovered, allRecipes(recovered));
    }

    case 'UPSERT_CUSTOM_ELEMENT': {
      const index = state.customElements.findIndex((element) => element.id === action.element.id);
      const nextCustomElements = [...state.customElements];
      if (index >= 0) {
        nextCustomElements[index] = action.element;
      } else {
        nextCustomElements.push(action.element);
      }

      const planet = activePlanet(state);
      return updateActivePlanet({
        ...state,
        customElements: nextCustomElements,
      }, {
        worldInfluence: calculateWorldInfluence(Array.from(planet.discoveredElements), [...ELEMENTS, ...nextCustomElements], state.effectOverrides),
      });
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
      const planet = activePlanet(state);
      return updateActivePlanet({
        ...state,
        effectOverrides: nextOverrides,
      }, {
        worldInfluence: calculateWorldInfluence(Array.from(planet.discoveredElements), allElements(state), nextOverrides),
      });
    }

    case 'CLEAR_EFFECT_OVERRIDE': {
      const nextOverrides = { ...state.effectOverrides };
      delete nextOverrides[action.elementId];
      const planet = activePlanet(state);
      return updateActivePlanet({
        ...state,
        effectOverrides: nextOverrides,
      }, {
        worldInfluence: calculateWorldInfluence(Array.from(planet.discoveredElements), allElements(state), nextOverrides),
      });
    }

    case 'DELETE_ELEMENT': {
      return removeElementIdsFromState(state, new Set([action.elementId]));
    }

    case 'TOGGLE_FAVORITE': {
      const planet = activePlanet(state);
      const next = new Set(planet.favoriteElementIds);
      if (next.has(action.elementId)) next.delete(action.elementId);
      else next.add(action.elementId);
      return updateActivePlanet(state, { favoriteElementIds: next });
    }

    case 'TICK_INSIGHT': {
      const livePlanets = state.planets.filter((planet) => planet.bigBangDone && !planet.destroyed);
      if (livePlanets.length === 0) return state;
      const elems = allElements(state);
      const gains = livePlanets.reduce(
        (sum, planet) =>
          addInsight(
            sum,
            calculateInsightGainPerSecond(
              planet.discoveredElements,
              elems,
              state.categoryOverrides
            )
          ),
        { ...EMPTY_INSIGHT }
      );
      // Scale gains by tick interval (5 seconds)
      const scaledGains: InsightCurrency = {
        nature: gains.nature * 5,
        life: gains.life * 5,
        civilization: gains.civilization * 5,
        technology: gains.technology * 5,
        cosmic: gains.cosmic * 5,
        materials: gains.materials * 5,
        weird: gains.weird * 5,
        warfare: gains.warfare * 5,
      };
      return {
        ...state,
        insight: applyInsightTick(state.insight, scaledGains),
      };
    }

    case 'REQUEST_HINT': {
      const planet = activePlanet(state);
      const hint = generateHint(
        Array.from(planet.discoveredElements),
        RECIPES,
        allElements(state)
      );
      return updateActivePlanet(state, { hints: [hint, ...planet.hints].slice(0, 5) });
    }

    case 'REQUEST_INSIGHT_HINT': {
      return requestInsightHintForType(state, action.insightType);
    }

    case 'REQUEST_INSIGHT_HINT_AUTO': {
      const planet = activePlanet(state);
      const discoveredCounts = countDiscoveredByInsightType(
        planet.discoveredElements,
        allElements(state),
        state.categoryOverrides
      );

      const preferredType = (Object.keys(planet.insight) as InsightType[])
        .filter((type) => getUndiscoveredElementsByInsightType(state, type).length > 0)
        .filter((type) => state.insight[type] >= getHintInsightCost(discoveredCounts[type]))
        .sort((a, b) => state.insight[b] - state.insight[a])[0];

      if (!preferredType) {
        return updateActivePlanet(state, {
          hints: ['Not enough Insight to buy a hint yet. Keep building your world.'].concat(planet.hints).slice(0, 5),
        });
      }

      return requestInsightHintForType(state, preferredType);
    }

    case 'REQUEST_RANDOM_DISCOVERY': {
      const planet = activePlanet(state);
      const candidates = getUndiscoveredElementsByInsightType(state, action.insightType);
      if (candidates.length === 0) {
        return updateActivePlanet(state, {
          eventLog: [...planet.eventLog, `🧭 No ${INSIGHT_LABELS[action.insightType]} discoveries remain to unlock.`],
        });
      }

      const discoveredCounts = countDiscoveredByInsightType(
        planet.discoveredElements,
        allElements(state),
        state.categoryOverrides
      );
      const cost = getRandomDiscoveryInsightCost(discoveredCounts[action.insightType]);
      if (state.insight[action.insightType] < cost) {
        return updateActivePlanet(state, {
          eventLog: [
            ...planet.eventLog,
            `🧠 Need ${cost.toFixed(1)} ${INSIGHT_LABELS[action.insightType]} Insight for a random unlock.`,
          ],
        });
      }

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const discoveredState = discoverElementInState(state, picked.id);
      const discoveredPlanet = activePlanet(discoveredState);
      return updateActivePlanet({
        ...discoveredState,
        insight: spendInsight(discoveredState.insight, action.insightType, cost),
      }, {
        eventLog: [
          ...discoveredPlanet.eventLog,
          `🧬 Spent ${cost.toFixed(1)} ${INSIGHT_LABELS[action.insightType]} Insight to discover ${picked.name}.`,
        ],
        hints: [`Insight revealed a new ${INSIGHT_LABELS[action.insightType]} element: ${picked.name}.`, ...discoveredPlanet.hints].slice(0, 5),
      });
    }

    case 'DISCOVER_ELEMENT': {
      return discoverElementInState(state, action.elementId);
    }

    case 'RESET_WORLD': {
      return createInitialState();
    }

    case 'LOAD_STATE': {
      const saved = action.state;
      if (!saved) return state;
      const customElements = saved.customElements ?? [];
      const loadedOverrides = saved.effectOverrides ?? {};

      // Build global fields
      const globalFields = {
        masterRecipes: saved.masterRecipes ?? [],
        customElements,
        sharedRecipes: state.sharedRecipes,
        iconOverrides: saved.iconOverrides ?? {},
        nameOverrides: saved.nameOverrides ?? {},
        descriptionOverrides: saved.descriptionOverrides ?? {},
        categoryOverrides: saved.categoryOverrides ?? {},
        actsAsOverrides: saved.actsAsOverrides ?? {},
        effectOverrides: loadedOverrides,
        profile: normalizeProfile(saved.profile),
        insight: getSavedGlobalInsight(saved),
      };

      let planets: PlanetState[];
      let activePlanetIndex: number;

      if (saved.planets && saved.planets.length > 0) {
        // Multi-planet save format
        planets = saved.planets.map((sp) => {
          const disc = new Set<string>(sp.discoveredElements ?? []);
          return {
            name: sp.name ?? 'Genesis',
            seed: sp.seed ?? Math.floor(Math.random() * 0xffffffff),
            createdAt: sp.createdAt ?? Date.now(),
            bigBangDone: sp.bigBangDone ?? false,
            discoveredElements: disc,
            worldInfluence: sp.worldInfluence ?? { ...DEFAULT_WORLD_INFLUENCE },
            recentDiscoveries: sp.recentDiscoveries ?? [],
            eventLog: sp.eventLog ?? [],
            selectedSlotA: null,
            selectedSlotB: null,
            attemptedCombinations: new Set<string>(sp.attemptedCombinations ?? []),
            favoriteElementIds: new Set<string>(sp.favoriteElementIds ?? []),
            insight: sp.insight ?? { ...EMPTY_INSIGHT },
            hints: sp.hints ?? ['Welcome back!'],
            lastCombinationResult: null,
            destroyed: sp.destroyed ?? false,
          };
        });
        activePlanetIndex = saved.activePlanetIndex ?? 0;
        if (activePlanetIndex >= planets.length) activePlanetIndex = 0;
      } else {
        // Legacy single-planet save format — migrate to planets array
        const discovered = new Set<string>(saved.discoveredElements ?? []);
        const computedInfluence = calculateWorldInfluence(Array.from(discovered), [...ELEMENTS, ...customElements], loadedOverrides);
        const worldInfluence = { ...computedInfluence, ...(saved.worldInfluence ?? {}) };
        planets = [{
          name: 'Genesis',
          seed: saved.seed ?? state.seed,
          createdAt: Date.now(),
          bigBangDone: saved.bigBangDone ?? false,
          discoveredElements: discovered,
          worldInfluence,
          recentDiscoveries: saved.recentDiscoveries ?? [],
          eventLog: saved.eventLog ?? [],
          selectedSlotA: null,
          selectedSlotB: null,
          attemptedCombinations: new Set(saved.attemptedCombinations ?? []),
          favoriteElementIds: new Set(saved.favoriteElementIds ?? []),
          insight: saved.insight ?? { ...EMPTY_INSIGHT },
          hints: saved.hints ?? ['Welcome back!'],
          lastCombinationResult: null,
          destroyed: false,
        }];
        activePlanetIndex = 0;
      }

      const nextState: GameState = withActivePlanetFields({
        ...state,
        planets,
        activePlanetIndex,
        ...globalFields,
      });

      const migrated = migrateLegacyOceanPuddleState(nextState);
      const mPlanet = activePlanet(migrated);
      const stabilized = updateActivePlanet(migrated, {
        worldInfluence: calculateWorldInfluence(Array.from(mPlanet.discoveredElements), allElements(migrated), migrated.effectOverrides),
      });
      // Do NOT prune custom elements here — shared recipes haven't loaded yet.
      // SET_SHARED_RECIPES will run recovery + pruning once shared data arrives.
      return stabilized;
    }

    case 'CREATE_PLANET': {
      if (!isMultiPlanetUnlocked(state)) return state;
      const livePlanetCount = state.planets.filter((planet) => !planet.destroyed).length;
      const creationCost = getPlanetCreationInsightCost(livePlanetCount);
      if (state.insight[PLANET_CREATION_INSIGHT_TYPE] < creationCost) {
        const planet = activePlanet(state);
        return updateActivePlanet(state, {
          eventLog: [
            ...planet.eventLog,
            `🌠 Need ${creationCost.toFixed(1)} Cosmic Insight to create a new planet.`,
          ],
        });
      }

      const newPlanet = createNewPlanet(state, action.name, action.mode, action.customElementIds);
      newPlanet.eventLog = [
        ...newPlanet.eventLog,
        `🌠 ${creationCost.toFixed(1)} Cosmic Insight shaped this world into being.`,
      ];
      const planets = [...state.planets, newPlanet];
      const currentPlanet = activePlanet(state);
      return checkAndCompleteQuests(
        awardPlanetMilestones(
          updateActivePlanet({
            ...state,
            planets,
            insight: spendInsight(state.insight, PLANET_CREATION_INSIGHT_TYPE, creationCost),
          }, {
            eventLog: [
              ...currentPlanet.eventLog,
              `🪐 Founded ${newPlanet.name}. Switch to it from the solar system when you are ready.`,
            ],
          })
        )
      );
    }

    case 'SWITCH_PLANET': {
      if (action.index < 0 || action.index >= state.planets.length) return state;
      if (state.planets[action.index].destroyed) return state;
      return withActivePlanetFields({ ...state, activePlanetIndex: action.index });
    }

    case 'RENAME_PLANET': {
      if (action.index < 0 || action.index >= state.planets.length) return state;
      const planets = [...state.planets];
      planets[action.index] = { ...planets[action.index], name: action.name };
      return withActivePlanetFields({ ...state, planets });
    }

    case 'DESTROY_PLANET': {
      if (action.index < 0 || action.index >= state.planets.length) return state;
      const target = state.planets[action.index];
      if (target.destroyed) return state;

      // Check that player has a destructive element on the current planet
      const disc = activePlanet(state).discoveredElements;
      const hasDestructive = Array.from(disc).some((id) => DESTRUCTIVE_ELEMENT_IDS.has(id));
      if (!hasDestructive) return state;

      const planets = [...state.planets];
      planets[action.index] = { ...target, destroyed: true };

      // If destroying all planets, reset
      const livePlanets = planets.filter((p) => !p.destroyed);
      if (livePlanets.length === 0) {
        return createInitialState();
      }

      // If destroyed the active planet, switch to first live planet
      let newIndex = state.activePlanetIndex;
      if (newIndex === action.index) {
        newIndex = planets.findIndex((p) => !p.destroyed);
      }

      const planet = activePlanet(state);
      const nextState = withActivePlanetFields({
        ...state,
        planets,
        activePlanetIndex: newIndex,
        profile: {
          ...state.profile,
          xp: state.profile.xp + 50,
        },
      });
      return checkAndCompleteQuests(updateActivePlanet(nextState, {
        eventLog: [...planet.eventLog, `💥 Planet "${target.name}" has been destroyed!`],
      }));
    }

    case 'GAIN_XP': {
      return {
        ...state,
        profile: { ...state.profile, xp: state.profile.xp + action.amount },
      };
    }

    case 'START_QUEST': {
      const quest = QUESTS.find((q) => q.id === action.questId);
      if (!quest) return state;
      if (state.profile.completedQuestIds.includes(action.questId)) return state;
      return {
        ...state,
        profile: { ...state.profile, activeQuestId: action.questId },
      };
    }

    case 'CHECK_QUESTS': {
      return checkAndCompleteQuests(state);
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
export { isMultiPlanetUnlocked, getProfileLevel, getProfileTitle, QUESTS, DESTRUCTIVE_ELEMENT_IDS };
export { getPlanetCreationInsightCost, PLANET_CREATION_INSIGHT_TYPE, MULTI_PLANET_TECH_THRESHOLD };

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

  // Debounce saves so TICK_INSIGHT (every 1s) doesn't serialize the full state each tick
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.bigBangDone) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveGame(state), 2000);
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state]);

  useEffect(() => {
    if (!state.bigBangDone) return;
    const timer = setInterval(() => {
      dispatch({ type: 'TICK_INSIGHT' });
    }, 5000);
    return () => clearInterval(timer);
  }, [state.bigBangDone]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}
