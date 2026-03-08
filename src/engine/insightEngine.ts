import type { Element, ElementCategory, InsightCurrency, InsightType } from '../types';
import { resolveElementCategories } from '../utils/categoryResolver';

export const CORE_INSIGHT_TYPES: InsightType[] = [
  'nature',
  'life',
  'civilization',
  'technology',
  'cosmic',
  'materials',
  'weird',
  'warfare',
];

export const EMPTY_INSIGHT: InsightCurrency = {
  nature: 0,
  life: 0,
  civilization: 0,
  technology: 0,
  cosmic: 0,
  materials: 0,
  weird: 0,
  warfare: 0,
};

export const INSIGHT_LABELS: Record<InsightType, string> = {
  nature: 'Nature',
  life: 'Life',
  civilization: 'Civilization',
  technology: 'Technology',
  cosmic: 'Cosmic',
  materials: 'Materials',
  weird: 'Weird',
  warfare: 'Warfare',
};

const HINT_BASE_COST = 4;
const HINT_DISCOVERED_MULTIPLIER = 1;
const RANDOM_DISCOVERY_BASE_COST = 22;
const RANDOM_DISCOVERY_DISCOVERED_MULTIPLIER = 6;

const SOURCE_RATE_PER_SECOND: Record<string, number> = {
  // Nature
  forest: 0.04,
  ocean: 0.08,
  // Life
  life: 0.03,
  // Civilization
  human: 0.08,
  city: 0.14,
  // Technology
  computer: 0.08,
  internet: 0.14,
  // Cosmic
  planet: 0.08,
  alien: 0.08,
  // Weird
  chaos: 0.03,
};

const CATEGORY_TO_INSIGHT: Record<string, InsightType | undefined> = {
  Nature: 'nature',
  Life: 'life',
  Civilization: 'civilization',
  Technology: 'technology',
  Cosmic: 'cosmic',
  Materials: 'materials',
  Weird: 'weird',
  Warfare: 'warfare',
};

function resolveInsightTypeForElement(
  element: Element,
  categoryOverrides: Record<string, ElementCategory>
): InsightType | null {
  const categories = resolveElementCategories(element, categoryOverrides);
  for (const category of categories) {
    const mapped = CATEGORY_TO_INSIGHT[category];
    if (mapped) return mapped;
  }
  return null;
}

export function getElementInsightType(
  element: Element,
  categoryOverrides: Record<string, ElementCategory>
): InsightType | null {
  return resolveInsightTypeForElement(element, categoryOverrides);
}

export function getHintInsightCost(discoveredInCategory: number): number {
  return HINT_BASE_COST + discoveredInCategory * HINT_DISCOVERED_MULTIPLIER;
}

export function getRandomDiscoveryInsightCost(discoveredInCategory: number): number {
  return RANDOM_DISCOVERY_BASE_COST + discoveredInCategory * RANDOM_DISCOVERY_DISCOVERED_MULTIPLIER;
}

export function calculateInsightGainPerSecond(
  discoveredElements: Set<string>,
  allKnownElements: Element[],
  categoryOverrides: Record<string, ElementCategory>
): InsightCurrency {
  const gains: InsightCurrency = { ...EMPTY_INSIGHT };
  const byId = new Map(allKnownElements.map((element) => [element.id, element]));

  for (const elementId of discoveredElements) {
    const rate = SOURCE_RATE_PER_SECOND[elementId];
    if (!rate) continue;

    const element = byId.get(elementId);
    if (!element) continue;

    const insightType = resolveInsightTypeForElement(element, categoryOverrides);
    if (!insightType) continue;

    gains[insightType] += rate;
  }

  return gains;
}

export function applyInsightTick(current: InsightCurrency, gains: InsightCurrency): InsightCurrency {
  return {
    nature: current.nature + gains.nature,
    life: current.life + gains.life,
    civilization: current.civilization + gains.civilization,
    technology: current.technology + gains.technology,
    cosmic: current.cosmic + gains.cosmic,
    materials: current.materials + gains.materials,
    weird: current.weird + gains.weird,
    warfare: current.warfare + gains.warfare,
  };
}

export function countDiscoveredByInsightType(
  discoveredElements: Set<string>,
  allKnownElements: Element[],
  categoryOverrides: Record<string, ElementCategory>
): Record<InsightType, number> {
  const byId = new Map(allKnownElements.map((element) => [element.id, element]));
  const counts: Record<InsightType, number> = {
    nature: 0,
    life: 0,
    civilization: 0,
    technology: 0,
    cosmic: 0,
    materials: 0,
    weird: 0,
    warfare: 0,
  };

  for (const id of discoveredElements) {
    const element = byId.get(id);
    if (!element) continue;
    const insightType = resolveInsightTypeForElement(element, categoryOverrides);
    if (!insightType) continue;
    counts[insightType] += 1;
  }

  return counts;
}
