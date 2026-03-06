import type { Recipe } from '../types';

export function findRecipe(idA: string, idB: string, recipes: Recipe[]): Recipe | null {
  for (const recipe of recipes) {
    if (recipe.ordered) {
      if (recipe.inputA === idA && recipe.inputB === idB) return recipe;
    } else {
      if (
        (recipe.inputA === idA && recipe.inputB === idB) ||
        (recipe.inputA === idB && recipe.inputB === idA)
      ) return recipe;
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
