// Client config: whether the quizmaster console needs a passcode, and the server's
// LAN IP so the join QR can encode a raw-IP URL (mDNS names like trivia.local are
// unreliable on many phones; the IP resolves everywhere). Read at request time so
// toggling env / switching networks doesn't need a rebuild.
import os from 'os';

export const dynamic = 'force-dynamic';

function lanHost() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const ni of addrs || []) {
      if (ni.family === 'IPv4' && !ni.internal) candidates.push({ name, address: ni.address });
    }
  }
  const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  // Prefer en0 (Wi-Fi on a Mac) and private LAN ranges over VPN/other adapters.
  candidates.sort((a, b) => {
    const score = (c) => (c.name === 'en0' ? 2 : 0) + (isPrivate(c.address) ? 1 : 0);
    return score(b) - score(a);
  });
  return candidates[0]?.address || null;
}

export async function GET() {
  return Response.json({ hostPasscodeRequired: !!process.env.HOST_PASSCODE, lanHost: lanHost() });
}
