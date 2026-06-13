'use client';

import { useEffect, useState } from 'react';

// Smooth local countdown driven entirely off the server-provided `endsAt` epoch,
// so every surface shows the same time without per-second server broadcasts.
export default function Timer({ endsAt, big = false }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  if (!endsAt) return null;
  const remaining = Math.max(0, endsAt - now);
  const secs = Math.ceil(remaining / 1000);
  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  const danger = remaining <= 10000;
  const up = remaining <= 0;

  return (
    <div
      className={danger && !up ? 'timer-pulse' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 800,
        fontSize: big ? '3.4vw' : 22,
        padding: big ? '8px 22px' : '4px 12px',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: up ? 'var(--bad)' : danger ? 'rgba(255,107,107,0.18)' : 'var(--panel-2)',
        color: up ? '#fff' : danger ? 'var(--bad)' : 'var(--text)',
      }}
    >
      <span aria-hidden>{up ? '⏰' : '⏳'}</span>
      {up ? "Time's up" : `${mm}:${String(ss).padStart(2, '0')}`}
    </div>
  );
}
