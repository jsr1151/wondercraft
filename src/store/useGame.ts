import { useContext } from 'react';
import { GameContext } from './gameStore';

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
