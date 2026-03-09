import type { MasterRecipe } from '../types';
import bundledRecipeDoc from '../../shared/master-recipes.json';

const OWNER = 'jsr1151';
const REPO = 'wondercraft';
const BRANCH = 'main';
const FILE_PATH = 'shared/master-recipes.json';

const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE_PATH}`;
const CONTENTS_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
const LOCAL_URL = import.meta.env.BASE_URL + 'shared-master-recipes.json';
const GLOBAL_RECIPE_CACHE_KEY = 'wondercraft_cached_shared_recipes_v1';

/** Recipes bundled at build time — always available, even offline. */
const BUNDLED_RECIPES: MasterRecipe[] = (bundledRecipeDoc as { recipes: MasterRecipe[] }).recipes ?? [];

export const GLOBAL_RECIPE_TOKEN_KEY = 'wondercraft_global_recipe_token';

interface GlobalRecipeDoc {
  updatedAt: number;
  recipes: MasterRecipe[];
}

interface GitHubContentResponse {
  sha: string;
  content: string;
  encoding: 'base64' | string;
}

interface GitHubErrorResponse {
  message?: string;
  documentation_url?: string;
  errors?: Array<{ message?: string }>;
}

function normalizePair(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function mergeRecipe(recipes: MasterRecipe[], incoming: MasterRecipe): MasterRecipe[] {
  const incomingPair = normalizePair(incoming.inputA, incoming.inputB);
  const withoutOld = recipes.filter((recipe) => normalizePair(recipe.inputA, recipe.inputB) !== incomingPair);
  return [incoming, ...withoutOld].slice(0, 1200);
}

function mergeRecipes(recipes: MasterRecipe[], incomingRecipes: MasterRecipe[]): MasterRecipe[] {
  return incomingRecipes.reduce((nextRecipes, recipe) => mergeRecipe(nextRecipes, recipe), recipes);
}

function parseDocument(raw: string): GlobalRecipeDoc {
  const fallback: GlobalRecipeDoc = { updatedAt: Date.now(), recipes: [] };
  try {
    const parsed = JSON.parse(raw) as GlobalRecipeDoc | MasterRecipe[];
    if (Array.isArray(parsed)) {
      return { updatedAt: Date.now(), recipes: parsed };
    }
    if (!parsed || !Array.isArray(parsed.recipes)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function readCachedRecipes(): MasterRecipe[] {
  try {
    const raw = localStorage.getItem(GLOBAL_RECIPE_CACHE_KEY);
    if (!raw) return [];
    return parseDocument(raw).recipes;
  } catch {
    return [];
  }
}

function writeCachedRecipes(recipes: MasterRecipe[]): void {
  try {
    localStorage.setItem(GLOBAL_RECIPE_CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), recipes }));
  } catch {
    // Ignore cache write failures.
  }
}

async function buildGitHubError(response: Response, action: 'read' | 'write'): Promise<Error> {
  const fallback = `GitHub ${action} failed (${response.status})`;

  try {
    const payload = (await response.json()) as GitHubErrorResponse;
    const details = [payload.message, payload.errors?.[0]?.message]
      .filter((part): part is string => !!part && part.trim().length > 0)
      .join(' - ');
    if (details) {
      return new Error(`${fallback}: ${details}`);
    }
  } catch {
    // Ignore parse failures and return a generic error.
  }

  return new Error(fallback);
}

export async function fetchGlobalRecipes(): Promise<MasterRecipe[]> {
  const urls = [`${RAW_URL}?t=${Date.now()}`, `${LOCAL_URL}?t=${Date.now()}`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const text = await response.text();
      const recipes = parseDocument(text).recipes;
      if (recipes.length > 0) {
        writeCachedRecipes(recipes);
      }
      return recipes;
    } catch {
      // Try the next source.
    }
  }

  // Last resort: built-in bundled recipes
  const cached = readCachedRecipes();
  if (cached.length > 0) return cached;
  return BUNDLED_RECIPES;
}

async function getRemoteDoc(token: string): Promise<{ doc: GlobalRecipeDoc; sha?: string }> {
  const response = await fetch(CONTENTS_API, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status === 404) {
    return { doc: { updatedAt: Date.now(), recipes: [] } };
  }

  if (!response.ok) {
    throw await buildGitHubError(response, 'read');
  }

  const payload = (await response.json()) as GitHubContentResponse;
  const decoded = atob(payload.content.replace(/\n/g, ''));
  return { doc: parseDocument(decoded), sha: payload.sha };
}

async function writeRemoteDoc(doc: GlobalRecipeDoc, token: string, message: string, sha?: string): Promise<void> {
  const content = btoa(JSON.stringify(doc, null, 2));
  const response = await fetch(CONTENTS_API, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content,
      sha,
      branch: BRANCH,
    }),
  });

  if (!response.ok) {
    throw await buildGitHubError(response, 'write');
  }
}

export async function publishGlobalRecipe(recipe: MasterRecipe, token: string): Promise<MasterRecipe[]> {
  const { doc, sha } = await getRemoteDoc(token);
  const nextRecipes = mergeRecipe(doc.recipes, recipe);
  const nextDoc: GlobalRecipeDoc = {
    updatedAt: Date.now(),
    recipes: nextRecipes,
  };

  await writeRemoteDoc(nextDoc, token, `chore: update global master recipes (${recipe.inputA}+${recipe.inputB})`, sha);
  writeCachedRecipes(nextRecipes);

  return nextRecipes;
}

export async function publishGlobalRecipes(recipes: MasterRecipe[], token: string): Promise<MasterRecipe[]> {
  const incoming = recipes.slice(0, 1200);
  const { doc, sha } = await getRemoteDoc(token);
  const nextRecipes = mergeRecipes(doc.recipes, incoming).slice(0, 1200);
  const nextDoc: GlobalRecipeDoc = {
    updatedAt: Date.now(),
    recipes: nextRecipes,
  };

  await writeRemoteDoc(nextDoc, token, `chore: bulk update global master recipes (${incoming.length})`, sha);
  writeCachedRecipes(nextRecipes);

  return nextRecipes;
}
