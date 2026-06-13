'use client';

// What the big screen shows during a round. Switches on round.kind.
export default function TvRound({ state }) {
  const round = state?.round;
  if (!round) return null;
  const teams = state?.teams ?? [];
  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? '';

  const roundTitle = state?.rounds?.[state?.roundIndex]?.title ?? '';

  return (
    <div style={{ width: '100%', maxWidth: 1200, textAlign: 'center' }}>
      <div className="pill" style={{ fontSize: '1.2vw' }}>{roundTitle}</div>

      {round.kind === 'quads' && (
        <div className="muted" style={{ fontSize: '1.6vw', marginTop: 10 }}>
          Set {round.setIndex + 1} of {round.setCount} · Question {round.qInSet + 1} of {round.perSet}
        </div>
      )}

      {round.media && isImage(round.media) && (
        <img
          src={round.media}
          alt=""
          style={{ maxWidth: '70%', maxHeight: '46vh', borderRadius: 16, margin: '18px auto', display: 'block', boxShadow: 'var(--shadow)' }}
        />
      )}

      <div style={{ fontSize: '3vw', fontWeight: 800, margin: '24px auto', maxWidth: '90%', lineHeight: 1.2 }}>
        {round.prompt}
      </div>

      {round.kind === 'quads' && (
        <div
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: '1.8vw',
            fontWeight: 700,
            background: round.status === 'passing' ? 'var(--warn)' : 'var(--panel-2)',
            color: round.status === 'passing' ? '#0b1020' : 'var(--accent)',
            border: '1px solid var(--border)',
          }}
        >
          {round.status === 'passing'
            ? `↪ PASS to ${nameOf(round.passTeamId)} (${round.passNumber}/${round.passTotal})`
            : `Direct: ${nameOf(round.directTeamId)}`}
        </div>
      )}

      {round.kind === 'match' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6vw', marginTop: 18, fontSize: '1.7vw', textAlign: 'left' }}>
          <ol style={{ margin: 0 }}>
            {(round.left || []).map((l, i) => (
              <li key={i}>
                <b>{l}</b>
                {round.revealed && round.answerKey && (
                  <span style={{ color: 'var(--good)' }}> → {round.answerKey[String(i + 1)]}</span>
                )}
              </li>
            ))}
          </ol>
          <ol type="A" style={{ margin: 0 }}>
            {(round.right || []).map((r, i) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      )}

      {round.kind === 'music' && (
        <div style={{ marginTop: 24 }}>
          {round.winnerId ? (
            <div style={{ fontSize: '4vw', fontWeight: 900, color: 'var(--accent)' }}>🚨 {nameOf(round.winnerId)}!</div>
          ) : round.armed ? (
            <div style={{ fontSize: '3vw', fontWeight: 900, color: 'var(--good)' }}>● BUZZERS LIVE — press now!</div>
          ) : (
            <div className="muted" style={{ fontSize: '1.8vw' }}>Get ready to buzz…</div>
          )}
          {round.lockedOut?.length > 0 && (
            <div className="muted" style={{ fontSize: '1.2vw', marginTop: 8 }}>
              out: {round.lockedOut.map(nameOf).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      )}

      {['match', 'jetsetters', 'invisibles'].includes(round.kind) && (
        <div style={{ marginTop: 22 }}>
          <span
            className="pill"
            style={{ fontSize: '1.4vw', background: round.open ? 'var(--good)' : 'var(--panel-2)', color: round.open ? '#0b1020' : 'var(--muted)' }}
          >
            {round.open ? '● ANSWERS OPEN' : 'answers closed'} · {(round.submittedTeamIds || []).length}/{teams.length} in
          </span>
        </div>
      )}

      {round.revealed && round.answer && (
        <div style={{ marginTop: 28, fontSize: '2.4vw' }}>
          <span className="muted">Answer: </span>
          <b style={{ color: 'var(--good)' }}>{round.answer}</b>
        </div>
      )}
    </div>
  );
}

function isImage(url) {
  return /^https?:|^\/|\.(png|jpe?g|gif|webp|avif)$/i.test(url) && !/\.(mp3|wav|ogg|m4a)$/i.test(url);
}
