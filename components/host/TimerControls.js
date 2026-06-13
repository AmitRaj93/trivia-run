'use client';

import { useState } from 'react';
import { ACTIONS } from '../../lib/protocol.js';
import Timer from '../Timer.js';

// Quizmaster timer controls: enter a length (seconds), start/stop. The running
// countdown mirrors what teams and the TV see; on expiry the server auto-closes
// open answers.
export default function TimerControls({ timer, action, disabled }) {
  const [seconds, setSeconds] = useState(60);
  const running = !!timer;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="muted">Timer:</span>
      {running ? (
        <>
          <Timer endsAt={timer.endsAt} />
          <button className="danger" onClick={() => action(ACTIONS.STOP_TIMER)}>Stop</button>
        </>
      ) : (
        <>
          {[30, 45, 60, 90].map((s) => (
            <button key={s} className={seconds === s ? 'primary' : ''} onClick={() => setSeconds(s)} style={{ padding: '4px 10px' }}>
              {s}s
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={3600}
            value={seconds}
            onChange={(e) => setSeconds(Math.max(1, Math.min(3600, Number(e.target.value) || 1)))}
            style={{ width: 72, padding: '6px 8px' }}
          />
          <button className="primary" disabled={disabled} onClick={() => action(ACTIONS.START_TIMER, { seconds })}>
            ▶ Start
          </button>
        </>
      )}
    </div>
  );
}
