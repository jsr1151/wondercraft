import { useMemo, useState } from 'react';
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';
import './EmojiAtlas.css';

interface CustomEmoji {
  id: string;
  label: string;
  value: string;
}

const CUSTOM_EMOJI_KEY = 'wondercraft_custom_emoji_atlas_v1';

function loadCustomEmojis(): CustomEmoji[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EMOJI_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomEmoji[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveCustomEmojis(items: CustomEmoji[]): void {
  localStorage.setItem(CUSTOM_EMOJI_KEY, JSON.stringify(items));
}

export function EmojiAtlas() {
  const [copied, setCopied] = useState<string | null>(null);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>(() => loadCustomEmojis());
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customSearch, setCustomSearch] = useState('');

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

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied('Copy failed');
    }
  };

  const addCustomEmoji = () => {
    const value = customValue.trim();
    const label = customLabel.trim();
    if (!value) return;

    const item: CustomEmoji = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: label || value,
      value,
    };

    const next = [item, ...customEmojis].slice(0, 500);
    setCustomEmojis(next);
    saveCustomEmojis(next);
    setCustomLabel('');
    setCustomValue('');
  };

  const removeCustomEmoji = (id: string) => {
    const next = customEmojis.filter((item) => item.id !== id);
    setCustomEmojis(next);
    saveCustomEmojis(next);
  };

  const filteredCustom = useMemo(() => {
    const query = customSearch.trim().toLowerCase();
    if (!query) return customEmojis;
    return customEmojis.filter((item) => item.label.toLowerCase().includes(query) || item.value.includes(query));
  }, [customEmojis, customSearch]);

  return (
    <section className="emoji-atlas">
      <div className="emoji-atlas-header">
        <h3>😀 Emoji Atlas</h3>
        <span>Cartoony set + your imported emoji shelf</span>
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
        <button onClick={addCustomEmoji}>Import</button>
      </div>

      <input
        className="emoji-custom-search"
        value={customSearch}
        onChange={(event) => setCustomSearch(event.target.value)}
        placeholder="Search your imported emojis..."
      />

      <div className="emoji-custom-list">
        {filteredCustom.length === 0 ? (
          <p className="emoji-custom-empty">No imported emojis yet.</p>
        ) : (
          filteredCustom.map((item) => (
            <div key={item.id} className="emoji-custom-item">
              <button className="emoji-custom-copy" onClick={() => copyText(item.value)} title="Copy emoji">
                <span className="emoji-custom-value">{item.value}</span>
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
          emojiStyle={EmojiStyle.APPLE}
          searchPlaceHolder="Search every available emoji..."
        />
      </div>
      {copied && <p className="emoji-copy-status">Copied: {copied}</p>}
    </section>
  );
}
