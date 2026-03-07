import { useState } from 'react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import './EmojiAtlas.css';

export function EmojiAtlas() {
  const [copied, setCopied] = useState<string | null>(null);

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

  return (
    <section className="emoji-atlas">
      <div className="emoji-atlas-header">
        <h3>😀 Emoji Atlas</h3>
        <span>Search + click to copy</span>
      </div>
      <div className="emoji-picker-shell">
        <EmojiPicker
          onEmojiClick={onEmojiClick}
          lazyLoadEmojis
          skinTonesDisabled
          width="100%"
          height={360}
          theme={Theme.DARK}
          searchPlaceHolder="Search every available emoji..."
        />
      </div>
      {copied && <p className="emoji-copy-status">Copied: {copied}</p>}
    </section>
  );
}
