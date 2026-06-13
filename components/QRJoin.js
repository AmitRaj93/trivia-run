'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a scannable QR for the player join link, built from whatever address
// the browser is actually using (so on the LAN it encodes http://<your-ip>:3000/
// play?room=CODE automatically). Generated locally — no internet needed.
export default function QRJoin({ roomCode, size = 200, showUrl = true }) {
  const [src, setSrc] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!roomCode) return;
    const u = `${window.location.origin}/play?room=${roomCode}`;
    setUrl(u);
    QRCode.toDataURL(u, {
      width: size * 2, // render at 2× for crisp scaling on big screens
      margin: 1,
      color: { dark: '#0b1020', light: '#ffffff' },
    })
      .then(setSrc)
      .catch(() => {});
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
