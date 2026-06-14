'use client';

import { ACTIONS, PHASES } from '../../lib/protocol.js';

// Host-side control panel for the active round. Shares a nav bar (prev/next/
// reveal) and switches the body on round.kind. Quads is fully wired; other round
// kinds show the prompt/answer plus quick manual awards until their engines land.
export default function HostRoundControls({ state, action }) {
  const round = state?.round;
  if (state?.phase === PHASES.FINISHED) {
    return (
      <div className="panel" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Final standings</h2>
        <p className="muted">The TV is showing the podium. Reset to start a new game.</p>
      </div>
    );
  }
  if (!round) {
    return (
      <div className="panel" style={{ padding: 20 }}>
        <p className="muted">Press <b>Start quiz</b> or pick a round to begin.</p>
      </div>
    );
  }

  // Round title card stage: the TV/players show the title; host presses Begin.
  if (state?.roundIntro) {
    const meta = state?.rounds?.[state?.roundIndex];
    return (
      <div className="panel" style={{ padding: 20, textAlign: 'center' }}>
        <div className="pill">Title screen showing on TV</div>
        <h2 style={{ margin: '12px 0 4px' }}>{meta?.title}</h2>
        {meta?.subtitle && <p className="muted" style={{ marginTop: 0 }}>{meta.subtitle}</p>}
        <button className="primary" style={{ fontSize: 18, marginTop: 10 }} onClick={() => action(ACTIONS.BEGIN_ROUND)}>
          ▶ Begin round
        </button>
      </div>
    );
  }

  const teams = state?.teams ?? [];
  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? '—';

  return (
    <div className="panel" style={{ padding: 20 }}>
      <NavBar state={state} action={action} />

      {round.media && (
        <img
          src={round.media}
          alt=""
          style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', marginTop: 10, display: 'block' }}
        />
      )}
      <div style={{ fontSize: 22, fontWeight: 700, margin: '14px 0' }}>{round.prompt || '—'}</div>
      <div style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
        <span className="muted">Answer: </span>
        <b style={{ color: 'var(--good)' }}>{round.answer ?? '••• (revealed only on TV after you press Reveal)'}</b>
        {round.answerImage && (
          <div style={{ marginTop: 8 }}>
            <img
              src={round.answerImage}
              alt=""
              style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
            />
            <span className="muted" style={{ fontSize: 12 }}>answer image — appears on the TV when you Reveal</span>
          </div>
        )}
      </div>

      {round.kind === 'quads' && <QuadsBody round={round} teams={teams} nameOf={nameOf} action={action} />}
      {round.kind === 'match' && <MatchHostBody round={round} teams={teams} action={action} />}
      {(round.kind === 'jetsetters' || round.kind === 'invisibles') && (
        <TextHostBody round={round} teams={teams} action={action} />
      )}
      {round.kind === 'music' && <MusicHostBody round={round} teams={teams} nameOf={nameOf} action={action} />}
      {round.placeholder && <PlaceholderBody round={round} teams={teams} action={action} />}
    </div>
  );
}

// Shared open/close + submission counter for the submission-based rounds.
function SubmissionBar({ round, teams, action }) {
  const submitted = round.submittedTeamIds?.length ?? 0;
  return (
    <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {round.open ? (
        <button className="danger" onClick={() => action(ACTIONS.CLOSE_ANSWERS)}>■ Close answers</button>
      ) : (
        <button className="primary" onClick={() => action(ACTIONS.OPEN_ANSWERS)}>▶ Open answers</button>
      )}
      <span className="pill">{round.open ? 'OPEN — teams can submit' : 'closed'}</span>
      <span className="muted">{submitted}/{teams.length} submitted</span>
    </div>
  );
}

