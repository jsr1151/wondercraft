import { useState, type DragEvent } from 'react';
import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import './CraftingArea.css';

export function CraftingArea() {
  const { state, dispatch } = useGame();
  const { selectedSlotA, selectedSlotB, lastCombinationResult } = state;
  const [dragTarget, setDragTarget] = useState<'A' | 'B' | null>(null);

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
              <span className="craft-slot-emoji">{elemA.emoji}</span>
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
              <span className="craft-slot-emoji">{elemB.emoji}</span>
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
              <span className="craft-result-emoji">{resultElem.emoji}</span>
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

      {lastCombinationResult?.success && resultElem && (
        <div className="craft-discovery-text">
          <p className="discovery-name">{resultElem.emoji} {resultElem.name}</p>
          <p className="discovery-desc">{resultElem.description}</p>
        </div>
      )}
    </div>
  );
}
