import { useState } from 'react';
import './BigBang.css';

interface BigBangProps {
  onBigBang: () => void;
}

export function BigBang({ onBigBang }: BigBangProps) {
  const [phase, setPhase] = useState<'idle' | 'expanding' | 'flash' | 'done'>('idle');

  const handleClick = () => {
    if (phase !== 'idle') return;
    setPhase('expanding');
    setTimeout(() => setPhase('flash'), 800);
    setTimeout(() => setPhase('done'), 1400);
    setTimeout(() => onBigBang(), 1600);
  };

  return (
    <div className={`bigbang-overlay ${phase}`}>
      <div className="bigbang-stars" />
      <div className="bigbang-content">
        <h1 className="bigbang-title">In the beginning...</h1>
        <p className="bigbang-subtitle">There was nothing. Then—</p>
        <div
          className={`bigbang-orb ${phase}`}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          <div className="bigbang-orb-inner" />
          <div className="bigbang-orb-glow" />
        </div>
        {phase === 'idle' && (
          <p className="bigbang-hint">Click the orb to ignite the universe</p>
        )}
      </div>
    </div>
  );
}
