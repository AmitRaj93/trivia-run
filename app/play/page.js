'use client';

import { useEffect, useState } from 'react';
import { useGameSocket } from '../../lib/useGameSocket.js';
import { ROLES } from '../../lib/protocol.js';
import RepRound from '../../components/play/RepRound.js';
import Scoreboard from '../../components/Scoreboard.js';
import ConnDot from '../../components/ConnDot.js';
import Timer from '../../components/Timer.js';

export default function PlayPage() {
  const { connected, joined, state, requestTeam, joinViewer, answer, error, rejected } = useGameSocket();
  const [team, setTeam] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get('room');
    if (room) setCode(room.toUpperCase());
  }, []);

  // ----- join form -----
  if (!joined) {
    const canRequest = connected && team.trim() && code.length === 4;
    return (
      <main className="center-screen">
        <div className="panel" style={{ padding: 28, maxWidth: 400, width: '100%' }}>
          <div className="pill">Player</div>
          <h1 style={{ marginTop: 12 }}>Join the game</h1>
          {rejected && <p style={{ color: 'var(--bad)' }}>Your request was declined by the quizmaster.</p>}

          <label className="muted" style={{ fontSize: 14 }}>Team name</label>
          <input value={team} onChange={(e) => setTeam(e.target.value.slice(0, 24))} placeholder="e.g. The Quizzlers" style={{ width: '100%', marginBottom: 12 }} />

          <label className="muted" style={{ fontSize: 14 }}>Your name (the rep)</label>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="optional" style={{ width: '100%', marginBottom: 12 }} />

          <label className="muted" style={{ fontSize: 14 }}>Room code</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="ABCD" className="roomcode" style={{ width: '100%', fontSize: 28, textAlign: 'center' }} />

          <button className="primary" style={{ width: '100%', marginTop: 16, fontSize: 18 }} disabled={!canRequest} onClick={() => requestTeam(code, team.trim(), name.trim())}>
            {connected ? 'Request to join as team' : 'Connecting…'}
          </button>
          <button className="ghost" style={{ width: '100%', marginTop: 8 }} disabled={!connected || code.length !== 4} onClick={() => joinViewer(code)}>
            Just watch (view only)
          </button>
          {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
        </div>
      </main>
    );
  }

  // ----- pending approval -----
  if (joined.pending) {
    return (
      <main className="center-screen">
        <div className="panel" style={{ padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div className="pill">Room {joined.roomCode}</div>
          <div style={{ fontSize: 40, margin: '16px 0' }}>⏳</div>
          <h1 style={{ margin: 0 }}>Waiting for approval</h1>
          <p className="muted">The quizmaster needs to let <b>{team || 'your team'}</b> in. Hang tight.</p>
          <div className="muted" style={{ fontSize: 13 }}><ConnDot on={connected} /> {connected ? 'connected' : 'reconnecting…'}</div>
        </div>
      </main>
    );
  }

  // ----- viewer -----
  if (joined.role === ROLES.VIEWER) {
    return (
      <main className="center-screen">
        <div className="panel" style={{ padding: 24, maxWidth: 440, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="pill">Viewing · Room {joined.roomCode}</div>
            <ConnDot on={connected} />
          </div>
          {state?.timer && <div style={{ textAlign: 'center', margin: '12px 0' }}><Timer endsAt={state.timer.endsAt} /></div>}
          {state?.round?.prompt && <h2 style={{ marginBottom: 4 }}>{state.round.prompt}</h2>}
          <div style={{ marginTop: 16 }}><Scoreboard teams={state?.teams ?? []} /></div>
        </div>
      </main>
    );
  }

  // ----- approved rep -----
  return (
    <main className="center-screen">
      <div className="panel" style={{ padding: 24, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="pill">Room {joined.roomCode}</span>
          <span className="muted" style={{ fontSize: 13 }}><ConnDot on={connected} /> {connected ? 'live' : 'reconnecting…'}</span>
        </div>
        {state?.timer && <div style={{ textAlign: 'center', marginBottom: 12 }}><Timer endsAt={state.timer.endsAt} /></div>}
        <RepRound state={state} myTeamId={joined.teamId} answer={answer} />
      </div>
    </main>
  );
}
