export const DEFAULT_ELEMENT_CATEGORIES = [
  'Primordial',
  'Nature',
  'Materials',
  'Weather',
  'Life',
  'Civilization',
  'Technology',
  'Abstract',
  'Cosmic',
  'Weird',
] as const;

export type ElementCategory = string;

export type InsightType =
  | 'nature'
  | 'life'
  | 'civilization'
  | 'technology'
  | 'cosmic'
  | 'materials'
  | 'weird'
  | 'warfare';

export type InsightCurrency = Record<InsightType, number>;

export interface WorldInfluence {
  water: number;
  brightness: number;
  earthy: number;
  air: number;
  vegetation: number;
  heat: number;
  cold: number;
  atmosphere: number;
  pollution: number;
  civilization: number;
  technology: number;
  magic: number;
  ruin: number;
  life: number;
  [key: string]: number;
}

export type WorldEffectMap = Record<string, number>;

export interface Element {
  id: string;
  name: string;
  category: ElementCategory;
  subcategory?: string;
  description: string;
  tags: string[];
  discovered: boolean;
  worldEffects?: WorldEffectMap;
  flavorText?: string;
  emoji?: string;
}

export interface Recipe {
  id: string;
  inputA: string;
  inputB: string;
  output: string;
  ordered?: boolean;
}

export interface MasterRecipe extends Recipe {
  createdAt: number;
  outputWorldEffects?: WorldEffectMap;
}

export interface EmojiAtlasEntry {
  id: string;
  label: string;
  value: string;
  kind: 'emoji' | 'image';
  createdAt: number;
}

export type PlanetStartMode = 'all' | 'basic4' | 'custom';

export interface PlanetState {
  name: string;
  seed: number;
  createdAt: number;
  bigBangDone: boolean;
  discoveredElements: Set<string>;
  worldInfluence: WorldInfluence;
  recentDiscoveries: string[];
  eventLog: string[];
  selectedSlotA: string | null;
  selectedSlotB: string | null;
  attemptedCombinations: Set<string>;
  favoriteElementIds: Set<string>;
  insight: InsightCurrency;
  hints: string[];
  lastCombinationResult: { success: boolean; elementId?: string; isNew?: boolean } | null;
  destroyed: boolean;
}

export type QuestType = 'discovery' | 'planet' | 'civilization' | 'chaos';
export type QuestStatus = 'available' | 'active' | 'completed';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  xpReward: number;
  badge?: string;
  check: QuestCheck;
}

export type QuestCheck =
  | { kind: 'discover_all'; elementIds: string[] }
  | { kind: 'discover_count'; category: string; count: number }
  | { kind: 'planet_influence'; field: string; min: number }
  | { kind: 'planet_count'; min: number }
  | { kind: 'destroy_planet' }
  | { kind: 'total_discoveries'; count: number };

export interface ProfileState {
  xp: number;
  completedQuestIds: string[];
  activeQuestId: string | null;
}

export interface GameState {
  planets: PlanetState[];
  activePlanetIndex: number;
  // Global (shared across planets)
  masterRecipes: MasterRecipe[];
  sharedRecipes: MasterRecipe[];
  customElements: Element[];
  iconOverrides: Record<string, string>;
  nameOverrides: Record<string, string>;
  descriptionOverrides: Record<string, string>;
  categoryOverrides: Record<string, ElementCategory>;
  actsAsOverrides: Record<string, string>;
  effectOverrides: Record<string, WorldEffectMap>;
  profile: ProfileState;
  // Convenience accessors (derived from active planet)
  seed: number;
  bigBangDone: boolean;
  discoveredElements: Set<string>;
  worldInfluence: WorldInfluence;
  recentDiscoveries: string[];
  eventLog: string[];
  selectedSlotA: string | null;
  selectedSlotB: string | null;
  attemptedCombinations: Set<string>;
  favoriteElementIds: Set<string>;
  insight: InsightCurrency;
  hints: string[];
  lastCombinationResult: { success: boolean; elementId?: string; isNew?: boolean } | null;
}

