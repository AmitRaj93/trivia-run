// Crash recovery: snapshot all rooms to disk (debounced) and reload on startup.
// In-memory remains the source of truth during a run; the file just survives a
// process restart so a live event can resume after a crash.
import { writeFile, rename, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data');
const FILE = join(DIR, 'state.json');
const TMP = `${FILE}.tmp`;
const DEBOUNCE_MS = 400;

let pending = null; // latest snapshot getter
let handle = null;

// Schedule a save. `getSnapshot` returns the full serializable state; we only
// keep the most recent one so a burst of changes collapses into one write.
export function scheduleSave(getSnapshot) {
  pending = getSnapshot;
  if (handle) return;
  handle = setTimeout(flush, DEBOUNCE_MS);
}

async function flush() {
  handle = null;
  const getSnapshot = pending;
  pending = null;
  if (!getSnapshot) return;
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(TMP, JSON.stringify(getSnapshot()));
    await rename(TMP, FILE); // atomic replace, never a half-written state.json
  } catch (e) {
    console.error('persistence: save failed', e);
  }
}

export async function loadState() {
  try {
    if (!existsSync(FILE)) return null;
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch (e) {
    console.error('persistence: load failed', e);
    return null;
  }
}
