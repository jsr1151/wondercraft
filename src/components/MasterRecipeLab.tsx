import { useMemo, useState, type DragEvent } from 'react';
import { ELEMENTS } from '../data/elements';
import { useGame } from '../store/useGame';
import { GLOBAL_RECIPE_TOKEN_KEY, fetchGlobalRecipes, publishGlobalRecipe } from '../store/globalRecipes';
import type { MasterRecipe } from '../types';
import { resolveElementIcon } from '../utils/iconResolver';
import './MasterRecipeLab.css';

const ELEMENT_OPTIONS = ELEMENTS
  .map((element) => element.name)
  .sort((a, b) => a.localeCompare(b));

function lookupElementId(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const byName = ELEMENTS.find((element) => element.name.toLowerCase() === normalized);
  if (byName) return byName.id;

  const byId = ELEMENTS.find((element) => element.id.toLowerCase() === normalized);
  return byId?.id ?? null;
}

function elementLabel(id: string, iconOverrides: Record<string, string>): string {
  const element = ELEMENTS.find((item) => item.id === id);
  if (!element) return id;
  return `${resolveElementIcon(element, iconOverrides)} ${element.name}`;
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

  const setFromElementDrop = (target: 'A' | 'B' | 'OUT') => (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/wondercraft-element-id');
    if (!id) return;
    const element = ELEMENTS.find((item) => item.id === id);
    if (!element) return;

    if (target === 'A') setInputA(element.name);
    if (target === 'B') setInputB(element.name);
    if (target === 'OUT') setOutput(element.name);
  };

  const allowDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
  };

  const sortedRecipes = useMemo(
    () => [...state.masterRecipes].sort((a, b) => b.createdAt - a.createdAt),
    [state.masterRecipes]
  );

  const addMasterRecipe = async () => {
    const inputAId = lookupElementId(inputA);
    const inputBId = lookupElementId(inputB);
    const outputId = lookupElementId(output);

    if (!inputAId || !inputBId || !outputId) {
      setStatus('Use valid element names or ids for A, B, and output.');
      return;
    }

    const recipe: MasterRecipe = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      inputA: inputAId,
      inputB: inputBId,
      output: outputId,
      createdAt: Date.now(),
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
          dispatch({ type: 'SET_SHARED_RECIPES', recipes: synced });
          setStatus('Recipe saved locally and published globally.');
        } catch {
          setStatus('Local save succeeded, but global publish failed. Check token permissions.');
        } finally {
          setSaving(false);
        }
      }
    } else {
      setStatus('Master recipe saved locally. This pairing now crafts immediately.');
    }

    setInputA('');
    setInputB('');
    setOutput('');
  };

  return (
    <section className="master-recipe-lab">
      <div className="master-recipe-header">
        <h3>🧪 Master Recipes</h3>
        <span className="master-recipe-count">{state.masterRecipes.length} local / {state.sharedRecipes.length} global</span>
      </div>

      <p className="master-recipe-note">
        These recipes override normal crafting. If a combo fails, define it here.
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
          onChange={(event) => setOutput(event.target.value)}
          placeholder="Output"
          onDragOver={allowDrop}
          onDrop={setFromElementDrop('OUT')}
        />
        <button onClick={addMasterRecipe}>Save</button>
      </div>

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
        {ELEMENT_OPTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {status && <p className="master-recipe-status">{status}</p>}
      {saving && <p className="master-recipe-status">Publishing...</p>}

      <div className="master-recipe-list">
        {sortedRecipes.length === 0 ? (
          <p className="master-recipe-empty">No custom recipes yet.</p>
        ) : (
          sortedRecipes.map((recipe) => (
            <div key={recipe.id} className="master-recipe-item">
              <span>{elementLabel(recipe.inputA, state.iconOverrides)}</span>
              <span>+</span>
              <span>{elementLabel(recipe.inputB, state.iconOverrides)}</span>
              <span>→</span>
              <span>{elementLabel(recipe.output, state.iconOverrides)}</span>
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
    </section>
  );
}
