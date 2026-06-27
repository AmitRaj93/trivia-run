'use client';

import { useEffect, useState } from 'react';
import { PHASES } from '../../lib/protocol.js';
import RoundIntro from '../RoundIntro.js';
import MatchEntry from '../MatchEntry.js';

// What a team's representative sees on their phone during play. Switches on
// round.kind: quads is answered aloud; match/jetsetters/invisibles take input here.
export default function RepRound({ state, myTeamId, answer }) {
  const phase = state?.phase;
  const me = state?.teams?.find((t) => t.id === myTeamId);
  const round = state?.round;

  if (phase === PHASES.LOBBY) return <Centered title="You're in!" sub="Waiting for the quizmaster to start. Watch the TV." me={me} />;
  if (phase === PHASES.FINISHED) return <Centered title="That's a wrap!" sub="Final standings are on the TV." me={me} />;
  if (phase === PHASES.IN_ROUND && state?.roundIntro) {
    return (
      <div>
        <TeamBadge me={me} />
        <div style={{ marginTop: 20 }}>
          <RoundIntro round={state?.rounds?.[state?.roundIndex]} index={state?.roundIndex} total={state?.rounds?.length} />
        </div>
      </div>
    );
  }
  if (!round) return <Centered title="Get ready…" me={me} />;

  const submitted = (round.submittedTeamIds || []).includes(myTeamId);

  return (
    <div>
      <TeamBadge me={me} />
      <div style={{ marginTop: 14 }}>
        {round.kind === 'quads' && <QuadsRep round={round} myTeamId={myTeamId} />}
        {round.kind === 'match' && <MatchRep round={round} submitted={submitted} answer={answer} myTeamId={myTeamId} />}
        {(round.kind === 'jetsetters' || round.kind === 'invisibles' || round.kind === 'emoji') && (
          <TextRep round={round} submitted={submitted} answer={answer} />
        )}
        {round.kind === 'music' && <MusicRep round={round} myTeamId={myTeamId} answer={answer} />}
        {round.placeholder && (
          <p className="muted">{round.prompt}<br />This round is run by the quizmaster.</p>
        )}
      </div>
      {round.revealed && (round.answer || round.answerImage) && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          {round.answerImage && (
            <img src={round.answerImage} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 8, display: 'block' }} />
          )}
          {round.answer && <p style={{ margin: 0 }}>Answer: <b style={{ color: 'var(--good)' }}>{round.answer}</b></p>}
        </div>
      )}
    </div>
  );
}

function QuadsRep({ round, myTeamId }) {
  const isMyDirect = round.status === 'asking' && round.directTeamId === myTeamId;
  const isMyPass = round.status === 'passing' && round.passTeamId === myTeamId;
  const highlight = isMyDirect || isMyPass;

  let label;
  if (isMyDirect) label = '🎯 YOUR DIRECT — answer out loud!';
  else if (isMyPass) label = '↪ PASS TO YOU — answer out loud!';
  else if (round.status === 'passing') label = 'On the pass to another team…';
  else label = 'Listen to the quizmaster';

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          fontSize: 22,
          fontWeight: 800,
          background: highlight ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--panel)',
          color: highlight ? '#0b1020' : 'var(--text)',
          border: '1px solid var(--border)',
        }}
      >
        {label}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>{round.prompt}</p>
    </div>
  );
}

