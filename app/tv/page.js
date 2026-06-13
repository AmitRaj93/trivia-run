'use client';

import { useEffect, useState } from 'react';
import { useGameSocket } from '../../lib/useGameSocket.js';
import { PHASES } from '../../lib/protocol.js';
import Scoreboard from '../../components/Scoreboard.js';
import TvRound from '../../components/tv/TvRound.js';
import Timer from '../../components/Timer.js';
import QRJoin from '../../components/QRJoin.js';

export default function TvPage() {
  const { connected, joined, state, joinTv, error } = useGameSocket();
  const [code, setCode] = useState('');

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

  return (
    <main style={{ minHeight: '100vh', padding: '4vh 4vw', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2.4vw', margin: 0 }}>{state?.quizTitle ?? 'Trivia Run'}</h1>
        {state?.timer && <Timer endsAt={state.timer.endsAt} big />}
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: '1.1vw' }}>Join code</div>
          <div className="roomcode" style={{ fontSize: '3.4vw', color: 'var(--accent)', lineHeight: 1 }}>{joined.roomCode}</div>
        </div>
      </header>

      <section style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '3vh 0' }}>
        {phase === PHASES.LOBBY && <Lobby code={joined.roomCode} teams={teams} maxTeams={state?.config?.maxTeams ?? 4} />}
        {phase === PHASES.IN_ROUND && <TvRound state={state} />}
        {phase === PHASES.FINISHED && <Podium teams={teams} />}
      </section>

      {phase === PHASES.IN_ROUND && teams.length > 0 && (
        <footer style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <Scoreboard teams={teams} highlightId={state?.round?.directTeamId} />
        </footer>
      )}
    </main>
  );
}

function Lobby({ code, teams, maxTeams }) {
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
          gridTemplateColumns: `repeat(${Math.max(2, maxTeams)}, 1fr)`,
          gap: 16,
          marginTop: 28,
        }}
      >
        {Array.from({ length: maxTeams }).map((_, i) => {
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
  const top = teams.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <div style={{ fontSize: '2.6vw', fontWeight: 800, marginBottom: 24 }}>Final standings</div>
      <div style={{ display: 'grid', gap: 16, maxWidth: 800, margin: '0 auto' }}>
        {top.map((t, i) => (
          <div key={t.id} className="panel" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16, fontSize: '2vw' }}>
            <span>{medals[i]}</span>
            <span style={{ flex: 1, fontWeight: 800, textAlign: 'left' }}>{t.name}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{t.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
