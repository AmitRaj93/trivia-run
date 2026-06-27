'use client';

import { useEffect, useState } from 'react';
import { useGameSocket } from '../../lib/useGameSocket.js';
import { PHASES } from '../../lib/protocol.js';
import Scoreboard from '../../components/Scoreboard.js';
import TvRound from '../../components/tv/TvRound.js';
import Timer from '../../components/Timer.js';
import QRJoin from '../../components/QRJoin.js';
import RoundIntro from '../../components/RoundIntro.js';
import { installAudioUnlock } from '../../lib/audioUnlock.js';

export default function TvPage() {
  const { connected, joined, state, joinTv, error } = useGameSocket();
  const [code, setCode] = useState('');

  // Unlock audio playback on the first interaction with this screen (so the music
  // round just plays when the host hits Play — no separate "Enable sound" step).
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get('room');
    if (room) setCode(room.toUpperCase());
  }, []);

  useEffect(() => {
    if (connected && code.length === 4 && !joined) joinTv(code);
  }, [connected, code, joined, joinTv]);

  if (!joined) {
    return (
      <main className="center-screen">
        <div className="panel" style={{ padding: 40, textAlign: 'center', maxWidth: 520, width: '100%' }}>
          <div className="pill">TV display</div>
          <h1>Connect this screen</h1>
          <p className="muted">Enter the room code from the quizmaster console.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD"
            className="roomcode"
            style={{ fontSize: 40, textAlign: 'center', width: 220 }}
          />
          {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
        </div>
      </main>
    );
  }

  const teams = state?.teams ?? [];
  const phase = state?.phase;

  // On a revealed Match question, flag teams that matched every pair correctly.
  const matchPerfectIds = (() => {
    const r = state?.round;
    if (r?.kind !== 'match' || !r.revealed || !r.answerKey || !r.submissions) return [];
    const entries = Object.entries(r.answerKey);
    if (entries.length === 0) return [];
    return teams
      .filter((t) => {
        const sub = r.submissions[t.id];
        return sub && entries.every(([k, v]) => String(sub[k] || '').toUpperCase() === String(v).toUpperCase());
      })
      .map((t) => t.id);
  })();

  return (
    <main style={{ height: '100vh', padding: '4vh 4vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ fontSize: '2.4vw', margin: 0 }}>{state?.quizTitle ?? 'Trivia Run'}</h1>
        {state?.timer && <Timer endsAt={state.timer.endsAt} big />}
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: '1.1vw' }}>Join code</div>
          <div className="roomcode" style={{ fontSize: '3.4vw', color: 'var(--accent)', lineHeight: 1 }}>{joined.roomCode}</div>
        </div>
      </header>

      <section style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3vh 0' }}>
        {phase === PHASES.LOBBY && <Lobby code={joined.roomCode} teams={teams} />}
        {phase === PHASES.IN_ROUND &&
          (state?.roundIntro ? (
            <RoundIntro round={state?.rounds?.[state?.roundIndex]} index={state?.roundIndex} total={state?.rounds?.length} big />
          ) : (
            <TvRound state={state} />
          ))}
        {phase === PHASES.FINISHED && <Podium teams={teams} />}
      </section>

      {/* Standings sit under the round title card only — hidden during questions so
          they never cover an image/reveal. */}
      {phase === PHASES.IN_ROUND && state?.roundIntro && teams.length > 0 && (
        <footer style={{ maxWidth: 1100, margin: '0 auto', width: '100%', flexShrink: 0 }}>
          <Scoreboard teams={teams} highlightId={state?.round?.directTeamId} starIds={matchPerfectIds} />
        </footer>
      )}
    </main>
  );
}

function Lobby({ code, teams }) {
  // The team count is whatever the host approves — show every joined team and pad
  // with a few empty slots as a hint until they arrive. The grid auto-fits, so it
  // scales from 1 team to many without a fixed 4-up layout.
  const slots = Math.max(teams.length, 4);
  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 1000 }}>
      <div style={{ fontSize: '2vw', marginBottom: 6 }}>Teams, join now</div>
      <div className="muted" style={{ fontSize: '1.3vw' }}>
        Scan the code with your phone’s camera, or open <b>/play</b> and enter code{' '}
        <b className="roomcode">{code}</b>
      </div>
      <div style={{ marginTop: 18 }}>
        <QRJoin roomCode={code} size={220} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginTop: 28,
        }}
      >
        {Array.from({ length: slots }).map((_, i) => {
          const t = teams[i];
          return (
            <div
              key={i}
              className="panel"
              style={{
                padding: '24px 16px',
                fontSize: '1.6vw',
                fontWeight: 700,
                opacity: t ? 1 : 0.4,
                borderStyle: t ? 'solid' : 'dashed',
              }}
            >
              {t ? t.name : `Team ${i + 1}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Podium({ teams }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <div style={{ fontSize: '2.6vw', fontWeight: 800, marginBottom: 24 }}>Final standings</div>
      <div style={{ display: 'grid', gap: 14, maxWidth: 820, margin: '0 auto' }}>
        {teams.map((t, i) => (
          <div
            key={t.id}
            className="panel"
            style={{
              padding: '16px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: i < 3 ? '2vw' : '1.6vw',
              opacity: i < 3 ? 1 : 0.85,
            }}
          >
            <span style={{ minWidth: '2.4vw', textAlign: 'center' }}>{medals[i] ?? i + 1}</span>
            <span style={{ flex: 1, fontWeight: 800, textAlign: 'left' }}>{t.name}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{t.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