export type GameAction =
  | { type: 'BIG_BANG' }
  | { type: 'SELECT_SLOT_A'; elementId: string | null }
  | { type: 'SELECT_SLOT_B'; elementId: string | null }
  | { type: 'TRY_COMBINE' }
  | { type: 'ADD_MASTER_RECIPE'; recipe: MasterRecipe }
  | { type: 'REMOVE_MASTER_RECIPE'; recipeId: string }
  | { type: 'REMOVE_LOCAL_RECIPES_BY_PAIR'; pairs: string[] }
  | { type: 'SET_SHARED_RECIPES'; recipes: MasterRecipe[] }
  | { type: 'UPSERT_CUSTOM_ELEMENT'; element: Element }
  | { type: 'SET_ICON_OVERRIDE'; elementId: string; icon: string }
  | { type: 'CLEAR_ICON_OVERRIDE'; elementId: string }
  | { type: 'SET_NAME_OVERRIDE'; elementId: string; name: string }
  | { type: 'CLEAR_NAME_OVERRIDE'; elementId: string }
  | { type: 'SET_DESCRIPTION_OVERRIDE'; elementId: string; description: string }
  | { type: 'CLEAR_DESCRIPTION_OVERRIDE'; elementId: string }
  | { type: 'SET_CATEGORY_OVERRIDE'; elementId: string; category: ElementCategory }
  | { type: 'CLEAR_CATEGORY_OVERRIDE'; elementId: string }
  | { type: 'SET_ACTS_AS_OVERRIDE'; elementId: string; actsAsElementId: string }
  | { type: 'CLEAR_ACTS_AS_OVERRIDE'; elementId: string }
  | { type: 'SET_EFFECT_OVERRIDE'; elementId: string; worldEffects: WorldEffectMap }
  | { type: 'CLEAR_EFFECT_OVERRIDE'; elementId: string }
  | { type: 'DELETE_ELEMENT'; elementId: string }
  | { type: 'TOGGLE_FAVORITE'; elementId: string }
  | { type: 'TICK_INSIGHT' }
  | { type: 'REQUEST_INSIGHT_HINT'; insightType: InsightType }
  | { type: 'REQUEST_INSIGHT_HINT_AUTO' }
  | { type: 'REQUEST_RANDOM_DISCOVERY'; insightType: InsightType }
  | { type: 'DISCOVER_ELEMENT'; elementId: string }
  | { type: 'REQUEST_HINT' }
  | { type: 'RESET_WORLD' }
  | { type: 'LOAD_STATE'; state: Partial<SerializableGameState> }
  | { type: 'CREATE_PLANET'; name: string; mode: PlanetStartMode; customElementIds?: string[] }
  | { type: 'SWITCH_PLANET'; index: number }
  | { type: 'RENAME_PLANET'; index: number; name: string }
  | { type: 'DESTROY_PLANET'; index: number }
  | { type: 'GAIN_XP'; amount: number; reason: string }
  | { type: 'START_QUEST'; questId: string }
  | { type: 'CHECK_QUESTS' };

export interface SerializablePlanetState {
  name: string;
  seed: number;
  createdAt: number;
  bigBangDone: boolean;
  discoveredElements: string[];
  worldInfluence: WorldInfluence;
  recentDiscoveries: string[];
  eventLog: string[];
  attemptedCombinations: string[];
  favoriteElementIds: string[];
  insight: InsightCurrency;
  hints: string[];
  destroyed: boolean;
}

export interface SerializableProfileState {
  xp: number;
  completedQuestIds: string[];
  activeQuestId: string | null;
}

export interface SerializableGameState {
  // Multi-planet format
  planets?: SerializablePlanetState[];
  activePlanetIndex?: number;
  profile?: SerializableProfileState;
  // Legacy single-planet fields (for backward compat)
  seed: number;
  bigBangDone: boolean;
  discoveredElements: string[];
  worldInfluence: WorldInfluence;
  recentDiscoveries: string[];
  eventLog: string[];
  masterRecipes: MasterRecipe[];
  customElements: Element[];
  iconOverrides: Record<string, string>;
  nameOverrides: Record<string, string>;
  descriptionOverrides: Record<string, string>;
  categoryOverrides: Record<string, ElementCategory>;
  actsAsOverrides: Record<string, string>;
  effectOverrides: Record<string, WorldEffectMap>;
  attemptedCombinations: string[];
  favoriteElementIds: string[];
  insight: InsightCurrency;
  hints: string[];
}
