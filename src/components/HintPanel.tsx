import './HintPanel.css';

interface HintPanelProps {
  hints: string[];
}

export function HintPanel({ hints }: HintPanelProps) {
  if (hints.length === 0) return null;
  const latest = hints[0];

  return (
    <div className="hint-panel">
      <div className="hint-icon">💡</div>
      <p className="hint-text">{latest}</p>
    </div>
  );
}
