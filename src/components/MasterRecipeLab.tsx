import { useMemo, useState, type ChangeEventHandler, type ClipboardEventHandler, type DragEvent } from 'react';
import { ELEMENTS } from '../data/elements';
import { useGame } from '../store/useGame';
import { GLOBAL_RECIPE_TOKEN_KEY, fetchGlobalRecipes, publishGlobalRecipe, publishGlobalRecipes } from '../store/globalRecipes';
import { DEFAULT_ELEMENT_CATEGORIES, type Element, type MasterRecipe, type WorldEffectMap } from '../types';
import { parseElementCategories, resolveElementCategory } from '../utils/categoryResolver';
import { isImageIcon, resolveElementIcon, resolveElementIconRaw } from '../utils/iconResolver';
import { findElementByNameOrId, resolveElementName } from '../utils/nameResolver';
import './MasterRecipeLab.css';

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Unknown error';
}

function recipePairKey(inputA: string, inputB: string): string {
  return [inputA, inputB].sort().join('|');
}

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
  const [outputCategory, setOutputCategory] = useState('');
  const [outputActsAs, setOutputActsAs] = useState('');
  const [iconStatus, setIconStatus] = useState<string | null>(null);

  const allElements = useMemo(
    () => [...ELEMENTS, ...state.customElements],
    [state.customElements]
  );

  const elementOptions = useMemo(
    () => allElements.map((element) => resolveElementName(element, state.nameOverrides)).sort((a, b) => a.localeCompare(b)),
    [allElements, state.nameOverrides]
  );

  const categoryOptions = useMemo(() => {
    const categorySet = new Set<string>(DEFAULT_ELEMENT_CATEGORIES as readonly string[]);
    for (const element of allElements) {
      for (const category of parseElementCategories(resolveElementCategory(element, state.categoryOverrides))) {
        categorySet.add(category);
      }
    }
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [allElements, state.categoryOverrides]);

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
      setOutput(element.name);
      setOutputIcon(resolveElementIconRaw(element, state.iconOverrides));
      setOutputName(element.name);
      setOutputDescription(element.description);
      setOutputCategory(element.category);
      const actsAsId = state.actsAsOverrides[element.id];
      const actsAsElement = actsAsId ? allElements.find((entry) => entry.id === actsAsId) : null;
      setOutputActsAs(actsAsElement ? resolveElementName(actsAsElement, state.nameOverrides) : '');
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
    setOutputName(baseElement.name);
    setOutputDescription(baseElement.description);
    setOutputCategory(baseElement.category);
    const actsAsId = state.actsAsOverrides[baseElement.id];
    const actsAsElement = actsAsId ? allElements.find((entry) => entry.id === actsAsId) : null;
    setOutputActsAs(actsAsElement ? resolveElementName(actsAsElement, state.nameOverrides) : '');
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

  const collectOutputWorldEffects = (): WorldEffectMap => {
    const outputWorldEffects: WorldEffectMap = {};
    for (const [key, rawValue] of Object.entries(attrDraft)) {
      const name = key.trim();
      const raw = rawValue?.trim();
      if (!name || !raw) continue;
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      outputWorldEffects[name] = num;
    }
    return outputWorldEffects;
  };

  const applyOutputEdits = (outputId: string, baseCategory: string, normalizedCategory: string) => {
    const outputWorldEffects = collectOutputWorldEffects();

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

    if (normalizedCategory !== baseCategory) {
      dispatch({ type: 'SET_CATEGORY_OVERRIDE', elementId: outputId, category: normalizedCategory });
    } else {
      dispatch({ type: 'CLEAR_CATEGORY_OVERRIDE', elementId: outputId });
    }

    const actsAsElement = findElementByNameOrId(outputActsAs, allElements, state.nameOverrides);
    if (actsAsElement && actsAsElement.id !== outputId) {
      dispatch({ type: 'SET_ACTS_AS_OVERRIDE', elementId: outputId, actsAsElementId: actsAsElement.id });
    } else {
      dispatch({ type: 'CLEAR_ACTS_AS_OVERRIDE', elementId: outputId });
    }
  };

  const updateOutputOnly = () => {
    const outputMatch = findElementByNameOrId(output, allElements, state.nameOverrides);
    if (!outputMatch) {
      setStatus(`Select a valid existing output element to update: "${output.trim() || 'empty'}".`);
      return;
    }

    const resolvedCategory = resolveElementCategory(outputMatch, state.categoryOverrides);
    const normalizedCategory = outputCategory.trim() || resolvedCategory;

    applyOutputEdits(outputMatch.id, outputMatch.category, normalizedCategory);
    setStatus(`Updated ${resolveElementName(outputMatch, state.nameOverrides)}.`);
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
    const normalizedCategory = outputCategory.trim() || 'Weird';

    if (outputMatch) {
      const typedOutput = output.trim().toLowerCase();
      const baseName = outputMatch.name.trim().toLowerCase();
      const overriddenName = state.nameOverrides[outputMatch.id]?.trim().toLowerCase();
      const hasConflictingNameOverride = !!overriddenName && overriddenName !== baseName;

      // If an element's current display name is overridden (legacy rename) and the user
      // explicitly types its base name, treat it as a request for a distinct new element.
      if (typedOutput === baseName && hasConflictingNameOverride) {
        outputId = undefined;
      }
    }

    if (!outputId) {
      outputId = createCustomElementId(outputDisplayName);
      const newElement: Element = {
        id: outputId,
        name: outputDisplayName,
        category: normalizedCategory,
        description: outputDescription.trim() || `A new element born from ${inputA.trim()} + ${inputB.trim()}.`,
        tags: ['custom', 'player-made'],
        discovered: false,
        emoji: outputIcon.trim() && !isImageIcon(outputIcon.trim()) ? outputIcon.trim() : '✨',
      };
      dispatch({ type: 'UPSERT_CUSTOM_ELEMENT', element: newElement });

      // Apply extra output fields for brand-new elements only.
      applyOutputEdits(outputId, normalizedCategory, normalizedCategory);
    }

    const outputWorldEffects = collectOutputWorldEffects();

    const recipe: MasterRecipe = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      inputA: inputAId,
      inputB: inputBId,
      output: outputId,
      createdAt: Date.now(),
      outputWorldEffects: Object.keys(outputWorldEffects).length > 0 ? outputWorldEffects : undefined,
    };

    dispatch({ type: 'ADD_MASTER_RECIPE', recipe });

    if (publishGlobal) {
      if (!token.trim()) {
        setStatus('Enter a GitHub token to publish globally. Recipe was still saved locally.');
      } else {
        try {
          setSaving(true);
          localStorage.setItem(GLOBAL_RECIPE_TOKEN_KEY, token.trim());
          await publishGlobalRecipe(recipe, token.trim());
          const synced = await fetchGlobalRecipes();
          const sharedPairs = new Set(synced.map((entry) => recipePairKey(entry.inputA, entry.inputB)));
          const publishedPair = recipePairKey(recipe.inputA, recipe.inputB);
          dispatch({ type: 'SET_SHARED_RECIPES', recipes: synced });
          if (sharedPairs.has(publishedPair)) {
            dispatch({ type: 'REMOVE_LOCAL_RECIPES_BY_PAIR', pairs: [publishedPair] });
            setStatus('Recipe published globally and removed from local duplicates.');
          } else {
            setStatus('Recipe saved locally and published globally.');
          }
        } catch (error) {
          setStatus(`Local save succeeded, but global publish failed: ${errorMessage(error)}.`);
        } finally {
          setSaving(false);
        }
      }
    } else {
      setStatus(outputMatch && outputId === outputMatch.id
        ? 'Master recipe saved locally. This pairing now crafts immediately.'
        : `Master recipe saved locally and new element created: ${outputDisplayName}.`);
    }

    setInputA('');
    setInputB('');
    setOutput('');
    setOutputIcon('');
    setOutputName('');
    setOutputDescription('');
    setOutputCategory('');
    setOutputActsAs('');
    setAttrDraft(buildAttrDraft());
  };

  const publishAllLocalRecipes = async () => {
    if (!state.masterRecipes.length) {
      setStatus('No local recipes to publish.');
      return;
    }

    if (!publishGlobal) {
      setStatus('Enable Publish globally first, then publish all local recipes.');
      return;
    }

    if (!token.trim()) {
      setStatus('Enter a GitHub token before publishing local recipes globally.');
      return;
    }

    try {
      setSaving(true);
      localStorage.setItem(GLOBAL_RECIPE_TOKEN_KEY, token.trim());
      const localRecipes = [...state.masterRecipes];
      await publishGlobalRecipes(state.masterRecipes, token.trim());
      const synced = await fetchGlobalRecipes();
      const sharedPairs = new Set(synced.map((recipe) => recipePairKey(recipe.inputA, recipe.inputB)));
      const publishedPairs = Array.from(new Set(localRecipes
        .map((recipe) => recipePairKey(recipe.inputA, recipe.inputB))
        .filter((pair) => sharedPairs.has(pair))));
      dispatch({ type: 'SET_SHARED_RECIPES', recipes: synced });
      if (publishedPairs.length > 0) {
        dispatch({ type: 'REMOVE_LOCAL_RECIPES_BY_PAIR', pairs: publishedPairs });
      }
      const unpublishedCount = localRecipes.length - publishedPairs.length;
      setStatus(
        unpublishedCount > 0
          ? `Published ${publishedPairs.length} local recipes globally. Kept ${unpublishedCount} local recipes that were not confirmed in global.`
          : `Published ${publishedPairs.length} local recipes globally and cleared local duplicates.`
      );
    } catch (error) {
      setStatus(`Bulk global publish failed: ${errorMessage(error)}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="master-recipe-lab">
      <div className="master-recipe-header">
        <h3>🧪 Master Recipes</h3>
        <div className="master-recipe-header-actions">
          <span className="master-recipe-count">{state.masterRecipes.length} local / {state.sharedRecipes.length} global</span>
          <button
            type="button"
            className="master-recipe-publish-all"
            onClick={publishAllLocalRecipes}
            disabled={saving || state.masterRecipes.length === 0}
            title={publishGlobal ? 'Push all local recipes to the shared global file.' : 'Enable Publish globally first.'}
          >
            Publish all local recipes ({state.masterRecipes.length})
          </button>
        </div>
      </div>

      <p className="master-recipe-note">
        Save Recipe needs Input A + Input B. Update Output edits icon/name/description/category/acts-as/attributes for an existing output only.
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
        <div className="master-recipe-actions">
          <button onClick={addMasterRecipe}>Save Recipe</button>
          <button className="secondary" onClick={updateOutputOnly}>Update Output</button>
        </div>
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
        <div className="master-recipe-icon-row single">
          <input
            list="category-options"
            value={outputCategory}
            onChange={(event) => setOutputCategory(event.target.value)}
            placeholder="Output category (example: Alchemy, Mythic)"
          />
        </div>
        <div className="master-recipe-icon-row single">
          <input
            list="element-options"
            value={outputActsAs}
            onChange={(event) => setOutputActsAs(event.target.value)}
            placeholder="Acts as element (example: Flame)"
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

      <datalist id="category-options">
        {categoryOptions.map((category) => (
          <option key={category} value={category} />
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
