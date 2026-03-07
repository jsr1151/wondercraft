import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { ElementIcon } from './ElementIcon';
import './RecentDiscoveries.css';

export function RecentDiscoveries() {
  const { state } = useGame();
  const recent = state.recentDiscoveries
    .map(id => ELEMENTS.find(e => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e != null);

  if (recent.length === 0) return null;

  return (
    <div className="recent-discoveries">
      <h3>🕐 Recent Discoveries</h3>
      <div className="recent-scroll">
        {recent.map((elem, i) => (
          <div key={`${elem.id}-${i}`} className="recent-item" title={elem.description}>
            <ElementIcon
              element={elem}
              iconOverrides={state.iconOverrides}
              className="recent-emoji"
              imageClassName="recent-emoji-image"
            />
            <span className="recent-name">{elem.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
