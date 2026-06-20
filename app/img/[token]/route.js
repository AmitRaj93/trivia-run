// Opaque image proxy. Clients only ever receive /img/<token> links; this resolves
// the token to the real image (an external URL or a local file) and streams it, so
// the source URL/filename — which may contain the answer — is never exposed, and an
// answer image can't be fetched until its token is handed out (at reveal).
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { loadQuiz, resolveImageToken } from '../../../lib/content.js';

export const dynamic = 'force-dynamic';

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

export async function GET(_req, { params }) {
  loadQuiz(); // ensure the token map is populated (idempotent / cached)
  const url = resolveImageToken(params.token);
  if (!url) return new Response('Not found', { status: 404 });

  try {
    if (/^https?:\/\//i.test(url)) {
      // Mimic a browser so hotlink-protected hosts don't reject the fetch.
      const upstream = await fetch(url, {
        redirect: 'follow',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          accept: 'image/avif,image/webp,image/png,image/jpeg,*/*',
        },
      });
      if (!upstream.ok) return new Response(`Upstream ${upstream.status}`, { status: 502 });
      const buf = Buffer.from(await upstream.arrayBuffer());
      return new Response(buf, {
        headers: {
          'content-type': upstream.headers.get('content-type') || 'image/jpeg',
          'cache-control': 'public, max-age=86400',
        },
      });
    }
    // Local path (e.g. /media/r4/q1.jpg): served from content/public/ (kept out of
    // the statically-served tree so the files — including answer images — are only
    // reachable through this opaque, reveal-gated proxy). Falls back to public/.
    const rel = url.replace(/^\/+/, '').replace(/\.\.+/g, '');
    let file;
    try {
      file = await readFile(join(process.cwd(), 'content', 'public', rel));
    } catch {
      file = await readFile(join(process.cwd(), 'public', rel));
    }
    return new Response(file, {
      headers: {
        'content-type': TYPES[extname(url).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Image error', { status: 502 });
  }
}
