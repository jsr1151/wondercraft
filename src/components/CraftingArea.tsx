import { useMemo, useState, type ChangeEventHandler, type ClipboardEventHandler, type DragEvent } from 'react';
import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { RECIPES } from '../data/recipes';
import { parseElementCategories, resolveElementCategory } from '../utils/categoryResolver';
import { resolveElementIconRaw } from '../utils/iconResolver';
import { DEFAULT_ELEMENT_CATEGORIES, type Element, type Recipe, type WorldEffectMap } from '../types';
import { ElementIcon } from './ElementIcon';
import { findElementByNameOrId, resolveElementDescription, resolveElementName } from '../utils/nameResolver';
import './CraftingArea.css';

const DEFAULT_ATTR_KEYS = [
  'water', 'brightness', 'earthy', 'air', 'vegetation', 'heat', 'cold', 'atmosphere',
  'pollution', 'civilization', 'technology', 'magic', 'ruin', 'life',
] as const;

const MAX_ICON_IMPORT_BYTES = 400_000;

type RecipeExplorerTab = 'creates' | 'uses';

function recipePairKey(inputA: string, inputB: string): string {
  return [inputA, inputB].sort().join('|');
}

function buildEffectiveRecipes(recipes: Recipe[]): Recipe[] {
  const seenPairs = new Set<string>();
  const effectiveRecipes: Recipe[] = [];

  for (const recipe of recipes) {
    const pairKey = recipePairKey(recipe.inputA, recipe.inputB);
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    effectiveRecipes.push(recipe);
  }

  return effectiveRecipes;
}

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
  const { selectedSlotA, selectedSlotB, lastCombinationResult, iconOverrides, effectOverrides, nameOverrides, descriptionOverrides, categoryOverrides, actsAsOverrides } = state;
  const allElements = [...ELEMENTS, ...state.customElements];
  const elementMap = useMemo(() => new Map(allElements.map((element) => [element.id, element])), [allElements]);
  const effectiveRecipes = useMemo(
    () => buildEffectiveRecipes([...state.masterRecipes, ...state.sharedRecipes, ...RECIPES]),
    [state.masterRecipes, state.sharedRecipes],
  );
  const discoveredRecipeKeys = useMemo(() => new Set(state.profile.discoveredRecipeKeys), [state.profile.discoveredRecipeKeys]);
  const categoryOptions = Array.from(new Set([
    ...(DEFAULT_ELEMENT_CATEGORIES as readonly string[]),
    ...allElements.flatMap((element) => parseElementCategories(resolveElementCategory(element, categoryOverrides))),
  ])).sort((a, b) => a.localeCompare(b));
  const [dragTarget, setDragTarget] = useState<'A' | 'B' | null>(null);
  const [showIconEditor, setShowIconEditor] = useState(false);
  const [iconTarget, setIconTarget] = useState('');
  const [iconValue, setIconValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [actsAsValue, setActsAsValue] = useState('');
  const [iconStatus, setIconStatus] = useState<string | null>(null);
  const [showAttrEditor, setShowAttrEditor] = useState(false);
  const [attrTarget, setAttrTarget] = useState('');
  const [attrDraft, setAttrDraft] = useState<Record<string, string>>({});
  const [newAttrKey, setNewAttrKey] = useState('');
  const [showRecipeExplorer, setShowRecipeExplorer] = useState(false);
  const [recipeTarget, setRecipeTarget] = useState('');
  const [recipeTab, setRecipeTab] = useState<RecipeExplorerTab>('creates');
  const [showAllRecipes, setShowAllRecipes] = useState(false);

  const elemA = selectedSlotA ? allElements.find(e => e.id === selectedSlotA) : null;
  const elemB = selectedSlotB ? allElements.find(e => e.id === selectedSlotB) : null;
  const resultElem = lastCombinationResult?.elementId
    ? allElements.find(e => e.id === lastCombinationResult.elementId)
    : null;

  const canCombine = !!selectedSlotA && !!selectedSlotB;
  const recipeTargetElement = findElementByNameOrId(recipeTarget, allElements, nameOverrides);
  const visibleRecipes = showAllRecipes
    ? effectiveRecipes
    : effectiveRecipes.filter((recipe) => discoveredRecipeKeys.has(recipePairKey(recipe.inputA, recipe.inputB)));
  const createdByRecipes = recipeTargetElement
    ? visibleRecipes.filter((recipe) => recipe.output === recipeTargetElement.id)
    : [];
  const usesElementRecipes = recipeTargetElement
    ? visibleRecipes.filter((recipe) => recipe.inputA === recipeTargetElement.id || recipe.inputB === recipeTargetElement.id)
    : [];
  const totalCreatedByRecipes = recipeTargetElement
    ? effectiveRecipes.filter((recipe) => recipe.output === recipeTargetElement.id).length
    : 0;
  const totalUsesElementRecipes = recipeTargetElement
    ? effectiveRecipes.filter((recipe) => recipe.inputA === recipeTargetElement.id || recipe.inputB === recipeTargetElement.id).length
    : 0;

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
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target || !iconValue.trim()) return;
    dispatch({ type: 'SET_ICON_OVERRIDE', elementId: target.id, icon: iconValue.trim() });
  };

  const applyDescriptionOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target || !descriptionValue.trim()) return;
    dispatch({ type: 'SET_DESCRIPTION_OVERRIDE', elementId: target.id, description: descriptionValue.trim() });
  };

  const clearDescriptionOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target) return;
    dispatch({ type: 'CLEAR_DESCRIPTION_OVERRIDE', elementId: target.id });
    setDescriptionValue(target.description);
  };

  const applyCategoryOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target || !categoryValue.trim()) return;
    dispatch({ type: 'SET_CATEGORY_OVERRIDE', elementId: target.id, category: categoryValue.trim() });
  };

  const clearCategoryOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target) return;
    dispatch({ type: 'CLEAR_CATEGORY_OVERRIDE', elementId: target.id });
    setCategoryValue(target.category);
  };

  const applyActsAsOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target) return;
    const actsAsTarget = findElementByNameOrId(actsAsValue, allElements, nameOverrides);
    if (actsAsTarget && actsAsTarget.id !== target.id) {
      dispatch({ type: 'SET_ACTS_AS_OVERRIDE', elementId: target.id, actsAsElementId: actsAsTarget.id });
      return;
    }
    dispatch({ type: 'CLEAR_ACTS_AS_OVERRIDE', elementId: target.id });
  };

  const clearActsAsOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target) return;
    dispatch({ type: 'CLEAR_ACTS_AS_OVERRIDE', elementId: target.id });
    setActsAsValue('');
  };

  const clearIconOverride = () => {
    const target = findElementByNameOrId(iconTarget, allElements, nameOverrides);
    if (!target) return;
    dispatch({ type: 'CLEAR_ICON_OVERRIDE', elementId: target.id });
  };

  const onIconTargetDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const elementId = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!elementId) return;
    const element = allElements.find((entry) => entry.id === elementId);
    if (!element) return;
    const label = resolveElementName(element, nameOverrides);
    setIconTarget(label);
    setIconValue(resolveElementIconRaw(element, iconOverrides));
    setDescriptionValue(resolveElementDescription(element, descriptionOverrides));
    setCategoryValue(resolveElementCategory(element, categoryOverrides));
    const actsAsId = actsAsOverrides[element.id];
    const actsAsElement = actsAsId ? allElements.find((entry) => entry.id === actsAsId) : null;
    setActsAsValue(actsAsElement ? resolveElementName(actsAsElement, nameOverrides) : '');
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

  const parseElementByNameOrId = (value: string) => findElementByNameOrId(value, allElements, nameOverrides);

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
    const element = allElements.find((entry) => entry.id === elementId);
    if (!element) return;
    const label = resolveElementName(element, nameOverrides);
    setAttrTarget(label);
    loadAttrDraftForTarget(label);
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

  const setRecipeTargetFromElement = (element: Element | null | undefined) => {
    if (!element) return;
    setRecipeTarget(resolveElementName(element, nameOverrides));
  };

  const onRecipeTargetDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const elementId = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!elementId) return;
    const element = allElements.find((entry) => entry.id === elementId);
    if (!element) return;
    setRecipeTargetFromElement(element);
  };

  const loadRecipeIntoSlots = (recipe: Recipe) => {
    dispatch({ type: 'SELECT_SLOT_A', elementId: recipe.inputA });
    dispatch({ type: 'SELECT_SLOT_B', elementId: recipe.inputB });
  };

  const renderRecipeRow = (recipe: Recipe) => {
    const inputA = elementMap.get(recipe.inputA);
    const inputB = elementMap.get(recipe.inputB);
    const output = elementMap.get(recipe.output);
    const recipeKnown = discoveredRecipeKeys.has(recipePairKey(recipe.inputA, recipe.inputB));

    return (
      <button
        key={`${recipePairKey(recipe.inputA, recipe.inputB)}:${recipe.output}`}
        className="recipe-explorer-row"
        onClick={() => loadRecipeIntoSlots(recipe)}
        type="button"
      >
        <span className="recipe-explorer-expression">
          <span>{inputA ? resolveElementName(inputA, nameOverrides) : recipe.inputA}</span>
          <span className="recipe-explorer-operator">+</span>
          <span>{inputB ? resolveElementName(inputB, nameOverrides) : recipe.inputB}</span>
          <span className="recipe-explorer-operator">=</span>
          <span>{output ? resolveElementName(output, nameOverrides) : recipe.output}</span>
        </span>
        <span className={`recipe-explorer-badge ${recipeKnown ? 'known' : 'hidden'}`}>
          {recipeKnown ? 'Unlocked' : 'Cheat'}
        </span>
      </button>
    );
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
              <span className="craft-slot-name">{resolveElementName(elemA, nameOverrides)}</span>
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
              <span className="craft-slot-name">{resolveElementName(elemB, nameOverrides)}</span>
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
              <span className="craft-result-name">{resolveElementName(resultElem, nameOverrides)}</span>
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
            setIconTarget(resolveElementName(prefill, nameOverrides));
            setIconValue(resolveElementIconRaw(prefill, iconOverrides));
            setDescriptionValue(resolveElementDescription(prefill, descriptionOverrides));
            setCategoryValue(resolveElementCategory(prefill, categoryOverrides));
            const actsAsId = actsAsOverrides[prefill.id];
            const actsAsElement = actsAsId ? allElements.find((entry) => entry.id === actsAsId) : null;
            setActsAsValue(actsAsElement ? resolveElementName(actsAsElement, nameOverrides) : '');
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
            const label = resolveElementName(prefill, nameOverrides);
            setAttrTarget(label);
            loadAttrDraftForTarget(label);
          }
          setShowAttrEditor((v) => !v);
        }}
      >
        🧬 Update Attributes
      </button>

      <button
        className="craft-button icon-editor-toggle"
        onClick={() => {
          const prefill = resultElem ?? elemA ?? elemB;
          if (prefill) setRecipeTargetFromElement(prefill);
          setShowRecipeExplorer((value) => !value);
        }}
      >
        📘 Recipe Explorer
      </button>

      {showIconEditor && (
        <div className="icon-editor">
          <input
            list="craft-element-targets"
            value={iconTarget}
            onChange={(event) => {
              const next = event.target.value;
              setIconTarget(next);
              const target = findElementByNameOrId(next, allElements, nameOverrides);
              if (!target) return;
              setIconValue(resolveElementIconRaw(target, iconOverrides));
              setDescriptionValue(resolveElementDescription(target, descriptionOverrides));
              setCategoryValue(resolveElementCategory(target, categoryOverrides));
              const actsAsId = actsAsOverrides[target.id];
              const actsAsElement = actsAsId ? allElements.find((entry) => entry.id === actsAsId) : null;
              setActsAsValue(actsAsElement ? resolveElementName(actsAsElement, nameOverrides) : '');
            }}
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
          <div className="icon-editor-actions">
            <button onClick={applyIconOverride}>Apply Icon</button>
            <button className="clear-icon" onClick={clearIconOverride}>Reset Icon</button>
          </div>

          <input
            value={descriptionValue}
            onChange={(event) => setDescriptionValue(event.target.value)}
            placeholder="Description override"
          />
          <div className="icon-editor-actions">
            <button onClick={applyDescriptionOverride}>Apply Description</button>
            <button className="clear-icon" onClick={clearDescriptionOverride}>Reset Description</button>
          </div>

          <input
            list="craft-category-options"
            value={categoryValue}
            onChange={(event) => setCategoryValue(event.target.value)}
            placeholder="Category override (example: Mythic, Arcane)"
          />
          <div className="icon-editor-actions">
            <button onClick={applyCategoryOverride}>Apply Category</button>
            <button className="clear-icon" onClick={clearCategoryOverride}>Reset Category</button>
          </div>

          <input
            list="craft-element-targets"
            value={actsAsValue}
            onChange={(event) => setActsAsValue(event.target.value)}
            placeholder="Acts as element (recipe skin target)"
          />
          <div className="icon-editor-actions">
            <button onClick={applyActsAsOverride}>Apply Acts As</button>
            <button className="clear-icon" onClick={clearActsAsOverride}>Reset Acts As</button>
          </div>

          <datalist id="craft-category-options">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
      )}

      {iconStatus && <p className="craft-icon-status">{iconStatus}</p>}

      {showAttrEditor && (
        <div className="attr-editor">
          <input
            list="craft-element-targets"
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

      {showRecipeExplorer && (
        <div className="recipe-explorer">
          <div className="recipe-explorer-toolbar">
            <input
              list="craft-element-targets"
              value={recipeTarget}
              onChange={(event) => setRecipeTarget(event.target.value)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onRecipeTargetDrop}
              placeholder="Drop element or type name"
            />

            <div className="recipe-explorer-toggle-row">
              <button
                type="button"
                className={`recipe-explorer-tab ${recipeTab === 'creates' ? 'active' : ''}`}
                onClick={() => setRecipeTab('creates')}
              >
                Creates ({showAllRecipes ? totalCreatedByRecipes : createdByRecipes.length})
              </button>
              <button
                type="button"
                className={`recipe-explorer-tab ${recipeTab === 'uses' ? 'active' : ''}`}
                onClick={() => setRecipeTab('uses')}
              >
                Uses ({showAllRecipes ? totalUsesElementRecipes : usesElementRecipes.length})
              </button>
              <label className="recipe-explorer-cheat-toggle">
                <input
                  type="checkbox"
                  checked={showAllRecipes}
                  onChange={(event) => setShowAllRecipes(event.target.checked)}
                />
                Cheat
              </label>
            </div>
          </div>

          {!recipeTargetElement ? (
            <p className="recipe-explorer-empty">Select an element to inspect the recipes that create it or use it.</p>
          ) : (
            <>
              <p className="recipe-explorer-summary">
                Viewing {resolveElementName(recipeTargetElement, nameOverrides)} recipes in {showAllRecipes ? 'cheat' : 'unlocked'} mode.
              </p>

              <div className="recipe-explorer-list">
                {(recipeTab === 'creates' ? createdByRecipes : usesElementRecipes).length > 0 ? (
                  (recipeTab === 'creates' ? createdByRecipes : usesElementRecipes).map(renderRecipeRow)
                ) : (
                  <p className="recipe-explorer-empty">
                    {showAllRecipes
                      ? `No recipes ${recipeTab === 'creates' ? 'create' : 'use'} this element.`
                      : `No unlocked recipes ${recipeTab === 'creates' ? 'create' : 'use'} this element yet. Turn on Cheat to reveal all of them.`}
                  </p>
                )}
              </div>
            </>
          )}
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
            {resolveElementName(resultElem, nameOverrides)}
          </p>
          <p className="discovery-desc">{resolveElementDescription(resultElem, descriptionOverrides)}</p>
        </div>
      )}

      <datalist id="craft-element-targets">
        {allElements.map((element) => (
          <option key={element.id} value={resolveElementName(element, nameOverrides)} />
        ))}
      </datalist>
    </div>
  );
}
