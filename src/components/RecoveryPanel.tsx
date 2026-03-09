import { useEffect, useMemo, useState } from 'react';
import { getSaveDiagnostics, restoreSaveSnapshot, type SaveDiagnostics } from '../store/saveLoad';
import './RecoveryPanel.css';

function formatSnapshotLabel(snapshot: SaveDiagnostics): string {
  return snapshot.key === 'primary' ? 'Current Save' : 'Backup Save';
}

export function RecoveryPanel() {
  const [snapshots, setSnapshots] = useState<SaveDiagnostics[]>([]);
  const [restoringKey, setRestoringKey] = useState<'primary' | 'backup' | null>(null);

  useEffect(() => {
    setSnapshots(getSaveDiagnostics());
  }, []);

  const richest = useMemo(() => {
    return [...snapshots].sort((a, b) => b.discoveredCount - a.discoveredCount)[0] ?? null;
  }, [snapshots]);

  if (snapshots.length < 2) return null;

  return (
    <div className="recovery-panel">
      <div className="recovery-panel-header">
        <span className="recovery-panel-title">Recovery</span>
        {richest && <span className="recovery-panel-richest">Richest snapshot: {formatSnapshotLabel(richest)}</span>}
      </div>
      <div className="recovery-panel-list">
        {snapshots.map((snapshot) => (
          <div key={snapshot.key} className={`recovery-snapshot ${richest?.key === snapshot.key ? 'best' : ''}`}>
            <div className="recovery-snapshot-summary">
              <strong>{formatSnapshotLabel(snapshot)}</strong>
              <span>{snapshot.discoveredCount} unlocked</span>
              <span>{snapshot.planetCount} planet{snapshot.planetCount !== 1 ? 's' : ''}</span>
              <span>{snapshot.customElementCount} custom</span>
              <span>{snapshot.recipeCount} saved recipes</span>
            </div>
            <button
              className="recovery-restore-btn"
              disabled={restoringKey !== null}
              onClick={() => {
                setRestoringKey(snapshot.key);
                const ok = restoreSaveSnapshot(snapshot.key);
                if (ok) {
                  window.location.reload();
                  return;
                }
                setRestoringKey(null);
              }}
            >
              Restore
            </button>
          </div>
        ))}
      </div>
      <p className="recovery-panel-note">
        Restoring replaces the current local save with the selected snapshot and reloads the app.
      </p>
    </div>
  );
}