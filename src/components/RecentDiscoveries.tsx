import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { ElementIcon } from './ElementIcon';
import { resolveElementDescription, resolveElementName } from '../utils/nameResolver';
import './RecentDiscoveries.css';

export function RecentDiscoveries() {
  const { state } = useGame();
  const allElements = [...ELEMENTS, ...state.customElements];
  const recent = state.recentDiscoveries
    .map(id => allElements.find(e => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e != null);

  if (recent.length === 0) return null;

  return (
    <div className="recent-discoveries">
      <h3>🕐 Recent Discoveries</h3>
      <div className="recent-scroll">
        {recent.map((elem, i) => (
          <div key={`${elem.id}-${i}`} className="recent-item" title={resolveElementDescription(elem, state.descriptionOverrides)}>
            <ElementIcon
              element={elem}
              iconOverrides={state.iconOverrides}
              className="recent-emoji"
              imageClassName="recent-emoji-image"
            />
            <span className="recent-name">{resolveElementName(elem, state.nameOverrides)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
