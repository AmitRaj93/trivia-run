'use client';

import { useState } from 'react';

// Post-fact answer tracker for the quizmaster. Reads state.history (host-only) and
// groups every graded result by team, so after the game the host can see exactly
// which questions each team answered, what they said, and the points awarded.
// Re-grading a question updates its row in place (history is keyed server-side), so
// the totals here always match the live scores.
export default function AnswerTracker({ state }) {
  const [open, setOpen] = useState(false);
  const teams = state?.teams ?? [];
  const history = state?.history ?? [];
  if (teams.length === 0) return null;

  const byTeam = new Map(teams.map((t) => [t.id, []]));
  for (const h of history) if (byTeam.has(h.teamId)) byTeam.get(h.teamId).push(h);
  for (const list of byTeam.values()) {
    list.sort((a, b) => a.roundIndex - b.roundIndex || a.qIndex - b.qIndex || (a.slot > b.slot ? 1 : -1));
  }

  return (
    <section className="panel" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0 }}>📋 Answer tracker</h3>
        <span className="muted" style={{ fontSize: 13 }}>
          {history.length} graded answer{history.length === 1 ? '' : 's'}
        </span>
        <button className="ghost" style={{ marginLeft: 'auto' }} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open &&
        (history.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
            No graded answers yet. As you grade each question, every team's responses are logged here.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
            {teams.map((t) => {
              const list = byTeam.get(t.id) || [];
              const correctCount = list.filter((h) => h.correct).length;
              const logged = list.reduce((a, h) => a + (h.points || 0), 0);
              return (
                <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--panel-2)', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 16 }}>{t.name}</b>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {correctCount}/{list.length} correct · {logged} pts logged
                    </span>
                    <span className="pill" style={{ marginLeft: 'auto' }}>score {t.score}</span>
                  </div>
                  {list.length === 0 ? (
                    <div className="muted" style={{ padding: '8px 12px', fontSize: 13 }}>No answers recorded yet.</div>
                  ) : (
                    list.map((h) => (
                      <div
                        key={h.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '70px 1fr 1fr 56px',
                          gap: 8,
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderTop: '1px solid var(--border)',
                          fontSize: 13,
                        }}
                      >
                        <span className="muted" title={h.roundTitle}>R{h.roundIndex + 1}·Q{h.qIndex + 1}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.question}>
                          {h.question || '—'}
                          {h.answer && <span className="muted"> · key: {h.answer}</span>}
                        </span>
                        <span
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: h.correct ? 'var(--good)' : 'var(--text)' }}
                          title={h.response || ''}
                        >
                          {h.correct ? '✓' : '✗'} {h.response || '—'}
                        </span>
                        <span
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: h.points > 0 ? 'var(--good)' : h.points < 0 ? 'var(--bad)' : 'var(--muted)',
                          }}
                        >
                          {h.points > 0 ? `+${h.points}` : h.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </section>
  );
}
