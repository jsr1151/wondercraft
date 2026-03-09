import { memo } from 'react';
import type { Element } from '../types';
import { ElementIcon } from './ElementIcon';
import './ElementCard.css';

interface ElementCardProps {
  element: Element;
  compact?: boolean;
  resolvedName: string;
  resolvedDescription: string;
  resolvedCategory: string;
  iconOverrides: Record<string, string>;
  isSelectedA: boolean;
  isSelectedB: boolean;
  onSelect: (elementId: string) => void;
  onDelete?: (element: Element) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (elementId: string) => void;
}

export const ElementCard = memo(function ElementCard({
  element,
  compact = false,
  resolvedName,
  resolvedDescription,
  resolvedCategory,
  iconOverrides,
  isSelectedA,
  isSelectedB,
  onSelect,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
}: ElementCardProps) {
  const handleClick = () => {
    onSelect(element.id);
  };

  const handleDragStart: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.dataTransfer.setData('text/wondercraft-element-id', element.id);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const selClass = isSelectedA && isSelectedB
    ? 'selected-both'
    : isSelectedA
      ? 'selected-a'
      : isSelectedB
        ? 'selected-b'
        : '';

  if (compact) {
    return (
      <div
        className={`element-card compact ${selClass}`}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        title={`${resolvedName}: ${resolvedDescription}`}
      >
        <ElementIcon
          element={element}
          iconOverrides={iconOverrides}
          className="element-emoji"
          imageClassName="element-emoji-image"
        />
        <span className="element-name-compact">{resolvedName}</span>
      </div>
    );
  }

  return (
    <div
      className={`element-card ${selClass}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      title={resolvedDescription}
    >
      <ElementIcon
        element={element}
        iconOverrides={iconOverrides}
        className="element-emoji"
        imageClassName="element-emoji-image"
      />
      <span className="element-name">{resolvedName}</span>
      <span className="element-category">{resolvedCategory}</span>
      {onToggleFavorite && (
        <button
          type="button"
          className={`element-favorite ${isFavorite ? 'active' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(element.id);
          }}
          title={isFavorite ? 'Unfavorite element' : 'Favorite element'}
        >
          {isFavorite ? 'Starred' : 'Star'}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="element-delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(element);
          }}
          title="Delete element from discovered collection"
        >
          Delete
        </button>
      )}
    </div>
  );
});
