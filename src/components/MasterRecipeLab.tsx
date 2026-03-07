import { useMemo, useState, type ChangeEventHandler, type ClipboardEventHandler, type DragEvent } from 'react';
import { ELEMENTS } from '../data/elements';
import { useGame } from '../store/useGame';
import { GLOBAL_RECIPE_TOKEN_KEY, fetchGlobalRecipes, publishGlobalRecipe } from '../store/globalRecipes';
import type { Element, MasterRecipe, WorldEffectMap } from '../types';
import { isImageIcon, resolveElementIcon, resolveElementIconRaw } from '../utils/iconResolver';
import { findElementByNameOrId, resolveElementDescription, resolveElementName } from '../utils/nameResolver';
import './MasterRecipeLab.css';

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

function elementLabel(
  id: string,
  elements: Element[],
  iconOverrides: Record<string, string>,
  nameOverrides: Record<string, string>
): string {
  const element = elements.find((item) => item.id === id);
  if (!element) return id;
  return `${resolveElementIcon(element, iconOverrides)} ${resolveElementName(element, nameOverrides)}`;
}

function buildAttrDraft(worldEffects: WorldEffectMap = {}): Record<string, string> {
  const next: Record<string, string> = { ...Object.fromEntries(DEFAULT_ATTR_KEYS.map((key) => [key, ''])) };
  for (const [key, value] of Object.entries(worldEffects)) {
    next[key] = typeof value === 'number' ? String(value) : '';
  }
  return next;
}

