import { useState, useMemo } from 'react';
import { useGame } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { ElementCard } from './ElementCard';
import type { ElementCategory } from '../types';
import { resolveElementName } from '../utils/nameResolver';
import './ElementCollection.css';

const CATEGORIES: (ElementCategory | 'All')[] = [
  'All', 'Primordial', 'Nature', 'Materials', 'Weather',
  'Life', 'Civilization', 'Technology', 'Abstract', 'Cosmic', 'Weird'
];

export function ElementCollection() {
  const { state } = useGame();
  const [activeCategory, setActiveCategory] = useState<ElementCategory | 'All'>('All');
  const [search, setSearch] = useState('');

  const discoveredElements = useMemo(() => {
    return ELEMENTS.filter(e => state.discoveredElements.has(e.id));
  }, [state.discoveredElements]);

  const filteredElements = useMemo(() => {
    return discoveredElements.filter(e => {
      const matchCat = activeCategory === 'All' || e.category === activeCategory;
      const matchSearch = !search || 
        resolveElementName(e, state.nameOverrides).toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [discoveredElements, activeCategory, search, state.nameOverrides]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: discoveredElements.length };
    for (const e of discoveredElements) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, [discoveredElements]);

  return (
    <div className="element-collection">
      <div className="collection-header">
        <h2>📦 Elements ({discoveredElements.length}/{ELEMENTS.length})</h2>
        <input
          className="collection-search"
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="collection-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat} {categoryCounts[cat] ? `(${categoryCounts[cat]})` : ''}
          </button>
        ))}
      </div>
      <div className="elements-grid">
        {filteredElements.length === 0 ? (
          <p className="no-elements">No elements discovered in this category yet.</p>
        ) : (
          filteredElements.map(e => <ElementCard key={e.id} element={e} />)
        )}
      </div>
    </div>
  );
}
