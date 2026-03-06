import { useRef, useEffect } from 'react';
import { useGame } from '../store/useGame';
import './EventLog.css';

export function EventLog() {
  const { state } = useGame();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.eventLog]);

  if (state.eventLog.length === 0) return null;

  return (
    <div className="event-log">
      <h3>📜 World Events</h3>
      <div className="event-log-scroll" ref={logRef}>
        {state.eventLog.map((event, i) => (
          <div key={i} className="event-entry">{event}</div>
        ))}
      </div>
    </div>
  );
}
