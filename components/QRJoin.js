'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a scannable QR for the player join link. It encodes the server's raw
// LAN IP (fetched from /api/config) rather than the page's own address, because
// mDNS names like trivia.local — and localhost — don't resolve on many phones,
// whereas the IP does. Falls back to the current origin if the IP isn't known.
// Generated locally — no internet needed.
export default function QRJoin({ roomCode, size = 200, showUrl = true }) {
  const [src, setSrc] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;

    (async () => {
      let origin = window.location.origin;
      try {
        const cfg = await fetch('/api/config').then((r) => r.json());
        if (cfg.lanHost) {
          const port = window.location.port ? `:${window.location.port}` : '';
          origin = `http://${cfg.lanHost}${port}`;
        }
      } catch {}
      if (cancelled) return;

      const u = `${origin}/play?room=${roomCode}`;
      setUrl(u);
      const dataUrl = await QRCode.toDataURL(u, {
        width: size * 2, // render at 2× for crisp scaling on big screens
        margin: 1,
        color: { dark: '#0b1020', light: '#ffffff' },
      }).catch(() => '');
      if (!cancelled && dataUrl) setSrc(dataUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode, size]);

  if (!src) return null;
  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={src}
        width={size}
        height={size}
        alt="Scan to join"
        style={{ borderRadius: 12, background: '#fff', padding: 8, display: 'block', margin: '0 auto' }}
      />
      {showUrl && (
        <div className="muted" style={{ marginTop: 8, fontSize: 13, wordBreak: 'break-all' }}>{url}</div>
      )}
    </div>
  );
}
