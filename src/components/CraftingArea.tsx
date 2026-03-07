import { useState, type ChangeEventHandler, type ClipboardEventHandler, type DragEvent } from 'react';
import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { resolveElementIconRaw } from '../utils/iconResolver';
import type { WorldEffectMap } from '../types';
import { ElementIcon } from './ElementIcon';
import './CraftingArea.css';

const DEFAULT_ATTR_KEYS = [
  'water', 'brightness', 'earthy', 'air', 'vegetation', 'heat', 'cold', 'atmosphere',
  'pollution', 'civilization', 'technology', 'magic', 'ruin', 'life',
] as const;

const MAX_ICON_IMPORT_BYTES = 400_000;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Invalid file contents'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function buildAttrDraft(worldEffects: WorldEffectMap = {}): Record<string, string> {
  const next: Record<string, string> = { ...Object.fromEntries(DEFAULT_ATTR_KEYS.map((key) => [key, ''])) };

  for (const [key, value] of Object.entries(worldEffects)) {
    next[key] = typeof value === 'number' ? String(value) : '';
  }

  return next;
}

export function CraftingArea() {
  const { state, dispatch } = useGame();
  const { selectedSlotA, selectedSlotB, lastCombinationResult, iconOverrides, effectOverrides } = state;
  const [dragTarget, setDragTarget] = useState<'A' | 'B' | null>(null);
  const [showIconEditor, setShowIconEditor] = useState(false);
  const [iconTarget, setIconTarget] = useState('');
  const [iconValue, setIconValue] = useState('');
  const [iconStatus, setIconStatus] = useState<string | null>(null);
  const [showAttrEditor, setShowAttrEditor] = useState(false);
  const [attrTarget, setAttrTarget] = useState('');
  const [attrDraft, setAttrDraft] = useState<Record<string, string>>({});
  const [newAttrKey, setNewAttrKey] = useState('');

  const elemA = selectedSlotA ? ELEMENTS.find(e => e.id === selectedSlotA) : null;
  const elemB = selectedSlotB ? ELEMENTS.find(e => e.id === selectedSlotB) : null;
  const resultElem = lastCombinationResult?.elementId
    ? ELEMENTS.find(e => e.id === lastCombinationResult.elementId)
    : null;

  const canCombine = !!selectedSlotA && !!selectedSlotB;

  const handleCombine = () => {
    if (canCombine) dispatch({ type: 'TRY_COMBINE' });
  };

  const clearSlotA = () => dispatch({ type: 'SELECT_SLOT_A', elementId: null });
  const clearSlotB = () => dispatch({ type: 'SELECT_SLOT_B', elementId: null });

  const handleDrop = (slot: 'A' | 'B') => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const elementId = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!elementId) return;

    if (slot === 'A') {
      dispatch({ type: 'SELECT_SLOT_A', elementId });
    } else {
      dispatch({ type: 'SELECT_SLOT_B', elementId });
    }
    setDragTarget(null);
  };

  const handleDragOver = (slot: 'A' | 'B') => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragTarget !== slot) setDragTarget(slot);
  };

  const handleDragLeave = () => setDragTarget(null);

  const applyIconOverride = () => {
    const target = ELEMENTS.find((element) =>
      element.name.toLowerCase() === iconTarget.trim().toLowerCase() ||
      element.id.toLowerCase() === iconTarget.trim().toLowerCase()
    );
    if (!target || !iconValue.trim()) return;
    dispatch({ type: 'SET_ICON_OVERRIDE', elementId: target.id, icon: iconValue.trim() });
  };

  const clearIconOverride = () => {
    const target = ELEMENTS.find((element) =>
      element.name.toLowerCase() === iconTarget.trim().toLowerCase() ||
      element.id.toLowerCase() === iconTarget.trim().toLowerCase()
    );
    if (!target) return;
    dispatch({ type: 'CLEAR_ICON_OVERRIDE', elementId: target.id });
  };

  const onIconTargetDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const elementId = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!elementId) return;
    const element = ELEMENTS.find((entry) => entry.id === elementId);
    if (!element) return;
    setIconTarget(element.name);
    setIconValue(resolveElementIconRaw(element, iconOverrides));
  };

  const importIconImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setIconStatus('Only image files are supported for icon paste/upload.');
      return;
    }
    if (file.size > MAX_ICON_IMPORT_BYTES) {
      setIconStatus('Icon image is too large. Keep it under 400KB.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setIconValue(dataUrl);
      setIconStatus('Image pasted into icon value. Click Apply to save it.');
    } catch {
      setIconStatus('Failed to import image for icon.');
    }
  };

  const onIconPaste: ClipboardEventHandler<HTMLInputElement> = async (event) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (file) await importIconImage(file);
  };

  const onIconUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importIconImage(file);
    event.target.value = '';
  };

  const parseElementByNameOrId = (value: string) => ELEMENTS.find((element) =>
    element.name.toLowerCase() === value.trim().toLowerCase() ||
    element.id.toLowerCase() === value.trim().toLowerCase()
  );

  const loadAttrDraftForTarget = (targetNameOrId: string) => {
    const target = parseElementByNameOrId(targetNameOrId);
    if (!target) return;
    const merged = { ...(target.worldEffects ?? {}), ...(effectOverrides[target.id] ?? {}) };
    setAttrDraft(buildAttrDraft(merged));
  };

  const onAttrTargetDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const elementId = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!elementId) return;
    const element = ELEMENTS.find((entry) => entry.id === elementId);
    if (!element) return;
    setAttrTarget(element.name);
    loadAttrDraftForTarget(element.name);
  };

  const applyAttrOverride = () => {
    const target = parseElementByNameOrId(attrTarget);
    if (!target) return;

    const worldEffects: WorldEffectMap = {};
    for (const [key, rawValue] of Object.entries(attrDraft)) {
      const keyName = key.trim();
      const raw = rawValue?.trim();
      if (!keyName || !raw) continue;
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      worldEffects[keyName] = num;
    }

    dispatch({ type: 'SET_EFFECT_OVERRIDE', elementId: target.id, worldEffects });
  };

  const addCustomAttrKey = () => {
    const key = newAttrKey.trim().toLowerCase();
    if (!key) return;
    setAttrDraft((prev) => (key in prev ? prev : { ...prev, [key]: '' }));
    setNewAttrKey('');
  };

  const orderedAttrKeys = [
    ...DEFAULT_ATTR_KEYS,
    ...Object.keys(attrDraft).filter((key) => !DEFAULT_ATTR_KEYS.includes(key as (typeof DEFAULT_ATTR_KEYS)[number])).sort(),
  ];

  const clearAttrOverride = () => {
    const target = parseElementByNameOrId(attrTarget);
    if (!target) return;
    dispatch({ type: 'CLEAR_EFFECT_OVERRIDE', elementId: target.id });
    setAttrDraft(buildAttrDraft(target.worldEffects));
  };

  return (
    <div className="crafting-area">
      <h2 className="crafting-title">⚗️ Crafting</h2>
      <div className="crafting-slots">
        <div
          className={`craft-slot ${elemA ? 'filled' : 'empty'} ${dragTarget === 'A' ? 'drag-target' : ''}`}
          onDragOver={handleDragOver('A')}
          onDrop={handleDrop('A')}
          onDragLeave={handleDragLeave}
        >
          {elemA ? (
            <div className="craft-slot-content" onClick={clearSlotA}>
              <ElementIcon
                element={elemA}
                iconOverrides={iconOverrides}
                className="craft-slot-emoji"
                imageClassName="craft-slot-emoji-image"
              />
              <span className="craft-slot-name">{elemA.name}</span>
              <span className="craft-slot-clear">✕</span>
            </div>
          ) : (
            <div className="craft-slot-placeholder">
              <span>Drop or click for A</span>
            </div>
          )}
        </div>

        <div className="craft-plus">+</div>

        <div
          className={`craft-slot ${elemB ? 'filled' : 'empty'} ${dragTarget === 'B' ? 'drag-target' : ''}`}
          onDragOver={handleDragOver('B')}
          onDrop={handleDrop('B')}
          onDragLeave={handleDragLeave}
        >
          {elemB ? (
            <div className="craft-slot-content" onClick={clearSlotB}>
              <ElementIcon
                element={elemB}
                iconOverrides={iconOverrides}
                className="craft-slot-emoji"
                imageClassName="craft-slot-emoji-image"
              />
              <span className="craft-slot-name">{elemB.name}</span>
              <span className="craft-slot-clear">✕</span>
            </div>
          ) : (
            <div className="craft-slot-placeholder">
              <span>Drop or click for B</span>
            </div>
          )}
        </div>

        <div className="craft-equals">=</div>

        <div className={`craft-result ${lastCombinationResult ? (lastCombinationResult.success ? 'success' : 'fail') : ''}`}>
          {lastCombinationResult?.success && resultElem ? (
            <div className="craft-result-content">
              <ElementIcon
                element={resultElem}
                iconOverrides={iconOverrides}
                className="craft-result-emoji"
                imageClassName="craft-result-emoji-image"
              />
              <span className="craft-result-name">{resultElem.name}</span>
              {lastCombinationResult.isNew && (
                <span className="craft-result-new">NEW!</span>
              )}
            </div>
          ) : lastCombinationResult?.success === false ? (
            <div className="craft-result-fail">✗ No recipe</div>
          ) : (
            <div className="craft-result-placeholder">?</div>
          )}
        </div>
      </div>

      <button
        className={`craft-button ${canCombine ? 'active' : 'disabled'}`}
        onClick={handleCombine}
        disabled={!canCombine}
      >
        ⚗️ Combine
      </button>

      <button
        className="craft-button icon-editor-toggle"
        onClick={() => {
          const prefill = elemA ?? resultElem ?? elemB;
          if (prefill) {
            setIconTarget(prefill.name);
            setIconValue(resolveElementIconRaw(prefill, iconOverrides));
          }
          setShowIconEditor((v) => !v);
        }}
      >
        🖼️ Update Icon
      </button>

      <button
        className="craft-button icon-editor-toggle"
        onClick={() => {
          const prefill = resultElem ?? elemA ?? elemB;
          if (prefill) {
            setAttrTarget(prefill.name);
            loadAttrDraftForTarget(prefill.name);
          }
          setShowAttrEditor((v) => !v);
        }}
      >
        🧬 Update Attributes
      </button>

      {showIconEditor && (
        <div className="icon-editor">
          <input
            list="craft-icon-targets"
            value={iconTarget}
            onChange={(event) => setIconTarget(event.target.value)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onIconTargetDrop}
            placeholder="Drop element or type name"
          />
          <input
            value={iconValue}
            onChange={(event) => setIconValue(event.target.value)}
            onPaste={(event) => void onIconPaste(event)}
            placeholder="Paste Apple emoji, image URL, or image from clipboard"
          />
          <input type="file" accept="image/*" onChange={(event) => void onIconUpload(event)} />
          <button onClick={applyIconOverride}>Apply</button>
          <button className="clear-icon" onClick={clearIconOverride}>Reset</button>

          <datalist id="craft-icon-targets">
            {ELEMENTS.map((element) => (
              <option key={element.id} value={element.name} />
            ))}
          </datalist>
        </div>
      )}

      {iconStatus && <p className="craft-icon-status">{iconStatus}</p>}

      {showAttrEditor && (
        <div className="attr-editor">
          <input
            list="craft-icon-targets"
            value={attrTarget}
            onChange={(event) => {
              setAttrTarget(event.target.value);
              loadAttrDraftForTarget(event.target.value);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onAttrTargetDrop}
            placeholder="Drop element or type name"
          />

          <div className="attr-grid">
            {orderedAttrKeys.map((key) => (
              <label key={key} className="attr-field">
                <span>{key}</span>
                <input
                  value={attrDraft[key] ?? ''}
                  onChange={(event) => setAttrDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          <div className="attr-key-add">
            <input
              value={newAttrKey}
              onChange={(event) => setNewAttrKey(event.target.value)}
              placeholder="New attribute key (example: gravity)"
            />
            <button onClick={addCustomAttrKey}>Add Attribute Key</button>
          </div>

          <div className="attr-actions">
            <button onClick={applyAttrOverride}>Apply Attributes</button>
            <button className="clear-icon" onClick={clearAttrOverride}>Reset Attributes</button>
          </div>
        </div>
      )}

      {lastCombinationResult?.success && resultElem && (
        <div className="craft-discovery-text">
          <p className="discovery-name">
            <ElementIcon
              element={resultElem}
              iconOverrides={iconOverrides}
              className="craft-discovery-emoji"
              imageClassName="craft-discovery-emoji-image"
            />
            {' '}
            {resultElem.name}
          </p>
          <p className="discovery-desc">{resultElem.description}</p>
        </div>
      )}
    </div>
  );
}
