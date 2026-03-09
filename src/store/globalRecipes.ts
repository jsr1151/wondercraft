import type { MasterRecipe } from '../types';
import bundledRecipeDoc from '../../shared/master-recipes.json';
import { decodeUtf8Base64, encodeUtf8Base64 } from '../utils/base64';

const OWNER = 'jsr1151';
const REPO = 'wondercraft';
const BRANCH = 'main';
const SHARED_FILE_PATH = 'shared/master-recipes.json';
const PUBLIC_FILE_PATH = 'public/shared-master-recipes.json';

const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${SHARED_FILE_PATH}`;
const LOCAL_URL = import.meta.env.BASE_URL + 'shared-master-recipes.json';
const GLOBAL_RECIPE_CACHE_KEY = 'wondercraft_cached_shared_recipes_v1';

/** Recipes bundled at build time — always available, even offline. */
const BUNDLED_RECIPES: MasterRecipe[] = (bundledRecipeDoc as { recipes: MasterRecipe[] }).recipes ?? [];

export function getBundledGlobalRecipes(): MasterRecipe[] {
  return [...BUNDLED_RECIPES];
}

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

function getContentsApi(filePath: string): string {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
}

export interface PublishSkippedRecipe {
  recipe: MasterRecipe;
  reason: string;
}

export interface PublishGlobalRecipesResult {
  recipes: MasterRecipe[];
  publishedPairs: string[];
  skipped: PublishSkippedRecipe[];
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

async function getRemoteDoc(filePath: string, token: string): Promise<{ doc: GlobalRecipeDoc; sha?: string }> {
  const response = await fetch(getContentsApi(filePath), {
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
  const decoded = decodeUtf8Base64(payload.content);
  return { doc: parseDocument(decoded), sha: payload.sha };
}

async function writeRemoteDoc(filePath: string, doc: GlobalRecipeDoc, token: string, message: string, sha?: string): Promise<void> {
  const content = encodeUtf8Base64(JSON.stringify(doc, null, 2));
  const response = await fetch(getContentsApi(filePath), {
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

async function writeRecipeDocToRepo(doc: GlobalRecipeDoc, token: string, message: string): Promise<void> {
  const [{ sha: sharedSha }, { sha: publicSha }] = await Promise.all([
    getRemoteDoc(SHARED_FILE_PATH, token),
    getRemoteDoc(PUBLIC_FILE_PATH, token),
  ]);

  await writeRemoteDoc(SHARED_FILE_PATH, doc, token, message, sharedSha);
  await writeRemoteDoc(PUBLIC_FILE_PATH, doc, token, message, publicSha);
}

export async function publishGlobalRecipe(recipe: MasterRecipe, token: string): Promise<PublishGlobalRecipesResult> {
  const { doc } = await getRemoteDoc(SHARED_FILE_PATH, token);
  const nextRecipes = mergeRecipe(doc.recipes, recipe);
  const nextDoc: GlobalRecipeDoc = {
    updatedAt: Date.now(),
    recipes: nextRecipes,
  };

  await writeRecipeDocToRepo(nextDoc, token, `chore: update global master recipes (${recipe.inputA}+${recipe.inputB})`);
  writeCachedRecipes(nextRecipes);

  return {
    recipes: nextRecipes,
    publishedPairs: [normalizePair(recipe.inputA, recipe.inputB)],
    skipped: [],
  };
}

export async function publishGlobalRecipes(recipes: MasterRecipe[], token: string): Promise<PublishGlobalRecipesResult> {
  const incoming = recipes.slice(0, 1200);
  const { doc } = await getRemoteDoc(SHARED_FILE_PATH, token);
  const nextRecipes = mergeRecipes(doc.recipes, incoming).slice(0, 1200);
  const nextDoc: GlobalRecipeDoc = {
    updatedAt: Date.now(),
    recipes: nextRecipes,
  };

  await writeRecipeDocToRepo(nextDoc, token, `chore: bulk update global master recipes (${incoming.length})`);
  writeCachedRecipes(nextRecipes);

  return {
    recipes: nextRecipes,
    publishedPairs: incoming.map((recipe) => normalizePair(recipe.inputA, recipe.inputB)),
    skipped: [],
  };
}
