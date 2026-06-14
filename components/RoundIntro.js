'use client';

// The title card shown when a round opens, before its first question. Used big on
// the TV and compact on the player screens. `round` is the metadata entry from
// state.rounds (title + optional subtitle).
export default function RoundIntro({ round, index, total, big = false }) {
  if (!round) return null;
  return (
    <div style={{ textAlign: 'center', animation: 'introIn 0.5s ease' }}>
      <div className="pill" style={{ fontSize: big ? '1.3vw' : 13 }}>
        Round {index + 1} of {total}
      </div>
      <h1
        style={{
          fontSize: big ? '5vw' : 30,
          margin: big ? '18px 0 10px' : '12px 0 6px',
          lineHeight: 1.1,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {round.title}
      </h1>
      {round.subtitle && (
        <p className="muted" style={{ fontSize: big ? '1.8vw' : 15, maxWidth: big ? '70%' : '100%', margin: '0 auto' }}>
          {round.subtitle}
        </p>
      )}
      <div className="muted" style={{ fontSize: big ? '1.3vw' : 13, marginTop: big ? 24 : 14 }}>
        Get ready…
      </div>
    </div>
  );
}
