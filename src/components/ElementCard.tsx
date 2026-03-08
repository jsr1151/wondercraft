import type { Element } from '../types';
import { useGame } from '../store/useGame';
import { ElementIcon } from './ElementIcon';
import { resolveElementCategory } from '../utils/categoryResolver';
import { resolveElementDescription, resolveElementName } from '../utils/nameResolver';
import './ElementCard.css';

interface ElementCardProps {
  element: Element;
  compact?: boolean;
  onDelete?: (elementId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (elementId: string) => void;
}

export function ElementCard({
  element,
  compact = false,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
}: ElementCardProps) {
  const { state, dispatch } = useGame();
  const { selectedSlotA, selectedSlotB, iconOverrides, nameOverrides } = state;
  const category = resolveElementCategory(element, state.categoryOverrides);

  const isSelectedA = selectedSlotA === element.id;
  const isSelectedB = selectedSlotB === element.id;

  const handleClick = () => {
    if (isSelectedA && !selectedSlotB) {
      dispatch({ type: 'SELECT_SLOT_B', elementId: element.id });
    } else if (isSelectedA && isSelectedB) {
      dispatch({ type: 'SELECT_SLOT_B', elementId: null });
    } else if (isSelectedA) {
      dispatch({ type: 'SELECT_SLOT_A', elementId: null });
    } else if (isSelectedB) {
      dispatch({ type: 'SELECT_SLOT_B', elementId: null });
    } else if (!selectedSlotA) {
      dispatch({ type: 'SELECT_SLOT_A', elementId: element.id });
    } else if (!selectedSlotB) {
      dispatch({ type: 'SELECT_SLOT_B', elementId: element.id });
    } else {
      dispatch({ type: 'SELECT_SLOT_A', elementId: element.id });
    }
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
        title={`${resolveElementName(element, nameOverrides)}: ${resolveElementDescription(element, state.descriptionOverrides)}`}
      >
        <ElementIcon
          element={element}
          iconOverrides={iconOverrides}
          className="element-emoji"
          imageClassName="element-emoji-image"
        />
        <span className="element-name-compact">{resolveElementName(element, nameOverrides)}</span>
      </div>
    );
  }

  return (
    <div
      className={`element-card ${selClass}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      title={resolveElementDescription(element, state.descriptionOverrides)}
    >
      <ElementIcon
        element={element}
        iconOverrides={iconOverrides}
        className="element-emoji"
        imageClassName="element-emoji-image"
      />
      <span className="element-name">{resolveElementName(element, nameOverrides)}</span>
      <span className="element-category">{category}</span>
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
            onDelete(element.id);
          }}
          title="Delete element from discovered collection"
        >
          Delete
        </button>
      )}
    </div>
  );
}
