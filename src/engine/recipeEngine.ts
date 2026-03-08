import type { Recipe } from '../types';
import { equivalentRecipeInputIds } from './actingAs';

function recipeMatches(recipe: Recipe, a: string, b: string): boolean {
  if (recipe.ordered) {
    return recipe.inputA === a && recipe.inputB === b;
  }
  return (
    (recipe.inputA === a && recipe.inputB === b) ||
    (recipe.inputA === b && recipe.inputB === a)
  );
}

export function findRecipe(
  idA: string,
  idB: string,
  recipes: Recipe[],
  actsAsOverrides: Record<string, string> = {}
): Recipe | null {
  // Always give exact element IDs highest priority so explicit recipes like
  // Salt+Water -> Ocean cannot be shadowed by acts-as fallbacks.
  for (const recipe of recipes) {
    if (recipeMatches(recipe, idA, idB)) return recipe;
  }

  const aCandidates = equivalentRecipeInputIds(idA, actsAsOverrides).filter((candidate) => candidate !== idA);
  const bCandidates = equivalentRecipeInputIds(idB, actsAsOverrides).filter((candidate) => candidate !== idB);

  if (aCandidates.length === 0 && bCandidates.length === 0) {
    return null;
  }

  for (const recipe of recipes) {
    const aPool = aCandidates.length > 0 ? [idA, ...aCandidates] : [idA];
    const bPool = bCandidates.length > 0 ? [idB, ...bCandidates] : [idB];

    for (const a of aPool) {
      for (const b of bPool) {
        if (a === idA && b === idB) continue;
        if (recipeMatches(recipe, a, b)) return recipe;
      }
    }
  }
  return null;
}

export function getHintableRecipes(
  discoveredIds: string[],
  recipes: Recipe[]
): { known: string; unknown: string; output: string }[] {
  const discovered = new Set(discoveredIds);
  const results: { known: string; unknown: string; output: string }[] = [];
  
  for (const recipe of recipes) {
    const aKnown = discovered.has(recipe.inputA);
    const bKnown = discovered.has(recipe.inputB);
    const outputKnown = discovered.has(recipe.output);
    
    if (outputKnown) continue;
    
    if (aKnown && !bKnown) {
      results.push({ known: recipe.inputA, unknown: recipe.inputB, output: recipe.output });
    } else if (bKnown && !aKnown) {
      results.push({ known: recipe.inputB, unknown: recipe.inputA, output: recipe.output });
    }
  }
  
  return results;
}
