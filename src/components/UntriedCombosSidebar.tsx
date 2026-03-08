import { useMemo, useState } from 'react';
import { ELEMENTS } from '../data/elements';
import { RECIPES } from '../data/recipes';
import { findRecipe } from '../engine/recipeEngine';
import { resolveActsAsElementId } from '../engine/actingAs';
import { useGame } from '../store/useGame';
import { getAvailableElements } from '../utils/elementAvailability';
import { resolveElementIcon } from '../utils/iconResolver';
import { resolveElementName } from '../utils/nameResolver';
import './UntriedCombosSidebar.css';

const MAX_VISIBLE = 180;

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function keyFor(a: string, b: string): string {
  return [a, b].sort().join('|');
}

export function UntriedCombosSidebar() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'untried' | 'no-output'>('untried');
  const allRecipes = [...state.masterRecipes, ...state.sharedRecipes, ...RECIPES];
  const allElements = getAvailableElements([...ELEMENTS, ...state.customElements], allRecipes);

  const { untriedTotal, untriedVisible, noOutputTotal, noOutputVisible } = useMemo(() => {
    const discovered = allElements
      .filter((element) => state.discoveredElements.has(element.id))
      .sort((a, b) => resolveElementName(a, state.nameOverrides).localeCompare(resolveElementName(b, state.nameOverrides)));

    const untriedCandidates: string[] = [];
    const noOutputCandidates: string[] = [];
    const canonicalSeen = new Set<string>();
    const attemptedCanonical = new Set(
      Array.from(state.attemptedCombinations).map((existingKey) => {
        const [left, right] = existingKey.split('|');
        const resolvedLeft = resolveActsAsElementId(left, state.actsAsOverrides);
        const resolvedRight = resolveActsAsElementId(right, state.actsAsOverrides);
        return keyFor(resolvedLeft, resolvedRight);
      })
    );

    for (let i = 0; i < discovered.length; i++) {
      for (let j = i; j < discovered.length; j++) {
        const a = discovered[i];
        const b = discovered[j];
        const canonicalKey = keyFor(
          resolveActsAsElementId(a.id, state.actsAsOverrides),
          resolveActsAsElementId(b.id, state.actsAsOverrides)
        );
        if (canonicalSeen.has(canonicalKey)) {
          continue;
        }
        canonicalSeen.add(canonicalKey);

        const label = `${resolveElementIcon(a, state.iconOverrides)} ${resolveElementName(a, state.nameOverrides)} + ${resolveElementIcon(b, state.iconOverrides)} ${resolveElementName(b, state.nameOverrides)}`;
        const hasAnyOutput =
          !!findRecipe(a.id, b.id, allRecipes, state.actsAsOverrides) ||
          !!findRecipe(b.id, a.id, allRecipes, state.actsAsOverrides);

        if (hasAnyOutput && !attemptedCanonical.has(canonicalKey)) {
          untriedCandidates.push(label);
        }

        if (!hasAnyOutput) {
          noOutputCandidates.push(label);
        }
      }
    }

    const randomizedNoOutput = shuffled(noOutputCandidates);

    return {
      untriedTotal: untriedCandidates.length,
      untriedVisible: untriedCandidates.slice(0, MAX_VISIBLE),
      noOutputTotal: noOutputCandidates.length,
      noOutputVisible: randomizedNoOutput.slice(0, MAX_VISIBLE),
    };
  }, [
    allElements,
    allRecipes,
    state.discoveredElements,
    state.attemptedCombinations,
    state.iconOverrides,
    state.nameOverrides,
    state.actsAsOverrides,
  ]);

  const showingUntried = mode === 'untried';
  const total = showingUntried ? untriedTotal : noOutputTotal;
  const visible = showingUntried ? untriedVisible : noOutputVisible;

  return (
    <aside className={`untried-sidebar ${open ? 'open' : 'closed'}`}>
      <button className="untried-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide Cheat' : 'Cheat'}
      </button>

      {open && (
        <div className="untried-content">
          <h4>Cheat Combos</h4>
          <div className="untried-tabs">
            <button
              className={`untried-tab ${showingUntried ? 'active' : ''}`}
              onClick={() => setMode('untried')}
            >
              Untried
            </button>
            <button
              className={`untried-tab ${!showingUntried ? 'active' : ''}`}
              onClick={() => setMode('no-output')}
            >
              No Output
            </button>
          </div>
          <p className="untried-meta">{showingUntried ? `${total} unseen pairs` : `${total} currently no-result pairs`}</p>
          <div className="untried-list">
            {visible.length === 0 ? (
              <p className="untried-empty">
                {showingUntried
                  ? 'You have attempted all discovered pairings.'
                  : 'All currently discovered pairings produce an element.'}
              </p>
            ) : (
              visible.map((line, index) => (
                <div key={`${line}-${index}`} className="untried-item">{line}</div>
              ))
            )}
          </div>
          {total > visible.length && (
            <p className="untried-meta">Showing first {visible.length} of {total}</p>
          )}
        </div>
      )}
    </aside>
  );
}
