import { useMemo, useState } from 'react';
import { ELEMENTS } from '../data/elements';
import { useGame } from '../store/useGame';
import { resolveElementIcon } from '../utils/iconResolver';
import { resolveElementName } from '../utils/nameResolver';
import './UntriedCombosSidebar.css';

const MAX_VISIBLE = 180;

function keyFor(a: string, b: string): string {
  return [a, b].sort().join('|');
}

export function UntriedCombosSidebar() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);

  const { total, visible } = useMemo(() => {
    const discovered = ELEMENTS
      .filter((element) => state.discoveredElements.has(element.id))
      .sort((a, b) => resolveElementName(a, state.nameOverrides).localeCompare(resolveElementName(b, state.nameOverrides)));

    const candidates: string[] = [];

    for (let i = 0; i < discovered.length; i++) {
      for (let j = i; j < discovered.length; j++) {
        const a = discovered[i];
        const b = discovered[j];
        const comboKey = keyFor(a.id, b.id);
        if (!state.attemptedCombinations.has(comboKey)) {
          candidates.push(`${resolveElementIcon(a, state.iconOverrides)} ${resolveElementName(a, state.nameOverrides)} + ${resolveElementIcon(b, state.iconOverrides)} ${resolveElementName(b, state.nameOverrides)}`);
        }
      }
    }

    return {
      total: candidates.length,
      visible: candidates.slice(0, MAX_VISIBLE),
    };
  }, [state.discoveredElements, state.attemptedCombinations, state.iconOverrides, state.nameOverrides]);

  return (
    <aside className={`untried-sidebar ${open ? 'open' : 'closed'}`}>
      <button className="untried-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide Cheat' : 'Cheat'}
      </button>

      {open && (
        <div className="untried-content">
          <h4>Untried Combos</h4>
          <p className="untried-meta">{total} unseen pairs</p>
          <div className="untried-list">
            {visible.length === 0 ? (
              <p className="untried-empty">You have attempted all discovered pairings.</p>
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
