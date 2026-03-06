import type { Recipe, Element } from '../types';
import { getHintableRecipes } from './recipeEngine';

export function generateHint(
  discoveredIds: string[],
  recipes: Recipe[],
  elements: Element[],
  selectedElement?: string
): string {
  const elementMap = new Map(elements.map(e => [e.id, e]));
  const discovered = new Set(discoveredIds);
  
  if (selectedElement && discovered.has(selectedElement)) {
    const elem = elementMap.get(selectedElement);
    const relatedRecipes = recipes.filter(r => 
      r.inputA === selectedElement || r.inputB === selectedElement
    );
    
    for (const recipe of relatedRecipes) {
      const other = recipe.inputA === selectedElement ? recipe.inputB : recipe.inputA;
      const otherElem = elementMap.get(other);
      if (otherElem && discovered.has(other) && !discovered.has(recipe.output)) {
        return `Try combining ${elem?.name} with ${otherElem.name}...`;
      }
    }
    
    return `${elem?.name} ${elem?.emoji ?? ''} has many potential combinations. Keep experimenting!`;
  }
  
  const hintable = getHintableRecipes(discoveredIds, recipes);
  
  if (hintable.length > 0) {
    const hint = hintable[Math.floor(Math.random() * Math.min(hintable.length, 5))];
    const knownElem = elementMap.get(hint.known);
    if (knownElem) {
      return `You have ${knownElem.name} ${knownElem.emoji ?? ''}. Try combining it with something else to discover new elements!`;
    }
  }
  
  const genericHints = [
    "Try combining two of the same element!",
    "The primordial elements can combine in many ways.",
    "Fire + Water creates something surprising...",
    "Life can be created from simpler things.",
    "Technology often builds on civilization.",
    "Look at the Abstract category for unusual combinations.",
  ];
  
  return genericHints[Math.floor(Math.random() * genericHints.length)];
}
