'use client';

// Browsers block audio playback until the page has had a user interaction. Rather
// than a dedicated "Enable sound" button, we unlock on the FIRST interaction of any
// kind with the TV page (typing the room code, a click, a tap) — so by the time the
// music round runs it's already unlocked and the host's Play just works.
//
// (For a truly zero-touch TV, launch its browser with autoplay allowed, e.g. Chrome
//  with --autoplay-policy=no-user-gesture-required.)

let unlocked = false;
let installed = false;

export const isAudioUnlocked = () => unlocked;

export function installAudioUnlock() {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  const handler = () => {
    if (unlocked) return;
    unlocked = true;
    window.dispatchEvent(new Event('audio-unlocked'));
  };
  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((e) =>
    window.addEventListener(e, handler, { capture: true })
  );
}
