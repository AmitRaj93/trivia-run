'use client';

import { useEffect, useState } from 'react';
import { PHASES } from '../../lib/protocol.js';
import RoundIntro from '../RoundIntro.js';

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
        {round.kind === 'match' && <MatchRep round={round} submitted={submitted} answer={answer} />}
        {(round.kind === 'jetsetters' || round.kind === 'invisibles') && (
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

function MatchRep({ round, submitted, answer }) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const [map, setMap] = useState({});
  // Reset the local mapping when the question changes.
  useEffect(() => setMap({}), [round.qIndex]);

  if (!round.open && !submitted) return <Closed prompt={round.prompt} />;

  const complete = (round.left || []).every((_, i) => map[String(i + 1)]);
  return (
    <div>
      <p style={{ fontWeight: 700 }}>{round.prompt}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {(round.left || []).map((l, i) => {
          const num = String(i + 1);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 24, fontWeight: 800 }}>{num}.</span>
              <span style={{ flex: 1 }}>{l}</span>
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
      <div className="muted" style={{ fontSize: 13, margin: '10px 0' }}>
        Options: {(round.right || []).map((r, i) => `${letters[i]}=${r}`).join(' · ')}
      </div>
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
  useEffect(() => setText(''), [round.qIndex]);

  if (!round.open && !submitted) return <Closed prompt={round.prompt} />;
  const showImage = round.media && round.kind === 'jetsetters';
  return (
    <div>
      {showImage && (
        <img src={round.media} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, display: 'block' }} />
      )}
      {round.media && round.kind === 'invisibles'
        ? <p className="muted">Look at the image on the TV and type your answer.</p>
        : <p style={{ fontWeight: 700 }}>{round.prompt}</p>}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!round.open}
        placeholder="Your answer"
        style={{ width: '100%', marginBottom: 10 }}
      />
      {round.open ? (
        <button className="primary" style={{ width: '100%' }} disabled={!text.trim()} onClick={() => answer({ value: text.trim() })}>
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
