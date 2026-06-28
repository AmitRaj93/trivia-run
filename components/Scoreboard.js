import ConnDot from './ConnDot.js';

// Compact live standings, shared by TV / host / viewer. `big` scales it up for TV.
// `starIds` marks teams to flag with a ★ (e.g. a perfect Match round on reveal).
export default function Scoreboard({ teams = [], big = false, highlightId = null, starIds = [] }) {
  if (teams.length === 0) return null;
  const starred = new Set(starIds);
  const max = Math.max(1, ...teams.map((t) => t.score));
  return (
    <div style={{ display: 'grid', gap: big ? 12 : 8 }}>
      {teams.map((t, i) => (
        <div
          key={t.id}
          className="panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: big ? '14px 18px' : '8px 12px',
            border: t.id === highlightId ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: t.id === highlightId ? 'var(--panel-2)' : 'var(--panel)',
          }}
        >
          <span className="muted" style={{ width: big ? 28 : 20, fontWeight: 800 }}>
            {i + 1}
          </span>
          <ConnDot on={t.repConnected} />
          <span style={{ flex: 1, fontWeight: 700, fontSize: big ? '1.6vw' : 16 }}>
            {t.name}
            {starred.has(t.id) && (
              <span title="Perfect!" style={{ marginLeft: 8, color: 'var(--warn)' }}>★</span>
            )}
          </span>
          <div
            style={{
              position: 'relative',
              width: big ? 220 : 120,
              height: big ? 10 : 6,
              background: 'var(--bg)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${Math.max(0, Math.min(100, (t.score / max) * 100))}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              }}
            />
          </div>
          <span style={{ fontWeight: 800, fontSize: big ? '1.8vw' : 18, minWidth: big ? 60 : 40, textAlign: 'right' }}>
            {t.score}
          </span>
        </div>
      ))}
    </div>
  );
}