function MatchHostBody({ round, teams, action }) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
        <ol style={{ margin: 0 }}>
          {(round.left || []).map((l, i) => (
            <li key={i}><b>{l}</b> {round.answerKey && <span className="muted">→ {round.answerKey[String(i + 1)]}</span>}</li>
          ))}
        </ol>
        <ol type="A" style={{ margin: 0 }}>
          {(round.right || []).map((r, i) => <li key={i}>{r}</li>)}
        </ol>
      </div>
      <SubmissionBar round={round} teams={teams} action={action} />
      <button style={{ marginTop: 12 }} onClick={() => action(ACTIONS.AUTO_GRADE)}>⚖ Auto-grade (5/pair)</button>
      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        {teams.map((t) => {
          const sub = round.submissions?.[t.id];
          return (
            <div key={t.id} style={{ display: 'flex', gap: 8, fontSize: 14 }}>
              <b style={{ width: 120 }}>{t.name}</b>
              <span className="muted" style={{ flex: 1 }}>
                {sub ? letters.map((_, i) => `${i + 1}→${sub[String(i + 1)] || '?'}`).join('  ') : 'no submission'}
              </span>
              {round.graded?.[t.id] != null && <b style={{ color: 'var(--good)' }}>+{round.graded[t.id]}</b>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextHostBody({ round, teams, action }) {
  return (
    <div>
      <SubmissionBar round={round} teams={teams} action={action} />
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {teams.map((t) => {
          const sub = round.submissions?.[t.id];
          const pts = round.graded?.[t.id];
          return (
            <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
              <b style={{ width: 120 }}>{t.name}</b>
              <span style={{ flex: 1, fontStyle: sub ? 'normal' : 'italic', color: sub ? 'var(--text)' : 'var(--muted)' }}>
                {sub || 'no submission'}
              </span>
              {pts != null && <span className="pill">+{pts}</span>}
              <button className="primary" onClick={() => action(ACTIONS.GRADE_TEAM, { teamId: t.id, correct: true })}>✓</button>
              <button className="danger" onClick={() => action(ACTIONS.GRADE_TEAM, { teamId: t.id, correct: false })}>✗</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavBar({ state, action }) {
  const round = state.round;
  const idx = (round.qIndex ?? 0) + 1;
  const total = round.count ?? 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button onClick={() => action(ACTIONS.PREV_QUESTION)} disabled={idx <= 1}>← Prev</button>
      <span style={{ fontWeight: 700 }}>
        {round.kind === 'quads'
          ? `Set ${round.setIndex + 1}/${round.setCount} · Q ${round.qInSet + 1}/${round.perSet}`
          : `Q ${idx}/${total}`}
      </span>
      <button onClick={() => action(ACTIONS.NEXT_QUESTION)} disabled={idx >= total}>Next →</button>
      <span style={{ marginLeft: 'auto' }} />
      {round.revealed ? (
        <button onClick={() => action(ACTIONS.HIDE)}>Hide answer</button>
      ) : (
        <button className="primary" onClick={() => action(ACTIONS.REVEAL)}>Reveal answer</button>
      )}
    </div>
  );
}

function QuadsBody({ round, teams, nameOf, action }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="muted">Direct to:</span>
        <b style={{ color: 'var(--accent)' }}>{nameOf(round.directTeamId)}</b>
        <span className="muted" style={{ fontSize: 13 }}>· override:</span>
        {teams.map((t) => (
          <button
            key={t.id}
            className={t.id === round.directTeamId ? 'primary' : ''}
            onClick={() => action(ACTIONS.QUADS_SET_DIRECT, { teamId: t.id })}
            style={{ padding: '4px 10px' }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="primary" onClick={() => action(ACTIONS.QUADS_MARK_DIRECT, { correct: true })}>
          ✓ Direct correct
        </button>
        <button className="danger" onClick={() => action(ACTIONS.QUADS_MARK_DIRECT, { correct: false })}>
          ✕ Direct wrong → pass
        </button>
        <span className="pill">{statusLabel(round.status)}</span>
      </div>

      {round.status === 'passing' && (
        <div style={{ marginTop: 14, padding: 12, border: '1px dashed var(--warn)', borderRadius: 10 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            On the pass — team {round.passNumber} of {round.passTotal} (round-robin from the direct)
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <b style={{ fontSize: 20, color: 'var(--warn)' }}>{nameOf(round.passTeamId)}</b>
            <button className="primary" onClick={() => action(ACTIONS.QUADS_MARK_PASS, { correct: true })}>
              ✓ Got it (+pass)
            </button>
            <button className="danger" onClick={() => action(ACTIONS.QUADS_MARK_PASS, { correct: false })}>
              ✗ Wrong → next team
            </button>
            <button className="ghost" onClick={() => action(ACTIONS.QUADS_PASS_NONE)}>End pass</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MusicHostBody({ round, teams, nameOf, action }) {
  const winner = round.winnerId;
  return (
    <div style={{ marginTop: 16 }}>
      {round.audio && (
        <audio controls src={round.audio} style={{ width: '100%', marginBottom: 12 }}>
          your browser can’t play this clip
        </audio>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {round.armed ? (
          <span className="pill" style={{ background: 'var(--good)', color: '#0b1020' }}>● BUZZERS LIVE</span>
        ) : (
          <button className="primary" onClick={() => action(ACTIONS.ARM_BUZZER)}>🔔 Arm buzzers</button>
        )}
        <button className="ghost" onClick={() => action(ACTIONS.CLEAR_BUZZER)}>Clear / reset</button>
        {round.lockedOut?.length > 0 && (
          <span className="muted" style={{ fontSize: 13 }}>locked out: {round.lockedOut.map(nameOf).join(', ')}</span>
        )}
      </div>

      <div style={{ marginTop: 14, minHeight: 56 }}>
        {winner ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>🚨 {nameOf(winner)} buzzed!</span>
            <button className="primary" onClick={() => action(ACTIONS.MARK_BUZZ, { correct: true })}>✓ Correct (+10)</button>
            <button className="danger" onClick={() => action(ACTIONS.MARK_BUZZ, { correct: false })}>✗ Wrong → re-arm</button>
          </div>
        ) : (
          <span className="muted">{round.armed ? 'Waiting for a buzz…' : 'Play the clip, then arm the buzzers.'}</span>
        )}
      </div>
    </div>
  );
}

function statusLabel(s) {
  if (s === 'asking') return 'Awaiting your mark';
  if (s === 'passing') return 'On the pass';
  if (s === 'done') return '✓ Scored';
  return s;
}

function PlaceholderBody({ round, teams, action }) {
  // Until this round's engine is wired in, allow quick manual scoring.
  return (
    <div style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Full interaction for this round is coming. For now, award manually:
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {teams.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1 }}>{t.name}</span>
            <button onClick={() => action(ACTIONS.ADJUST_SCORE, { teamId: t.id, delta: -10 })}>−10</button>
            <span style={{ minWidth: 50, textAlign: 'center', fontWeight: 800 }}>{t.score}</span>
            <button onClick={() => action(ACTIONS.ADJUST_SCORE, { teamId: t.id, delta: 10 })}>+10</button>
          </div>
        ))}
      </div>
    </div>
  );
}
