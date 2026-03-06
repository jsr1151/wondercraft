export type ElementCategory = 
  | 'Primordial' | 'Nature' | 'Materials' | 'Weather' 
  | 'Life' | 'Civilization' | 'Technology' | 'Abstract' 
  | 'Cosmic' | 'Weird';

export interface WorldInfluence {
  water: number;
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
}

export interface Element {
  id: string;
  name: string;
  category: ElementCategory;
  subcategory?: string;
  description: string;
  tags: string[];
  discovered: boolean;
  worldEffects?: Partial<WorldInfluence>;
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

export interface GameState {
  seed: number;
  bigBangDone: boolean;
  discoveredElements: Set<string>;
  worldInfluence: WorldInfluence;
  recentDiscoveries: string[];
  eventLog: string[];
  selectedSlotA: string | null;
  selectedSlotB: string | null;
  hints: string[];
  lastCombinationResult: { success: boolean; elementId?: string; isNew?: boolean } | null;
}

export type GameAction =
  | { type: 'BIG_BANG' }
  | { type: 'SELECT_SLOT_A'; elementId: string | null }
  | { type: 'SELECT_SLOT_B'; elementId: string | null }
  | { type: 'TRY_COMBINE' }
  | { type: 'DISCOVER_ELEMENT'; elementId: string }
  | { type: 'REQUEST_HINT' }
  | { type: 'RESET_WORLD' }
  | { type: 'LOAD_STATE'; state: Partial<SerializableGameState> };

export interface SerializableGameState {
  seed: number;
  bigBangDone: boolean;
  discoveredElements: string[];
  worldInfluence: WorldInfluence;
  recentDiscoveries: string[];
  eventLog: string[];
  hints: string[];
}
