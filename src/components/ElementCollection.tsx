import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameData, useGameDispatch, useGameSelection } from '../store/useGame';
import { ELEMENTS } from '../data/elements';
import { ElementCard } from './ElementCard';
import { DEFAULT_ELEMENT_CATEGORIES, type ElementCategory } from '../types';
import { hasElementCategory, resolveElementCategories, resolveElementCategory } from '../utils/categoryResolver';
import { resolveElementDescription, resolveElementName } from '../utils/nameResolver';
import './ElementCollection.css';

export function ElementCollection() {
  const state = useGameData();
  const { selectedSlotA, selectedSlotB } = useGameSelection();
  const dispatch = useGameDispatch();
  const [activeCategory, setActiveCategory] = useState<ElementCategory | 'All'>('All');
  const [search, setSearch] = useState('');
  const allElements = useMemo(
    () => [...ELEMENTS, ...state.customElements],
    [state.customElements]
  );

  const discoveredElements = useMemo(() => {
    return allElements.filter(e => state.discoveredElements.has(e.id));
  }, [allElements, state.discoveredElements]);

  const filteredElements = useMemo(() => {
    const favorites = discoveredElements
      .filter((element) => state.favoriteElementIds.has(element.id))
      .sort((a, b) => resolveElementName(a, state.nameOverrides).localeCompare(resolveElementName(b, state.nameOverrides)));

    const matching = discoveredElements.filter(e => {
      if (state.favoriteElementIds.has(e.id)) return false;
      const matchCat = activeCategory === 'All' || hasElementCategory(e, activeCategory, state.categoryOverrides);
      const matchSearch = !search || 
        resolveElementName(e, state.nameOverrides).toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });

    return [...favorites, ...matching];
  }, [discoveredElements, activeCategory, search, state.nameOverrides, state.categoryOverrides, state.favoriteElementIds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: discoveredElements.length };
    for (const e of discoveredElements) {
      for (const category of resolveElementCategories(e, state.categoryOverrides)) {
        counts[category] = (counts[category] || 0) + 1;
      }
    }
    return counts;
  }, [discoveredElements, state.categoryOverrides]);

  const categories = useMemo(() => {
    const defaultCategoryList = DEFAULT_ELEMENT_CATEGORIES as readonly string[];
    const dynamic = Object.keys(categoryCounts)
      .filter((cat) => cat !== 'All' && !defaultCategoryList.includes(cat))
      .sort((a, b) => a.localeCompare(b));

    return ['All', ...defaultCategoryList, ...dynamic];
  }, [categoryCounts]);

  const isActiveCategoryAvailable = activeCategory === 'All' || categories.includes(activeCategory);

  useEffect(() => {
    if (!isActiveCategoryAvailable) {
      setActiveCategory('All');
    }
  }, [isActiveCategoryAvailable]);

  const handleSelect = useCallback((elementId: string) => {
    dispatch({ type: 'TOGGLE_SELECT_ELEMENT', elementId });
  }, [dispatch]);

  const handleToggleFavorite = useCallback((elementId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', elementId });
  }, [dispatch]);

  const handleDelete = useCallback((element: typeof filteredElements[number]) => {
    if (confirm(`Delete ${resolveElementName(element, state.nameOverrides)}?`)) {
      dispatch({ type: 'DELETE_ELEMENT', elementId: element.id });
    }
  }, [dispatch, state.nameOverrides]);

  return (
    <div className="element-collection">
      <div className="collection-header">
        <h2>📦 Elements ({discoveredElements.length}/{allElements.length})</h2>
        <input
          className="collection-search"
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="collection-tabs">
        {categories.map(cat => (
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
          filteredElements.map(e => (
            <ElementCard
              key={e.id}
              element={e}
              resolvedName={resolveElementName(e, state.nameOverrides)}
              resolvedDescription={resolveElementDescription(e, state.descriptionOverrides)}
              resolvedCategory={resolveElementCategory(e, state.categoryOverrides)}
              iconOverrides={state.iconOverrides}
              isSelectedA={selectedSlotA === e.id}
              isSelectedB={selectedSlotB === e.id}
              onSelect={handleSelect}
              isFavorite={state.favoriteElementIds.has(e.id)}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
