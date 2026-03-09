import type { EmojiAtlasEntry } from '../types';
import { decodeUtf8Base64, encodeUtf8Base64 } from '../utils/base64';

const OWNER = 'jsr1151';
const REPO = 'wondercraft';
const BRANCH = 'main';
const FILE_PATH = 'shared/custom-emojis.json';

const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE_PATH}`;
const CONTENTS_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

export const GLOBAL_EMOJI_TOKEN_KEY = 'wondercraft_global_emoji_token';

interface EmojiAtlasDoc {
  updatedAt: number;
  entries: EmojiAtlasEntry[];
}

interface GitHubContentResponse {
  sha: string;
  content: string;
  encoding: 'base64' | string;
}

function parseDocument(raw: string): EmojiAtlasDoc {
  const fallback: EmojiAtlasDoc = { updatedAt: Date.now(), entries: [] };
  try {
    const parsed = JSON.parse(raw) as EmojiAtlasDoc | EmojiAtlasEntry[];
    if (Array.isArray(parsed)) {
      return { updatedAt: Date.now(), entries: parsed };
    }
    if (!parsed || !Array.isArray(parsed.entries)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function mergeEntry(entries: EmojiAtlasEntry[], incoming: EmojiAtlasEntry): EmojiAtlasEntry[] {
  const next = [incoming, ...entries.filter((entry) => entry.id !== incoming.id)].slice(0, 2000);
  return next;
}

export async function fetchGlobalEmojiEntries(): Promise<EmojiAtlasEntry[]> {
  const url = `${RAW_URL}?t=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return [];
  const text = await response.text();
  return parseDocument(text).entries;
}

async function getRemoteDoc(token: string): Promise<{ doc: EmojiAtlasDoc; sha?: string }> {
  const response = await fetch(CONTENTS_API, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status === 404) {
    return { doc: { updatedAt: Date.now(), entries: [] } };
  }

  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status})`);
  }

  const payload = (await response.json()) as GitHubContentResponse;
  const decoded = decodeUtf8Base64(payload.content);
  return { doc: parseDocument(decoded), sha: payload.sha };
}

export async function publishGlobalEmojiEntry(entry: EmojiAtlasEntry, token: string): Promise<EmojiAtlasEntry[]> {
  const { doc, sha } = await getRemoteDoc(token);
  const nextEntries = mergeEntry(doc.entries, entry);
  const nextDoc: EmojiAtlasDoc = {
    updatedAt: Date.now(),
    entries: nextEntries,
  };

  const content = encodeUtf8Base64(JSON.stringify(nextDoc, null, 2));
  const response = await fetch(CONTENTS_API, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore: add global emoji atlas entry (${entry.label})`,
      content,
      sha,
      branch: BRANCH,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub write failed (${response.status})`);
  }

  return nextEntries;
}
