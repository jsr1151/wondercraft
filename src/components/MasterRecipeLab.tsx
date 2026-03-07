import { useMemo, useState } from 'react';
import { ELEMENTS } from '../data/elements';
import { useGame } from '../store/useGame';
import type { MasterRecipe } from '../types';
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

function elementLabel(id: string): string {
  const element = ELEMENTS.find((item) => item.id === id);
  if (!element) return id;
  return `${element.emoji ?? '•'} ${element.name}`;
}

export function MasterRecipeLab() {
  const { state, dispatch } = useGame();
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const sortedRecipes = useMemo(
    () => [...state.masterRecipes].sort((a, b) => b.createdAt - a.createdAt),
    [state.masterRecipes]
  );

  const addMasterRecipe = () => {
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
    setInputA('');
    setInputB('');
    setOutput('');
    setStatus('Master recipe saved. This pairing now crafts immediately.');
  };

  return (
    <section className="master-recipe-lab">
      <div className="master-recipe-header">
        <h3>🧪 Master Recipes</h3>
        <span className="master-recipe-count">{state.masterRecipes.length} custom</span>
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
        />
        <span>+</span>
        <input
          list="element-options"
          value={inputB}
          onChange={(event) => setInputB(event.target.value)}
          placeholder="Input B"
        />
        <span>→</span>
        <input
          list="element-options"
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          placeholder="Output"
        />
        <button onClick={addMasterRecipe}>Save</button>
      </div>

      <datalist id="element-options">
        {ELEMENT_OPTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {status && <p className="master-recipe-status">{status}</p>}

      <div className="master-recipe-list">
        {sortedRecipes.length === 0 ? (
          <p className="master-recipe-empty">No custom recipes yet.</p>
        ) : (
          sortedRecipes.map((recipe) => (
            <div key={recipe.id} className="master-recipe-item">
              <span>{elementLabel(recipe.inputA)}</span>
              <span>+</span>
              <span>{elementLabel(recipe.inputB)}</span>
              <span>→</span>
              <span>{elementLabel(recipe.output)}</span>
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
