'use client';

import { useGameSocket } from '../../lib/useGameSocket.js';
import { ACTIONS, PHASES } from '../../lib/protocol.js';
import ConnDot from '../../components/ConnDot.js';
import HostRoundControls from '../../components/host/HostRoundControls.js';

export default function HostPage() {
  const sock = useGameSocket();
  const { connected, joined, state, create, action, error } = sock;

  if (!joined) {
    return (
      <main className="center-screen">
        <div className="panel" style={{ padding: 36, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div className="pill">Quizmaster console</div>
          <h1 style={{ marginTop: 14 }}>Start a new game</h1>
          <p className="muted">
            Opens a room with a 4-letter code. Put the TV display on the big screen; team reps join
            from their phones and you approve them here.
          </p>
          <button className="primary" style={{ fontSize: 18, width: '100%' }} disabled={!connected} onClick={create}>
            {connected ? 'Start new game' : 'Connecting…'}
          </button>
          {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
        </div>
      </main>
    );
  }

  const teams = state?.teams ?? [];
  const pending = state?.pending ?? [];
  const phase = state?.phase;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="pill">Quizmaster console</div>
          <h1 style={{ margin: '8px 0 0' }}>
            Room <span className="roomcode" style={{ color: 'var(--accent)' }}>{joined.roomCode}</span>
          </h1>
          <div className="muted" style={{ marginTop: 4 }}>{state?.quizTitle}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><ConnDot on={connected} /> {connected ? 'Live' : 'Reconnecting…'}</div>
          <div className="muted" style={{ fontSize: 13, margin: '6px 0' }}>{phaseLabel(phase, state)}</div>
          <button className="danger" onClick={() => confirm('Reset game and zero all scores?') && action(ACTIONS.RESET)}>
            Reset
          </button>
        </div>
      </header>

      {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* left: teams + admission */}
        <aside style={{ display: 'grid', gap: 16 }}>
          {pending.length > 0 && (
            <section className="panel" style={{ padding: 16, borderColor: 'var(--warn)' }}>
              <h3 style={{ margin: '0 0 10px' }}>Join requests ({pending.length})</h3>
              {pending.map((p) => (
                <div key={p.reqId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{p.teamName}</div>
                    {p.repName && <div className="muted" style={{ fontSize: 12 }}>rep: {p.repName}</div>}
                  </div>
                  <button className="primary" onClick={() => action(ACTIONS.APPROVE_TEAM, { reqId: p.reqId })}>✓</button>
                  <button className="danger" onClick={() => action(ACTIONS.REJECT_TEAM, { reqId: p.reqId })}>✕</button>
                </div>
              ))}
            </section>
          )}

          <section className="panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ margin: 0 }}>Teams</h3>
              <span className="muted">{teams.length}/{state?.config?.maxTeams ?? 4}</span>
            </div>
            {teams.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No teams yet. Share code <b className="roomcode">{joined.roomCode}</b>.</p>}
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {teams.map((t) => (
                <div key={t.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ConnDot on={t.repConnected} />
                    <input
                      defaultValue={t.name}
                      onBlur={(e) => e.target.value !== t.name && action(ACTIONS.RENAME_TEAM, { teamId: t.id, name: e.target.value })}
                      style={{ flex: 1, padding: '4px 8px', fontSize: 14 }}
                    />
                    <button className="ghost" title="Remove" onClick={() => action(ACTIONS.REMOVE_TEAM, { teamId: t.id })}>🗑</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <button onClick={() => action(ACTIONS.ADJUST_SCORE, { teamId: t.id, delta: -1 })}>−1</button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 18 }}>{t.score}</span>
                    <button onClick={() => action(ACTIONS.ADJUST_SCORE, { teamId: t.id, delta: 1 })}>+1</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* right: flow + round controls */}
        <section style={{ display: 'grid', gap: 16 }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="primary" disabled={phase === PHASES.IN_ROUND && state?.roundIndex === 0} onClick={() => action(ACTIONS.START_QUIZ)}>
                ▶ Start quiz
              </button>
              <span className="muted" style={{ marginLeft: 8 }}>Rounds:</span>
              {(state?.rounds ?? []).map((r) => (
                <button
                  key={r.index}
                  className={state?.roundIndex === r.index ? 'primary' : ''}
                  onClick={() => action(ACTIONS.GOTO_ROUND, { index: r.index })}
                >
                  {r.index + 1}
                </button>
              ))}
              <button onClick={() => action(ACTIONS.FINISH)} style={{ marginLeft: 'auto' }}>🏁 Final standings</button>
            </div>
          </div>

          <HostRoundControls state={state} action={action} />
        </section>
      </div>
    </main>
  );
}

function phaseLabel(phase, state) {
  if (phase === PHASES.LOBBY) return 'Lobby — waiting to start';
  if (phase === PHASES.FINISHED) return 'Finished';
  const r = state?.rounds?.[state?.roundIndex];
  return r ? `In round: ${r.title}` : 'In round';
}