export function MasterRecipeLab() {
  const { state, dispatch } = useGame();
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [publishGlobal, setPublishGlobal] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem(GLOBAL_RECIPE_TOKEN_KEY) ?? '');
  const [saving, setSaving] = useState(false);
  const [attrDraft, setAttrDraft] = useState<Record<string, string>>(buildAttrDraft());
  const [newAttrKey, setNewAttrKey] = useState('');
  const [outputIcon, setOutputIcon] = useState('');
  const [outputName, setOutputName] = useState('');
  const [outputDescription, setOutputDescription] = useState('');
  const [iconStatus, setIconStatus] = useState<string | null>(null);

  const allElements = useMemo(() => [...ELEMENTS, ...state.customElements], [state.customElements]);

  const elementOptions = useMemo(
    () => allElements.map((element) => resolveElementName(element, state.nameOverrides)).sort((a, b) => a.localeCompare(b)),
    [allElements, state.nameOverrides]
  );

  const lookupElementId = (value: string): string | null => {
    const match = findElementByNameOrId(value, allElements, state.nameOverrides);
    return match?.id ?? null;
  };

  const createCustomElementId = (label: string): string => {
    const base = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'element';

    let candidate = `custom_${base}`;
    let idx = 2;
    const ids = new Set(allElements.map((element) => element.id));
    while (ids.has(candidate)) {
      candidate = `custom_${base}_${idx++}`;
    }
    return candidate;
  };

  const setFromElementDrop = (target: 'A' | 'B' | 'OUT') => (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!id) return;
    const element = allElements.find((item) => item.id === id);
    if (!element) return;

    if (target === 'A') setInputA(resolveElementName(element, state.nameOverrides));
    if (target === 'B') setInputB(resolveElementName(element, state.nameOverrides));
    if (target === 'OUT') {
      setOutput(resolveElementName(element, state.nameOverrides));
      setOutputIcon(resolveElementIconRaw(element, state.iconOverrides));
      setOutputName(resolveElementName(element, state.nameOverrides));
      setOutputDescription(resolveElementDescription(element, state.descriptionOverrides));
      const merged = { ...(element.worldEffects ?? {}), ...(state.effectOverrides[element.id] ?? {}) };
      setAttrDraft(buildAttrDraft(merged));
    }
  };

  const allowDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
  };

  const sortedRecipes = useMemo(
    () => [...state.masterRecipes].sort((a, b) => b.createdAt - a.createdAt),
    [state.masterRecipes]
  );

  const orderedAttrKeys = [
    ...DEFAULT_ATTR_KEYS,
    ...Object.keys(attrDraft).filter((key) => !DEFAULT_ATTR_KEYS.includes(key as (typeof DEFAULT_ATTR_KEYS)[number])).sort(),
  ];

  const setOutputAndDraft = (value: string) => {
    setOutput(value);
    const outputId = lookupElementId(value);
    if (!outputId) return;
    const baseElement = allElements.find((element) => element.id === outputId);
    if (!baseElement) return;
    setOutputIcon(resolveElementIconRaw(baseElement, state.iconOverrides));
    setOutputName(resolveElementName(baseElement, state.nameOverrides));
    setOutputDescription(resolveElementDescription(baseElement, state.descriptionOverrides));
    const merged = { ...(baseElement.worldEffects ?? {}), ...(state.effectOverrides[outputId] ?? {}) };
    setAttrDraft(buildAttrDraft(merged));
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
      setOutputIcon(await fileToDataUrl(file));
      setIconStatus('Image pasted into output icon. Save recipe to apply.');
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

  const addCustomAttrKey = () => {
    const key = newAttrKey.trim().toLowerCase();
    if (!key) return;
    setAttrDraft((prev) => (key in prev ? prev : { ...prev, [key]: '' }));
    setNewAttrKey('');
  };

  const addMasterRecipe = async () => {
    const inputAId = lookupElementId(inputA);
    const inputBId = lookupElementId(inputB);
    const outputMatch = findElementByNameOrId(output, allElements, state.nameOverrides);
    const hasOutputText = output.trim().length > 0;

    if (!inputAId || !inputBId || !hasOutputText) {
      const missing: string[] = [];
      if (!inputAId) missing.push(`A ("${inputA.trim() || 'empty'}")`);
      if (!inputBId) missing.push(`B ("${inputB.trim() || 'empty'}")`);
      if (!hasOutputText) missing.push(`Output ("${output.trim() || 'empty'}")`);
      setStatus(`Invalid element value for: ${missing.join(', ')}.`);
      return;
    }

    let outputId = outputMatch?.id;
    const outputDisplayName = outputName.trim() || output.trim();

    if (!outputId) {
      outputId = createCustomElementId(outputDisplayName);
      const newElement: Element = {
        id: outputId,
        name: outputDisplayName,
        category: 'Weird',
        description: outputDescription.trim() || `A new element born from ${inputA.trim()} + ${inputB.trim()}.`,
        tags: ['custom', 'player-made'],
        discovered: false,
        emoji: outputIcon.trim() && !isImageIcon(outputIcon.trim()) ? outputIcon.trim() : '✨',
      };
      dispatch({ type: 'UPSERT_CUSTOM_ELEMENT', element: newElement });
    }

    const outputWorldEffects: WorldEffectMap = {};
    for (const [key, rawValue] of Object.entries(attrDraft)) {
      const name = key.trim();
      const raw = rawValue?.trim();
      if (!name || !raw) continue;
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      outputWorldEffects[name] = num;
    }

    const recipe: MasterRecipe = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      inputA: inputAId,
      inputB: inputBId,
      output: outputId,
      createdAt: Date.now(),
      outputWorldEffects: Object.keys(outputWorldEffects).length > 0 ? outputWorldEffects : undefined,
    };

    dispatch({ type: 'ADD_MASTER_RECIPE', recipe });
    if (Object.keys(outputWorldEffects).length > 0) {
      dispatch({ type: 'SET_EFFECT_OVERRIDE', elementId: outputId, worldEffects: outputWorldEffects });
    }
    if (outputIcon.trim()) {
      dispatch({ type: 'SET_ICON_OVERRIDE', elementId: outputId, icon: outputIcon.trim() });
    }
    if (outputName.trim()) {
      dispatch({ type: 'SET_NAME_OVERRIDE', elementId: outputId, name: outputName.trim() });
    }
    if (outputDescription.trim()) {
      dispatch({ type: 'SET_DESCRIPTION_OVERRIDE', elementId: outputId, description: outputDescription.trim() });
    }

    if (publishGlobal) {
      if (!token.trim()) {
        setStatus('Enter a GitHub token to publish globally. Recipe was still saved locally.');
      } else {
        try {
          setSaving(true);
          localStorage.setItem(GLOBAL_RECIPE_TOKEN_KEY, token.trim());
          await publishGlobalRecipe(recipe, token.trim());
          const synced = await fetchGlobalRecipes();
          dispatch({ type: 'SET_SHARED_RECIPES', recipes: synced });
          setStatus('Recipe saved locally and published globally.');
        } catch {
          setStatus('Local save succeeded, but global publish failed. Check token permissions.');
        } finally {
          setSaving(false);
        }
      }
    } else {
      setStatus(outputMatch
        ? 'Master recipe saved locally. This pairing now crafts immediately.'
        : `Master recipe saved locally and new element created: ${outputDisplayName}.`);
    }

    setInputA('');
    setInputB('');
    setOutput('');
    setOutputIcon('');
    setOutputName('');
    setOutputDescription('');
    setAttrDraft(buildAttrDraft());
  };

  return (
    <section className="master-recipe-lab">
      <div className="master-recipe-header">
        <h3>🧪 Master Recipes</h3>
        <span className="master-recipe-count">{state.masterRecipes.length} local / {state.sharedRecipes.length} global</span>
      </div>

      <p className="master-recipe-note">
        These recipes override normal crafting. Use an existing output to overwrite, or type a new output name to create a new element.
      </p>

      <div className="master-recipe-form">
        <input
          list="element-options"
          value={inputA}
          onChange={(event) => setInputA(event.target.value)}
          placeholder="Input A"
          onDragOver={allowDrop}
          onDrop={setFromElementDrop('A')}
        />
        <span>+</span>
        <input
          list="element-options"
          value={inputB}
          onChange={(event) => setInputB(event.target.value)}
          placeholder="Input B"
          onDragOver={allowDrop}
          onDrop={setFromElementDrop('B')}
        />
        <span>→</span>
        <input
          list="element-options"
          value={output}
          onChange={(event) => setOutputAndDraft(event.target.value)}
          placeholder="Output"
          onDragOver={allowDrop}
          onDrop={setFromElementDrop('OUT')}
        />
        <button onClick={addMasterRecipe}>Save</button>
      </div>

      <div className="master-recipe-icon">
        <p>Output Icon/Name (optional)</p>
        <div className="master-recipe-icon-row">
          <input
            value={outputIcon}
            onChange={(event) => setOutputIcon(event.target.value)}
            onPaste={(event) => void onIconPaste(event)}
            placeholder="Paste emoji, image URL, or image from clipboard"
          />
          <input type="file" accept="image/*" onChange={(event) => void onIconUpload(event)} />
        </div>
        <div className="master-recipe-icon-row single">
          <input
            value={outputName}
            onChange={(event) => setOutputName(event.target.value)}
            placeholder="Output display name (example: Puddle)"
          />
        </div>
        <div className="master-recipe-icon-row single">
          <input
            value={outputDescription}
            onChange={(event) => setOutputDescription(event.target.value)}
            placeholder="Output description (optional)"
          />
        </div>
        {iconStatus && <p className="master-recipe-token-help">{iconStatus}</p>}
      </div>

      <details className="master-recipe-section" open>
        <summary className="master-recipe-section-summary">Output Attributes (optional)</summary>
        <div className="master-recipe-attrs">
          <div className="master-recipe-attr-grid">
            {orderedAttrKeys.map((key) => (
              <label key={key} className="master-recipe-attr-field">
                <span>{key}</span>
                <input
                  value={attrDraft[key] ?? ''}
                  onChange={(event) => setAttrDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          <div className="master-recipe-attr-add">
            <input
              value={newAttrKey}
              onChange={(event) => setNewAttrKey(event.target.value)}
              placeholder="New attribute key (example: gravity)"
            />
            <button onClick={addCustomAttrKey}>Add Attribute Key</button>
          </div>
        </div>
      </details>

      <div className="master-recipe-publish">
        <label>
          <input
            type="checkbox"
            checked={publishGlobal}
            onChange={(event) => setPublishGlobal(event.target.checked)}
          />
          Publish globally (writes to `shared/master-recipes.json`)
        </label>
        {publishGlobal && (
          <input
            type="password"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              localStorage.setItem(GLOBAL_RECIPE_TOKEN_KEY, event.target.value);
            }}
            placeholder="GitHub token with Contents: Write"
          />
        )}
        {publishGlobal && (
          <p className="master-recipe-token-help">
            One-time setup: create a classic token at `github.com/settings/tokens` with `repo` scope.
            Once entered here, it stays saved in this browser.
          </p>
        )}
      </div>

      <datalist id="element-options">
        {elementOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {status && <p className="master-recipe-status">{status}</p>}
      {saving && <p className="master-recipe-status">Publishing...</p>}

      <details className="master-recipe-section" open>
        <summary className="master-recipe-section-summary">
          Current Local Recipes ({sortedRecipes.length})
        </summary>
        <div className="master-recipe-list">
          {sortedRecipes.length === 0 ? (
            <p className="master-recipe-empty">No custom recipes yet.</p>
          ) : (
            sortedRecipes.map((recipe) => (
              <div key={recipe.id} className="master-recipe-item">
                <span>{elementLabel(recipe.inputA, allElements, state.iconOverrides, state.nameOverrides)}</span>
                <span>+</span>
                <span>{elementLabel(recipe.inputB, allElements, state.iconOverrides, state.nameOverrides)}</span>
                <span>→</span>
                <span>{elementLabel(recipe.output, allElements, state.iconOverrides, state.nameOverrides)}</span>
                <span className="master-recipe-attr-tag">
                  {recipe.outputWorldEffects ? `${Object.keys(recipe.outputWorldEffects).length} attrs` : 'No attrs'}
                </span>
                <button
                  className="master-recipe-remove"
                  onClick={() => dispatch({ type: 'REMOVE_MASTER_RECIPE', recipeId: recipe.id })}
                  title="Remove recipe"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </details>
    </section>
  );
}
