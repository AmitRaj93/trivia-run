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

      {round.quotes?.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            gap: big ? '3vw' : 16,
            flexWrap: 'wrap',
            margin: big ? '3vh auto 0' : '18px auto 0',
            maxWidth: big ? '88%' : '100%',
          }}
        >
          {round.quotes.map((qt, i) => (
            <Quote key={i} quote={qt} big={big} multi={round.quotes.length > 1} />
          ))}
        </div>
      )}

      <div className="muted" style={{ fontSize: big ? '1.3vw' : 13, marginTop: big ? '3vh' : 14 }}>
        Get ready…
      </div>
    </div>
  );
}

function Quote({ quote, big, multi }) {
  return (
    <blockquote
      style={{
        flex: multi ? '1 1 0' : '0 1 auto',
        maxWidth: multi ? '42%' : big ? '34em' : '100%',
        margin: 0,
        padding: big ? '0 1.5vw' : '0 8px',
        borderLeft: `${big ? '0.3vw' : '3px'} solid var(--accent)`,
        textAlign: 'left',
      }}
    >
      <p style={{ fontStyle: 'italic', fontSize: big ? '1.7vw' : 16, lineHeight: 1.3, margin: 0 }}>“{quote.text}”</p>
      <footer className="muted" style={{ fontSize: big ? '1.3vw' : 13, marginTop: big ? '1vh' : 6 }}>
        — {quote.author}
      </footer>
    </blockquote>
  );
}
