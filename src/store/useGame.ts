import { useContext } from 'react';
import { GameDataContext, GameDispatchContext, GameSelectionContext } from './gameStore';

export function useGame() {
  return {
    state: {
      ...useGameData(),
      ...useGameSelection(),
    },
    dispatch: useGameDispatch(),
  };
}

export function useGameData() {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error('useGameData must be used within GameProvider');
  return ctx;
}

export function useGameSelection() {
  const ctx = useContext(GameSelectionContext);
  if (!ctx) throw new Error('useGameSelection must be used within GameProvider');
  return ctx;
}

export function useGameDispatch() {
  const ctx = useContext(GameDispatchContext);
  if (!ctx) throw new Error('useGameDispatch must be used within GameProvider');
  return ctx;
}
