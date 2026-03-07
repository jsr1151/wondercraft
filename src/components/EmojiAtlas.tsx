import { useEffect, useMemo, useState, type ChangeEventHandler, type ClipboardEventHandler } from 'react';
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';
import { GLOBAL_EMOJI_TOKEN_KEY, fetchGlobalEmojiEntries, publishGlobalEmojiEntry } from '../store/globalEmojiAtlas';
import type { EmojiAtlasEntry } from '../types';
import './EmojiAtlas.css';

const CUSTOM_EMOJI_KEY = 'wondercraft_custom_emoji_atlas_v1';
const MAX_IMPORT_BYTES = 400_000;

function loadCustomEmojis(): EmojiAtlasEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EMOJI_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmojiAtlasEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveCustomEmojis(items: EmojiAtlasEntry[]): void {
  localStorage.setItem(CUSTOM_EMOJI_KEY, JSON.stringify(items));
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function EmojiAtlas() {
  const [copied, setCopied] = useState<string | null>(null);
  const [customEmojis, setCustomEmojis] = useState<EmojiAtlasEntry[]>(() => loadCustomEmojis());
  const [globalEmojis, setGlobalEmojis] = useState<EmojiAtlasEntry[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customSearch, setCustomSearch] = useState('');
  const [publishGlobal, setPublishGlobal] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem(GLOBAL_EMOJI_TOKEN_KEY) ?? '');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobalEmojiEntries()
      .then(setGlobalEmojis)
      .catch(() => {
        // Keep atlas usable even if global feed fails.
      });
  }, []);

  const onEmojiClick = async (emojiData: EmojiClickData) => {
    const value = emojiData.emoji;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied('Copy failed');
    }
  };

  const persistCustom = (next: EmojiAtlasEntry[]) => {
    setCustomEmojis(next);
    saveCustomEmojis(next);
  };

  const publishIfNeeded = async (entry: EmojiAtlasEntry) => {
    if (!publishGlobal) return;
    if (!token.trim()) {
      setStatus('Missing GitHub token. Imported locally only.');
      return;
    }

    try {
      localStorage.setItem(GLOBAL_EMOJI_TOKEN_KEY, token.trim());
      await publishGlobalEmojiEntry(entry, token.trim());
      const refreshed = await fetchGlobalEmojiEntries();
      setGlobalEmojis(refreshed);
      setStatus('Imported and published to global atlas.');
    } catch {
      setStatus('Imported locally, but global publish failed.');
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied('Copy failed');
    }
  };

  const addCustomEmoji = async () => {
    const value = customValue.trim();
    const label = customLabel.trim();
    if (!value) return;

    const item: EmojiAtlasEntry = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: label || value,
      value,
      kind: 'emoji',
      createdAt: Date.now(),
    };

    const next = [item, ...customEmojis].slice(0, 500);
    persistCustom(next);
    setCustomLabel('');
    setCustomValue('');
    setStatus('Imported to your local atlas.');
    await publishIfNeeded(item);
  };

  const importImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus('Only image files can be imported in this field.');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus('Image is too large. Keep imports under 400KB.');
      return;
    }

    try {
      const value = await fileToDataUrl(file);
      const item: EmojiAtlasEntry = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        label: customLabel.trim() || file.name || 'Imported image',
        value,
        kind: 'image',
        createdAt: Date.now(),
      };
      const next = [item, ...customEmojis].slice(0, 500);
      persistCustom(next);
      setStatus('Image imported to your local atlas.');
      await publishIfNeeded(item);
    } catch {
      setStatus('Image import failed.');
    }
  };

  const onImagePaste: ClipboardEventHandler<HTMLInputElement> = async (event) => {
    const items = Array.from(event.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();

    const file = imageItem.getAsFile();
    if (file) {
      await importImage(file);
    }
  };

  const onImageUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importImage(file);
    event.target.value = '';
  };

  const removeCustomEmoji = (id: string) => {
    const next = customEmojis.filter((item) => item.id !== id);
    persistCustom(next);
  };

  const filteredCustom = useMemo(() => {
    const query = customSearch.trim().toLowerCase();
    if (!query) return customEmojis;
    return customEmojis.filter((item) => item.label.toLowerCase().includes(query) || item.value.includes(query));
  }, [customEmojis, customSearch]);

  const filteredGlobal = useMemo(() => {
    const query = customSearch.trim().toLowerCase();
    if (!query) return globalEmojis;
    return globalEmojis.filter((item) => item.label.toLowerCase().includes(query) || item.value.includes(query));
  }, [globalEmojis, customSearch]);

  return (
    <section className="emoji-atlas">
      <div className="emoji-atlas-header">
        <h3>😀 Emoji Atlas</h3>
        <span>Native style + your imported emoji/image shelf</span>
      </div>

      <div className="emoji-custom-controls">
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          placeholder="Paste emoji or text symbol"
        />
        <input
          value={customLabel}
          onChange={(event) => setCustomLabel(event.target.value)}
          placeholder="Label (optional)"
        />
        <button onClick={() => void addCustomEmoji()}>Import Symbol</button>
      </div>

      <div className="emoji-custom-controls">
        <input
          onPaste={(event) => void onImagePaste(event)}
          placeholder="Paste image here (Ctrl/Cmd+V)"
          readOnly
        />
        <input type="file" accept="image/*" onChange={(event) => void onImageUpload(event)} />
      </div>

      <div className="emoji-global-controls">
        <label>
          <input
            type="checkbox"
            checked={publishGlobal}
            onChange={(event) => setPublishGlobal(event.target.checked)}
          />
          Save imports to repository atlas (global)
        </label>
        {publishGlobal && (
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="GitHub token with Contents: Write"
          />
        )}
      </div>

      <input
        className="emoji-custom-search"
        value={customSearch}
        onChange={(event) => setCustomSearch(event.target.value)}
        placeholder="Search your imported emojis..."
      />

      <div className="emoji-custom-list">
        {filteredGlobal.length === 0 ? (
          <p className="emoji-custom-empty">No global imported entries yet.</p>
        ) : (
          filteredGlobal.map((item) => (
            <div key={`g-${item.id}`} className="emoji-custom-item">
              <button className="emoji-custom-copy" onClick={() => void copyText(item.value)} title="Copy entry">
                {item.kind === 'image' ? (
                  <img src={item.value} alt={item.label} className="emoji-custom-image" />
                ) : (
                  <span className="emoji-custom-value">{item.value}</span>
                )}
                <span className="emoji-custom-label">{item.label} (global)</span>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="emoji-custom-list">
        {filteredCustom.length === 0 ? (
          <p className="emoji-custom-empty">No imported emojis yet.</p>
        ) : (
          filteredCustom.map((item) => (
            <div key={item.id} className="emoji-custom-item">
              <button className="emoji-custom-copy" onClick={() => void copyText(item.value)} title="Copy entry">
                {item.kind === 'image' ? (
                  <img src={item.value} alt={item.label} className="emoji-custom-image" />
                ) : (
                  <span className="emoji-custom-value">{item.value}</span>
                )}
                <span className="emoji-custom-label">{item.label}</span>
              </button>
              <button className="emoji-custom-remove" onClick={() => removeCustomEmoji(item.id)} title="Remove">
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="emoji-picker-shell">
        <EmojiPicker
          onEmojiClick={onEmojiClick}
          lazyLoadEmojis
          skinTonesDisabled
          width="100%"
          height={360}
          theme={Theme.DARK}
          emojiStyle={EmojiStyle.NATIVE}
          searchPlaceHolder="Search every available emoji..."
        />
      </div>
      {status && <p className="emoji-copy-status">{status}</p>}
      {copied && <p className="emoji-copy-status">Copied: {copied}</p>}
    </section>
  );
}
