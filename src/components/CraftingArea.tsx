import { useState, type DragEvent } from 'react';
import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { resolveElementIcon } from '../utils/iconResolver';
import './CraftingArea.css';

export function CraftingArea() {
  const { state, dispatch } = useGame();
  const { selectedSlotA, selectedSlotB, lastCombinationResult, iconOverrides } = state;
  const [dragTarget, setDragTarget] = useState<'A' | 'B' | null>(null);
  const [showIconEditor, setShowIconEditor] = useState(false);
  const [iconTarget, setIconTarget] = useState('');
  const [iconValue, setIconValue] = useState('');

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
    setIconValue(resolveElementIcon(element, iconOverrides));
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
              <span className="craft-slot-emoji">{resolveElementIcon(elemA, iconOverrides)}</span>
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
              <span className="craft-slot-emoji">{resolveElementIcon(elemB, iconOverrides)}</span>
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
              <span className="craft-result-emoji">{resolveElementIcon(resultElem, iconOverrides)}</span>
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
            setIconValue(resolveElementIcon(prefill, iconOverrides));
          }
          setShowIconEditor((v) => !v);
        }}
      >
        🖼️ Update Icon
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
            placeholder="Paste Apple emoji"
          />
          <button onClick={applyIconOverride}>Apply</button>
          <button className="clear-icon" onClick={clearIconOverride}>Reset</button>

          <datalist id="craft-icon-targets">
            {ELEMENTS.map((element) => (
              <option key={element.id} value={element.name} />
            ))}
          </datalist>
        </div>
      )}

      {lastCombinationResult?.success && resultElem && (
        <div className="craft-discovery-text">
          <p className="discovery-name">{resolveElementIcon(resultElem, iconOverrides)} {resultElem.name}</p>
          <p className="discovery-desc">{resultElem.description}</p>
        </div>
      )}
    </div>
  );
}
