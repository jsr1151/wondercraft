import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import './CraftingArea.css';

export function CraftingArea() {
  const { state, dispatch } = useGame();
  const { selectedSlotA, selectedSlotB, lastCombinationResult, discoveredElements } = state;

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

  return (
    <div className="crafting-area">
      <h2 className="crafting-title">⚗️ Crafting</h2>
      <div className="crafting-slots">
        <div className={`craft-slot ${elemA ? 'filled' : 'empty'}`}>
          {elemA ? (
            <div className="craft-slot-content" onClick={clearSlotA}>
              <span className="craft-slot-emoji">{elemA.emoji}</span>
              <span className="craft-slot-name">{elemA.name}</span>
              <span className="craft-slot-clear">✕</span>
            </div>
          ) : (
            <div className="craft-slot-placeholder">
              <span>Select element A</span>
            </div>
          )}
        </div>

        <div className="craft-plus">+</div>

        <div className={`craft-slot ${elemB ? 'filled' : 'empty'}`}>
          {elemB ? (
            <div className="craft-slot-content" onClick={clearSlotB}>
              <span className="craft-slot-emoji">{elemB.emoji}</span>
              <span className="craft-slot-name">{elemB.name}</span>
              <span className="craft-slot-clear">✕</span>
            </div>
          ) : (
            <div className="craft-slot-placeholder">
              <span>Select element B</span>
            </div>
          )}
        </div>

        <div className="craft-equals">=</div>

        <div className={`craft-result ${lastCombinationResult ? (lastCombinationResult.success ? 'success' : 'fail') : ''}`}>
          {lastCombinationResult?.success && resultElem ? (
            <div className="craft-result-content">
              <span className="craft-result-emoji">{resultElem.emoji}</span>
              <span className="craft-result-name">{resultElem.name}</span>
              {!discoveredElements.has(resultElem.id) && (
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

      {lastCombinationResult?.success && resultElem && (
        <div className="craft-discovery-text">
          <p className="discovery-name">{resultElem.emoji} {resultElem.name}</p>
          <p className="discovery-desc">{resultElem.description}</p>
        </div>
      )}
    </div>
  );
}