function MatchRep({ round, submitted, answer, myTeamId }) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const [map, setMap] = useState({});
  // Reset the local mapping when the question changes.
  useEffect(() => setMap({}), [round.qIndex]);

  if (!round.open && !submitted) return <Closed prompt={round.prompt} />;

  const complete = (round.left || []).every((_, i) => map[String(i + 1)]);

  // Once the host reveals, this team sees their own result — a ★ for a perfect match.
  const showResult = round.revealed && round.answerKey;
  const total = Object.keys(round.answerKey || {}).length;
  const mySub = round.submissions?.[myTeamId] || {};
  const correct = round.answerKey
    ? Object.entries(round.answerKey).filter(([k, v]) => String(mySub[k] || '').toUpperCase() === String(v).toUpperCase()).length
    : 0;
  const perfect = total > 0 && correct === total;
  const pts = round.graded?.[myTeamId];

  return (
    <div>
      {showResult && (
        <div
          style={{
            textAlign: 'center',
            padding: 16,
            borderRadius: 12,
            marginBottom: 14,
            background: perfect ? 'linear-gradient(135deg, var(--warn), var(--accent-2))' : 'var(--panel)',
            color: perfect ? '#0b1020' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          {perfect ? (
            <div style={{ fontWeight: 900, fontSize: 24 }}>🌟 Perfect! All {total} matched</div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 18 }}>{correct} / {total} correct</div>
          )}
          {pts != null && <div style={{ fontWeight: 800, marginTop: 4 }}>+{pts} points</div>}
        </div>
      )}
      <p style={{ fontWeight: 700 }}>{round.prompt}</p>

      {/* The lettered options to match against (images or text). */}
      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Options</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
        {(round.right || []).map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'var(--panel)' }}>
            <b style={{ color: 'var(--accent)' }}>{letters[i]}</b>
            <MatchEntry value={r} imgStyle={{ width: '100%', height: 56 }} textStyle={{ fontSize: 13, textAlign: 'center' }} />
          </div>
        ))}
      </div>

      {/* Each numbered item, pick its matching letter. */}
      <div style={{ display: 'grid', gap: 8 }}>
        {(round.left || []).map((l, i) => {
          const num = String(i + 1);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, fontWeight: 800 }}>{num}.</span>
              <div style={{ flex: 1 }}>
                <MatchEntry value={l} imgStyle={{ height: 52, maxWidth: '100%' }} textStyle={{ fontWeight: 600 }} />
              </div>
              <select
                value={map[num] || ''}
                disabled={!round.open}
                onChange={(e) => setMap((m) => ({ ...m, [num]: e.target.value }))}
                style={{ padding: 8, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8 }}
              >
                <option value="">—</option>
                {letters.map((L) => <option key={L} value={L}>{L}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <div style={{ height: 12 }} />
      {round.open ? (
        <button className="primary" style={{ width: '100%' }} disabled={!complete} onClick={() => answer({ value: map })}>
          {submitted ? 'Update answer' : 'Submit'}
        </button>
      ) : (
        <p className="muted">Answers closed.</p>
      )}
      {submitted && <p style={{ color: 'var(--good)', textAlign: 'center' }}>✓ Submitted</p>}
    </div>
  );
}

function TextRep({ round, submitted, answer }) {
  const [text, setText] = useState('');
  const [bonus, setBonus] = useState('');
  useEffect(() => {
    setText('');
    setBonus('');
  }, [round.qIndex]);

  if (!round.open && !submitted) return <Closed prompt={round.prompt} />;
  const showImage = round.media && round.kind === 'jetsetters';
  const submit = () => answer(round.bonus ? { value: text.trim(), bonus: bonus.trim() } : { value: text.trim() });
  return (
    <div>
      {showImage && (
        <img src={round.media} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, display: 'block' }} />
      )}
      {round.kind === 'emoji'
        ? <p style={{ fontSize: 44, textAlign: 'center', lineHeight: 1.2, margin: '4px 0 14px' }}>{round.prompt}</p>
        : round.media && round.kind === 'invisibles'
        ? <p className="muted">Look at the image on the TV and type your answer.</p>
        : <p style={{ fontWeight: 700 }}>{round.prompt}</p>}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!round.open}
        placeholder="Your answer"
        style={{ width: '100%', marginBottom: 10 }}
      />
      {round.bonus && (
        <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: 10, marginBottom: 10, background: 'var(--panel)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            ⭐ Bonus <span className="muted">(+{round.bonus.points})</span>
          </div>
          {round.bonus.q && <p style={{ margin: '0 0 8px', fontSize: 14 }}>{round.bonus.q}</p>}
          <input
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            disabled={!round.open}
            placeholder="Bonus answer (optional)"
            style={{ width: '100%' }}
          />
        </div>
      )}
      {round.open ? (
        <button className="primary" style={{ width: '100%' }} disabled={!text.trim()} onClick={submit}>
          {submitted ? 'Update answer' : 'Submit'}
        </button>
      ) : (
        <p className="muted">Answers closed.</p>
      )}
      {submitted && <p style={{ color: 'var(--good)', textAlign: 'center' }}>✓ Submitted</p>}
    </div>
  );
}

function MusicRep({ round, myTeamId, answer }) {
  const iWon = round.winnerId === myTeamId;
  const someoneWon = !!round.winnerId;
  const lockedOut = (round.lockedOut || []).includes(myTeamId);
  const canBuzz = round.armed && !someoneWon && !lockedOut;

  let label, bg, color, disabled;
  if (iWon) {
    label = '✅ YOU BUZZED FIRST!'; bg = 'var(--good)'; color = '#0b1020'; disabled = true;
  } else if (someoneWon) {
    label = '🔒 Locked — another team buzzed'; bg = 'var(--panel)'; color = 'var(--muted)'; disabled = true;
  } else if (lockedOut) {
    label = '❌ You answered — locked out'; bg = 'var(--panel)'; color = 'var(--muted)'; disabled = true;
  } else if (canBuzz) {
    label = 'BUZZ!'; bg = 'linear-gradient(135deg, var(--bad), var(--accent-2))'; color = '#fff'; disabled = false;
  } else {
    label = 'Wait for the buzzers…'; bg = 'var(--panel)'; color = 'var(--muted)'; disabled = true;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p className="muted">{round.prompt}</p>
      <button
        onClick={() => answer({ buzz: true })}
        disabled={disabled}
        style={{
          width: '100%', height: 200, borderRadius: 20, border: 'none',
          fontSize: 32, fontWeight: 900, letterSpacing: '0.04em',
          background: bg, color, marginTop: 10,
          boxShadow: canBuzz ? '0 8px 30px rgba(255,107,107,0.4)' : 'none',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {label}
      </button>
    </div>
  );
}

function Closed({ prompt }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="muted">{prompt}</p>
      <p>Waiting for the quizmaster to open answers…</p>
    </div>
  );
}

function TeamBadge({ me }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 800, fontSize: 20 }}>{me?.name ?? 'Your team'}</span>
      <span className="pill">{me?.score ?? 0} pts</span>
    </div>
  );
}

function Centered({ title, sub, me }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {me && <TeamBadge me={me} />}
      <h1 style={{ marginTop: 24 }}>{title}</h1>
      {sub && <p className="muted">{sub}</p>}
    </div>
  );
}
