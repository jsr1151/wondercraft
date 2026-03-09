import { useEffect, useState } from 'react';
import type { InsightCurrency, InsightType } from '../types';
import { computeAccumulatedInsight } from '../store/gameStore';
import { useGame } from '../store/useGame';
import './InsightPanel.css';

interface InsightPanelProps {
  onRequestHint: (insightType: InsightType) => void;
  onRequestRandomDiscovery: (insightType: InsightType) => void;
}

const INSIGHT_ORDER: InsightType[] = [
  'nature',
  'life',
  'civilization',
  'technology',
  'cosmic',
  'materials',
  'weird',
  'warfare',
];

const INSIGHT_LABELS: Record<InsightType, string> = {
  nature: 'Nature',
  life: 'Life',
  civilization: 'Civilization',
  technology: 'Technology',
  cosmic: 'Cosmic',
  materials: 'Materials',
  weird: 'Weird',
  warfare: 'Warfare',
};

export function InsightPanel({ onRequestHint, onRequestRandomDiscovery }: InsightPanelProps) {
  const { state } = useGame();
  const [displayInsight, setDisplayInsight] = useState<InsightCurrency>(() => computeAccumulatedInsight(state));

  // Refresh the display every second using a local timer — no game state dispatch needed
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayInsight(computeAccumulatedInsight(state));
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  return (
    <div className="insight-panel" aria-label="Insight Currency">
      {INSIGHT_ORDER.map((type) => (
        <div className="insight-item" key={type}>
          <div className="insight-header-row">
            <span className="insight-label">{INSIGHT_LABELS[type]}</span>
            <span className="insight-value">{displayInsight[type].toFixed(1)}</span>
          </div>
          <div className="insight-actions">
            <button className="insight-btn" onClick={() => onRequestHint(type)}>Hint</button>
            <button className="insight-btn" onClick={() => onRequestRandomDiscovery(type)}>Unlock</button>
          </div>
        </div>
      ))}
    </div>
  );
}
