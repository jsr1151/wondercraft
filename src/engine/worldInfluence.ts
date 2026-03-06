import type { WorldInfluence, Element } from '../types';

export const DEFAULT_WORLD_INFLUENCE: WorldInfluence = {
  water: 0, vegetation: 0, heat: 0, cold: 0, atmosphere: 0,
  pollution: 0, civilization: 0, technology: 0, magic: 0, ruin: 0, life: 0
};

const MAX_INFLUENCE = 30;
const MIN_INFLUENCE = -10;

export function calculateWorldInfluence(
  discoveredIds: string[],
  elements: Element[]
): WorldInfluence {
  const result = { ...DEFAULT_WORLD_INFLUENCE };
  const discoveredSet = new Set(discoveredIds);
  
  for (const element of elements) {
    if (discoveredSet.has(element.id) && element.worldEffects) {
      for (const [key, value] of Object.entries(element.worldEffects)) {
        const k = key as keyof WorldInfluence;
        result[k] = (result[k] || 0) + (value || 0);
      }
    }
  }
  
  for (const key of Object.keys(result) as (keyof WorldInfluence)[]) {
    result[key] = Math.max(MIN_INFLUENCE, Math.min(MAX_INFLUENCE, result[key]));
  }
  
  return result;
}
