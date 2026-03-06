import type { Element } from '../types';
import { useGame } from '../store/useGame';
import './ElementCard.css';

interface ElementCardProps {
  element: Element;
  compact?: boolean;
}

export function ElementCard({ element, compact = false }: ElementCardProps) {
  const { state, dispatch } = useGame();
  const { selectedSlotA, selectedSlotB } = state;

  const isSelectedA = selectedSlotA === element.id;
  const isSelectedB = selectedSlotB === element.id;

  const handleClick = () => {
    if (!selectedSlotA) {
      dispatch({ type: 'SELECT_SLOT_A', elementId: element.id });
    } else if (!selectedSlotB && selectedSlotA !== element.id) {
      dispatch({ type: 'SELECT_SLOT_B', elementId: element.id });
    } else if (isSelectedA) {
      dispatch({ type: 'SELECT_SLOT_A', elementId: null });
    } else if (isSelectedB) {
      dispatch({ type: 'SELECT_SLOT_B', elementId: null });
    } else {
      dispatch({ type: 'SELECT_SLOT_A', elementId: element.id });
    }
  };

  const selClass = isSelectedA ? 'selected-a' : isSelectedB ? 'selected-b' : '';

  if (compact) {
    return (
      <div
        className={`element-card compact ${selClass}`}
        onClick={handleClick}
        title={`${element.name}: ${element.description}`}
      >
        <span className="element-emoji">{element.emoji}</span>
        <span className="element-name-compact">{element.name}</span>
      </div>
    );
  }

  return (
    <div
      className={`element-card ${selClass}`}
      onClick={handleClick}
      title={element.description}
    >
      <span className="element-emoji">{element.emoji}</span>
      <span className="element-name">{element.name}</span>
      <span className="element-category">{element.category}</span>
    </div>
  );
}
