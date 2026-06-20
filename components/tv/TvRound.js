'use client';

import MatchEntry from '../MatchEntry.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NUMBERS = ['1', '2', '3', '4', '5', '6'];

// Every Match image sits in this exact same fixed canvas (object-fit:contain in
// MatchEntry pads to it), so all cells look identical regardless of aspect ratio.
const TV_MATCH_CANVAS = { width: '18vw', height: '16vh' };

// One side of a Match question as a 3×2 grid (2 across, 3 down) — fewer columns
// means bigger cells.
function TvMatchGrid({ items = [], labels, answerKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8vh 1.2vw', justifyItems: 'center' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '1.4vw', fontWeight: 800, color: 'var(--accent)' }}>{labels[i]}</div>
          <MatchEntry
            value={it}
            imgStyle={{ ...TV_MATCH_CANVAS }}
            textStyle={{ width: TV_MATCH_CANVAS.width, fontSize: '1.4vw', fontWeight: 700, textAlign: 'center' }}
          />
          {answerKey && (
            <div style={{ fontSize: '1.2vw', fontWeight: 800, color: 'var(--good)' }}>→ {answerKey[String(i + 1)]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// What the big screen shows during a round. Switches on round.kind.
export default function TvRound({ state }) {
  const round = state?.round;
  if (!round) return null;
  const teams = state?.teams ?? [];
  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? '';

  const roundTitle = state?.rounds?.[state?.roundIndex]?.title ?? '';

  // The main image slot: normally the question image; once revealed, the answer
  // image takes its place (so the reveal swaps the picture rather than stacking a
  // second one below). Falls back to the question image if there's no answer image.
  const mainImage =
    round.revealed && round.answerImage
      ? round.answerImage
      : isImage(round.media)
      ? round.media
      : null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1200,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.4vh',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="pill" style={{ fontSize: '1.2vw', flexShrink: 0 }}>{roundTitle}</div>

      {round.kind === 'quads' && (
        <div className="muted" style={{ fontSize: '1.6vw', flexShrink: 0 }}>
          Set {round.setIndex + 1} of {round.setCount} · Question {round.qIndex + 1} of {round.count}
        </div>
      )}

      {mainImage && <FitImage key={mainImage} src={mainImage} minVh={42} />}

      {round.prompt && (
        <div
          style={{
            // When there's an image the image takes ~half the screen, so the text
            // shrinks to fit the rest.
            fontSize: mainImage ? '1.7vw' : '2.6vw',
            fontWeight: 800,
            maxWidth: '92%',
            lineHeight: 1.12,
            flexShrink: 0,
          }}
        >
          {round.prompt}
        </div>
      )}

      {round.kind === 'quads' && (
        <div
          style={{
            flexShrink: 0,
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '2.5vw', flexShrink: 1, minHeight: 0 }}>
          <TvMatchGrid items={round.left} labels={NUMBERS} answerKey={round.revealed ? round.answerKey : null} />
          <div style={{ alignSelf: 'stretch', width: 2, background: 'var(--border)' }} />
          <TvMatchGrid items={round.right} labels={LETTERS} />
        </div>
      )}

      {round.kind === 'music' && (
        <div style={{ flexShrink: 0 }}>
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
        <div style={{ flexShrink: 0 }}>
          <span
            className="pill"
            style={{ fontSize: '1.4vw', background: round.open ? 'var(--good)' : 'var(--panel-2)', color: round.open ? '#0b1020' : 'var(--muted)' }}
          >
            {round.open ? '● ANSWERS OPEN' : 'answers closed'} · {(round.submittedTeamIds || []).length}/{teams.length} in
          </span>
        </div>
      )}

      {round.bonus && (
        <div style={{ flexShrink: 0, fontSize: '1.5vw' }}>
          <span className="pill" style={{ fontSize: '1.2vw', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            ⭐ Bonus +{round.bonus.points}
          </span>{' '}
          {round.bonus.q}
          {round.revealed && round.bonus.answer && (
            <span> — <b style={{ color: 'var(--good)' }}>{round.bonus.answer}</b></span>
          )}
        </div>
      )}

      {/* When a question shows an image, the answer slot is reserved at a fixed
          height even before reveal. That keeps the image the exact same size and
          position pre- and post-reveal (e.g. Invisibles, where the answer image is
          meant to overlap the question image), instead of the answer text shrinking
          and re-centering it on reveal. */}
      {mainImage ? (
        <div
          style={{
            flexShrink: 0,
            minHeight: '7vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.9vw',
          }}
        >
          {round.revealed && round.answer && (
            <span>
              <span className="muted">Answer: </span>
              <b style={{ color: 'var(--good)' }}>{round.answer}</b>
            </span>
          )}
        </div>
      ) : (
        round.revealed && round.answer && (
          <div style={{ fontSize: '2.2vw', flexShrink: 0 }}>
            <span className="muted">Answer: </span>
            <b style={{ color: 'var(--good)' }}>{round.answer}</b>
          </div>
        )
      )}
    </div>
  );
}

// An image that fills the leftover vertical space of the flex column while keeping
// its aspect ratio (object-fit: contain). flex:1 1 0 + min-height:0 lets it shrink
// so it never pushes the prompt/answer text off-screen or clips past the edges.
// minVh keeps the image at least that tall (≈ half the screen for question images),
// so a long prompt can't squeeze it to a thumbnail. flex:1 still lets it grow into
// any spare space; object-fit:contain preserves aspect ratio.
function FitImage({ src, minVh = 0 }) {
  return (
    <div
      style={{
        flex: '1 1 auto',
        minHeight: minVh ? `${minVh}vh` : 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt=""
        style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain', borderRadius: 14, boxShadow: 'var(--shadow)' }}
      />
    </div>
  );
}

function isImage(url) {
  return /^https?:|^\/|\.(png|jpe?g|gif|webp|avif)$/i.test(url) && !/\.(mp3|wav|ogg|m4a)$/i.test(url);
}
