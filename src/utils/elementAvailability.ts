import { ELEMENTS } from '../data/elements';
import type { Element, Recipe } from '../types';

const PRIMORDIAL_IDS = new Set(['fire', 'water', 'earth', 'air']);

export function getAvailableElementIdSet(recipes: Recipe[]): Set<string> {
  const available = new Set(PRIMORDIAL_IDS);
  for (const recipe of recipes) {
    available.add(recipe.output);
  }
  return available;
}

export function getAvailableElements(elements: Element[], recipes: Recipe[]): Element[] {
  const availableIds = getAvailableElementIdSet(recipes);
  return elements.filter((element) => availableIds.has(element.id));
}

export function getCoreElementById(elementId: string): Element | undefined {
  return ELEMENTS.find((element) => element.id === elementId);
}
