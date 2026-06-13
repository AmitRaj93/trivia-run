import Link from 'next/link';

export default function Home() {
  return (
    <main className="center-screen">
      <div className="panel" style={{ padding: 40, maxWidth: 720, width: '100%' }}>
        <div className="pill">Live multi-screen trivia</div>
        <h1 style={{ fontSize: 44, margin: '14px 0 6px' }}>Trivia Run</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          One game, three screens. Open the right surface for your role.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
            marginTop: 28,
          }}
        >
          <SurfaceCard
            href="/host"
            title="Quizmaster"
            desc="Run the quiz, read questions, manage scores."
            emoji="🎙️"
          />
          <SurfaceCard
            href="/tv"
            title="TV Display"
            desc="The big screen everyone watches."
            emoji="📺"
          />
          <SurfaceCard
            href="/play"
            title="Player"
            desc="Join with a room code and answer."
            emoji="📱"
          />
        </div>
      </div>
    </main>
  );
}

function SurfaceCard({ href, title, desc, emoji }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        display: 'block',
      }}
    >
      <div style={{ fontSize: 32 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 20, marginTop: 8 }}>{title}</div>
      <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
        {desc}
      </div>
    </Link>
  );
}
