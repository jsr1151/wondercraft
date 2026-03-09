import { useMemo, useState } from 'react';
import { ELEMENTS } from '../data/elements';
import { useGame } from '../store/useGame';
import {
  isMultiPlanetUnlocked,
  DESTRUCTIVE_ELEMENT_IDS,
  getPlanetCreationInsightCost,
  PLANET_CREATION_INSIGHT_TYPE,
  MULTI_PLANET_TECH_THRESHOLD,
} from '../store/gameStore';
import type { PlanetStartMode } from '../types';
import './SolarSystemView.css';

const PRIMORDIAL_ELEMENT_IDS = new Set(['fire', 'water', 'earth', 'air']);

export function SolarSystemView() {
  const { state, dispatch } = useGame();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [startMode, setStartMode] = useState<PlanetStartMode>('basic4');
  const [customElementIds, setCustomElementIds] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDestroyIndex, setConfirmDestroyIndex] = useState<number | null>(null);
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);

  const livePlanets = state.planets.filter((planet) => !planet.destroyed);
  const hasSolarSystemView = livePlanets.length >= 2;
  const unlocked = isMultiPlanetUnlocked(state);
  const hasLaunchVehicle = Array.from(state.discoveredElements).some((id) =>
    ['rocket', 'spaceship', 'spacecraft', 'space_shuttle'].includes(id)
  );
  const hasPlanetElement = Array.from(state.discoveredElements).some((id) =>
    ['planet', 'mars', 'jupiter', 'venus'].includes(id)
  );
  const hasTechThreshold = state.worldInfluence.technology >= MULTI_PLANET_TECH_THRESHOLD;
  const creationCost = getPlanetCreationInsightCost(livePlanets.length);
  const cosmicInsight = state.insight[PLANET_CREATION_INSIGHT_TYPE];
  const canCreatePlanet = unlocked && cosmicInsight >= creationCost;

  const canDestroy = Array.from(state.discoveredElements).some((id) => DESTRUCTIVE_ELEMENT_IDS.has(id));

  const customStartOptions = useMemo(() => {
    const elementMap = new Map(
      [...ELEMENTS, ...state.customElements].map((element) => [
        element.id,
        state.nameOverrides[element.id] || element.name,
      ])
    );
    return Array.from(state.discoveredElements)
      .filter((id) => !PRIMORDIAL_ELEMENT_IDS.has(id))
      .sort((a, b) => (elementMap.get(a) || a).localeCompare(elementMap.get(b) || b))
      .map((id) => ({ id, label: elementMap.get(id) || id }));
  }, [state.customElements, state.discoveredElements, state.nameOverrides]);

  const handleCreate = () => {
    if (!canCreatePlanet) return;
    const name = newName.trim() || `Planet ${state.planets.length + 1}`;
    dispatch({
      type: 'CREATE_PLANET',
      name,
      mode: startMode,
      customElementIds: startMode === 'custom' ? customElementIds : undefined,
    });
    setNewName('');
    setShowCreateForm(false);
    setStartMode('basic4');
    setCustomElementIds([]);
  };

  const handleRename = (index: number) => {
    const name = editName.trim();
    if (name) {
      dispatch({ type: 'RENAME_PLANET', index, name });
    }
    setEditingIndex(null);
    setEditName('');
  };

  return (
    <div className="solar-system">
      <div className="solar-system-header">
        <span className="solar-system-title">{hasSolarSystemView ? '🪐 Solar System' : '🚀 Interplanetary Program'}</span>
        <span className="solar-system-count">{livePlanets.length} live planet{livePlanets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="solar-system-meta">
        <span className="solar-system-cost">New planet: {creationCost.toFixed(1)} Cosmic Insight</span>
        <span className="solar-system-stock">You have {cosmicInsight.toFixed(1)}</span>
      </div>

      {!unlocked && (
        <div className="solar-unlock-panel">
          <div className="solar-unlock-title">Launch requirements</div>
          <div className="solar-unlock-checks">
            <span className={`solar-unlock-check ${hasLaunchVehicle ? 'met' : ''}`}>Rocket or spaceship</span>
            <span className={`solar-unlock-check ${hasPlanetElement ? 'met' : ''}`}>Planet discovery</span>
            <span className={`solar-unlock-check ${hasTechThreshold ? 'met' : ''}`}>
              Technology {state.worldInfluence.technology.toFixed(0)} / {MULTI_PLANET_TECH_THRESHOLD}
            </span>
          </div>
        </div>
      )}

      {hasSolarSystemView && (
        <div className="solar-system-planets">
          {state.planets.map((planet, index) => {
            const isActive = index === state.activePlanetIndex;
            if (planet.destroyed) {
              return (
                <div key={index} className="solar-planet-card destroyed">
                  <div className="solar-planet-orb destroyed-orb" />
                  <div className="solar-planet-info">
                    <span className="solar-planet-name destroyed-name">{planet.name}</span>
                    <span className="solar-planet-elements">💀 Destroyed</span>
                  </div>
                  <button
                    className="solar-planet-destroy-btn"
                    title="Remove destroyed planet"
                    onClick={(e) => { e.stopPropagation(); setConfirmRemoveIndex(index); }}
                  >
                    🗑️
                  </button>
                </div>
              );
            }
            return (
              <div
                key={index}
                className={`solar-planet-card ${isActive ? 'active' : ''}`}
                onClick={() => !isActive && dispatch({ type: 'SWITCH_PLANET', index })}
              >
                <div className="solar-planet-orb" style={{ '--planet-hue': (planet.seed % 360) } as React.CSSProperties} />
                <div className="solar-planet-info">
                  {editingIndex === index ? (
                    <input
                      className="solar-planet-name-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(index);
                        if (e.key === 'Escape') { setEditingIndex(null); setEditName(''); }
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="solar-planet-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingIndex(index);
                        setEditName(planet.name);
                      }}
                    >
                      {planet.name}
                    </span>
                  )}
                  <span className="solar-planet-elements">{planet.discoveredElements.size} elements</span>
                </div>
                {isActive && <span className="solar-planet-active-badge">●</span>}
                {canDestroy && livePlanets.length > 1 && (
                  <button
                    className="solar-planet-destroy-btn"
                    title="Destroy this planet"
                    onClick={(e) => { e.stopPropagation(); setConfirmDestroyIndex(index); }}
                  >
                    💥
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!hasSolarSystemView && (
        <div className="solar-prelaunch-note">
          Found a second world to unlock the full solar-system view.
        </div>
      )}

      {confirmDestroyIndex !== null && (
        <div className="solar-destroy-confirm">
          <p>⚠️ Destroy <strong>{state.planets[confirmDestroyIndex]?.name}</strong>?</p>
          <p className="solar-destroy-warn">This cannot be undone. The planet will appear as a dead world.</p>
          <div className="solar-create-actions">
            <button className="solar-destroy-yes" onClick={() => { dispatch({ type: 'DESTROY_PLANET', index: confirmDestroyIndex }); setConfirmDestroyIndex(null); }}>
              Destroy
            </button>
            <button className="solar-create-cancel" onClick={() => setConfirmDestroyIndex(null)}>Cancel</button>
          </div>
        </div>
      )}

      {confirmRemoveIndex !== null && (
        <div className="solar-destroy-confirm">
          <p>🗑️ Remove <strong>{state.planets[confirmRemoveIndex]?.name}</strong> from the list?</p>
          <div className="solar-create-actions">
            <button className="solar-destroy-yes" onClick={() => { dispatch({ type: 'REMOVE_DESTROYED_PLANET', index: confirmRemoveIndex }); setConfirmRemoveIndex(null); }}>
              Remove
            </button>
            <button className="solar-create-cancel" onClick={() => setConfirmRemoveIndex(null)}>Cancel</button>
          </div>
        </div>
      )}

      {unlocked && !showCreateForm && (
        <button className="solar-create-btn" onClick={() => setShowCreateForm(true)}>
          + Found New Planet
        </button>
      )}

      {showCreateForm && (
        <div className="solar-create-form">
          <input
            className="solar-create-name"
            placeholder="Planet name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="solar-create-modes">
            <label className={startMode === 'basic4' ? 'selected' : ''}>
              <input type="radio" name="mode" checked={startMode === 'basic4'} onChange={() => setStartMode('basic4')} />
              Basic 4
            </label>
            <label className={startMode === 'all' ? 'selected' : ''}>
              <input type="radio" name="mode" checked={startMode === 'all'} onChange={() => setStartMode('all')} />
              All Discovered
            </label>
            <label className={startMode === 'custom' ? 'selected' : ''}>
              <input type="radio" name="mode" checked={startMode === 'custom'} onChange={() => setStartMode('custom')} />
              Custom
            </label>
          </div>

          {startMode === 'custom' && (
            <div className="solar-custom-picker">
              <span className="solar-custom-title">Select starting elements</span>
              <div className="solar-custom-grid">
                {customStartOptions.map((element) => (
                  <label key={element.id} className="solar-custom-option">
                    <input
                      type="checkbox"
                      checked={customElementIds.includes(element.id)}
                      onChange={(e) => {
                        setCustomElementIds((current) =>
                          e.target.checked
                            ? [...current, element.id]
                            : current.filter((id) => id !== element.id)
                        );
                      }}
                    />
                    <span>{element.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="solar-create-actions">
            <button className="solar-create-confirm" onClick={handleCreate} disabled={!canCreatePlanet}>
              Create ({creationCost.toFixed(1)} Cosmic)
            </button>
            <button className="solar-create-cancel" onClick={() => setShowCreateForm(false)}>Cancel</button>
          </div>
          {!canCreatePlanet && (
            <p className="solar-create-warning">Not enough Cosmic Insight to found a new planet yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
