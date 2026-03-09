import { useState } from 'react';
import { useGame } from '../store/useGame';
import { isMultiPlanetUnlocked, DESTRUCTIVE_ELEMENT_IDS } from '../store/gameStore';
import type { PlanetStartMode } from '../types';
import './SolarSystemView.css';

export function SolarSystemView() {
  const { state, dispatch } = useGame();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [startMode, setStartMode] = useState<PlanetStartMode>('basic4');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDestroyIndex, setConfirmDestroyIndex] = useState<number | null>(null);

  const unlocked = isMultiPlanetUnlocked(state);
  if (!unlocked && state.planets.length <= 1) return null;

  const canDestroy = Array.from(state.discoveredElements).some((id) => DESTRUCTIVE_ELEMENT_IDS.has(id));

  const handleCreate = () => {
    const name = newName.trim() || `Planet ${state.planets.length + 1}`;
    dispatch({ type: 'CREATE_PLANET', name, mode: startMode });
    setNewName('');
    setShowCreateForm(false);
    setStartMode('basic4');
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
        <span className="solar-system-title">🪐 Solar System</span>
        <span className="solar-system-count">{state.planets.filter(p => !p.destroyed).length} planet{state.planets.length !== 1 ? 's' : ''}</span>
      </div>

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
              {canDestroy && state.planets.filter(p => !p.destroyed).length > 1 && (
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

      {unlocked && !showCreateForm && (
        <button className="solar-create-btn" onClick={() => setShowCreateForm(true)}>
          + New Planet
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
          </div>
          <div className="solar-create-actions">
            <button className="solar-create-confirm" onClick={handleCreate}>Create</button>
            <button className="solar-create-cancel" onClick={() => setShowCreateForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
