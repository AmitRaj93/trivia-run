'use client';

import { useEffect, useRef, useState } from 'react';
import MatchEntry from '../MatchEntry.js';
import { isAudioUnlocked } from '../../lib/audioUnlock.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NUMBERS = ['1', '2', '3', '4', '5', '6'];

// Every Match image sits in this exact same fixed canvas (object-fit:contain in
// MatchEntry pads to it), so all cells look identical regardless of aspect ratio.
const TV_MATCH_CANVAS = { width: '18vw', height: '16vh' };

// One side of a Match question as a 3×2 grid (2 across, 3 down) — fewer columns
// means bigger cells.
function TvMatchGrid({ items = [], labels, answerKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8vh 1.2vw', justifyItems: 'center' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {/* On reveal the matched letter is appended to the heading (e.g. "1 → C"),
              like the host console — instead of a separate line below the image. */}
          <div style={{ fontSize: '1.4vw', fontWeight: 800, color: 'var(--accent)' }}>
            {labels[i]}
            {answerKey && <span style={{ color: 'var(--good)' }}> → {answerKey[String(i + 1)]}</span>}
          </div>
          <MatchEntry
            value={it}
            imgStyle={{ ...TV_MATCH_CANVAS }}
            textStyle={{ width: TV_MATCH_CANVAS.width, fontSize: '1.4vw', fontWeight: 700, textAlign: 'center' }}
          />
        </div>
      ))}
    </div>
  );
}

// What the big screen shows during a round. Switches on round.kind.
export default function TvRound({ state }) {
  const round = state?.round;
  if (!round) return null;
  const teams = state?.teams ?? [];
  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? '';

  const roundTitle = state?.rounds?.[state?.roundIndex]?.title ?? '';

  // Image slot. The question image (e.g. the baby photo) shows throughout. On
  // reveal, if there's also an answer image, the two are shown SIDE BY SIDE
  // (question on the left, answer on the right) rather than swapping one for the
  // other — so the room can compare "then vs. now". If a question has only an
  // answer image (no question image), the reveal just shows that one.
  const questionImage = isImage(round.media) ? round.media : null;
  const answerImageSrc = round.revealed && round.answerImage ? round.answerImage : null;
  const sideBySide = !!(questionImage && answerImageSrc);
  const soloImage = sideBySide ? null : answerImageSrc || questionImage;
  const hasImage = sideBySide || !!soloImage;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1200,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.4vh',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="pill" style={{ fontSize: '1.2vw', flexShrink: 0 }}>{roundTitle}</div>

      {round.kind === 'quads' && (
        <div className="muted" style={{ fontSize: '1.6vw', flexShrink: 0 }}>
          Set {round.setIndex + 1} of {round.setCount} · Question {round.qIndex + 1} of {round.count}
        </div>
      )}

      {sideBySide ? (
        <div
          style={{
            flex: '1 1 auto',
            minHeight: '36vh',
            width: '100%',
            display: 'flex',
            gap: '2vw',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RevealImage src={questionImage} caption="Then" />
          <RevealImage src={answerImageSrc} caption="Now" />
        </div>
      ) : (
        soloImage && <FitImage key={soloImage} src={soloImage} minVh={36} />
      )}

      {round.prompt && (
        <div
          style={{
            // Emoji prompts render extra-large (they're the whole puzzle). Otherwise,
            // when there's an image the image takes ~half the screen, so the text
            // shrinks to fit the rest.
            fontSize: round.kind === 'emoji' ? '7vw' : hasImage ? '1.5vw' : '2.6vw',
            fontWeight: 800,
            maxWidth: '92%',
            lineHeight: 1.12,
            flexShrink: 0,
          }}
        >
          {round.prompt}
        </div>
      )}

      {round.kind === 'quads' && (
        <div
          style={{
            flexShrink: 0,
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: '1.8vw',
            fontWeight: 700,
            background: round.status === 'passing' ? 'var(--warn)' : 'var(--panel-2)',
            color: round.status === 'passing' ? '#0b1020' : 'var(--accent)',
            border: '1px solid var(--border)',
          }}
        >
          {round.status === 'passing'
            ? `↪ PASS to ${nameOf(round.passTeamId)} (${round.passNumber}/${round.passTotal})`
            : `Direct: ${nameOf(round.directTeamId)}`}
        </div>
      )}

      {round.kind === 'match' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '2.5vw', flexShrink: 1, minHeight: 0 }}>
          <TvMatchGrid items={round.left} labels={NUMBERS} answerKey={round.revealed ? round.answerKey : null} />
          <div style={{ alignSelf: 'stretch', width: 2, background: 'var(--border)' }} />
          <TvMatchGrid items={round.right} labels={LETTERS} />
        </div>
      )}

      {round.kind === 'music' && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vh' }}>
          {round.audio && <TvAudio src={round.audio} playing={round.playing} restartAt={round.restartAt} />}
          <MusicViz playing={round.playing} />
          <div className="muted" style={{ fontSize: '1.4vw' }}>
            {round.playing ? '♪ Now playing…' : 'Listen up!'}
          </div>
          {round.winnerId ? (
            <div style={{ fontSize: '4vw', fontWeight: 900, color: 'var(--accent)' }}>🚨 {nameOf(round.winnerId)}!</div>
          ) : round.armed ? (
            <div style={{ fontSize: '3vw', fontWeight: 900, color: 'var(--good)' }}>● BUZZERS LIVE — press now!</div>
          ) : (
            <div className="muted" style={{ fontSize: '1.8vw' }}>Get ready to buzz…</div>
          )}
          {round.lockedOut?.length > 0 && (
            <div className="muted" style={{ fontSize: '1.2vw' }}>
              out: {round.lockedOut.map(nameOf).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      )}

      {['match', 'jetsetters', 'invisibles', 'emoji'].includes(round.kind) && (
        <div style={{ flexShrink: 0 }}>
          <span
            className="pill"
            style={{ fontSize: '1.4vw', background: round.open ? 'var(--good)' : 'var(--panel-2)', color: round.open ? '#0b1020' : 'var(--muted)' }}
          >
            {round.open ? '● ANSWERS OPEN' : 'answers closed'} · {(round.submittedTeamIds || []).length}/{teams.length} in
          </span>
        </div>
      )}

      {round.bonus && (
        <div style={{ flexShrink: 0, fontSize: '1.5vw' }}>
          <span className="pill" style={{ fontSize: '1.2vw', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            ⭐ Bonus +{round.bonus.points}
          </span>{' '}
          {round.bonus.q}
          {round.revealed && round.bonus.answer && (
            <span> — <b style={{ color: 'var(--good)' }}>{round.bonus.answer}</b></span>
          )}
        </div>
      )}

      {/* When a question shows an image, the answer slot is reserved at a fixed
          height even before reveal. That keeps the image the exact same size and
          position pre- and post-reveal (e.g. Invisibles, where the answer image is
          meant to overlap the question image), instead of the answer text shrinking
          and re-centering it on reveal. */}
      {hasImage ? (
        <div
          style={{
            flexShrink: 0,
            minHeight: '6vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6vw',
          }}
        >
          {round.revealed && round.answer && (
            <span>
              <span className="muted">Answer: </span>
              <b style={{ color: 'var(--good)' }}>{round.answer}</b>
            </span>
          )}
        </div>
      ) : (
        round.revealed && round.answer && (
          <div style={{ fontSize: '2.2vw', flexShrink: 0 }}>
            <span className="muted">Answer: </span>
            <b style={{ color: 'var(--good)' }}>{round.answer}</b>
          </div>
        )
      )}
    </div>
  );
}

// An image that fills the leftover vertical space of the flex column while keeping
// its aspect ratio (object-fit: contain). flex:1 1 0 + min-height:0 lets it shrink
// so it never pushes the prompt/answer text off-screen or clips past the edges.
// minVh keeps the image at least that tall (≈ half the screen for question images),
// so a long prompt can't squeeze it to a thumbnail. flex:1 still lets it grow into
// any spare space; object-fit:contain preserves aspect ratio.
function FitImage({ src, minVh = 0 }) {
  return (
    <div
      style={{
        flex: '1 1 auto',
        minHeight: minVh ? `${minVh}vh` : 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt=""
        style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain', borderRadius: 14, boxShadow: 'var(--shadow)' }}
      />
    </div>
  );
}

// One half of the side-by-side reveal: an aspect-preserving image with a small
// caption above it ("Then" / "Now"). Each takes an equal share of the row and may
// shrink (min-width: 0) so two portrait photos sit comfortably next to each other.
function RevealImage({ src, caption }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1vh' }}>
      {caption && (
        <div className="pill" style={{ fontSize: '1.1vw', flexShrink: 0 }}>{caption}</div>
      )}
      {/* Caption stays pinned at the top (both columns align), image fills the rest. */}
      <div style={{ flex: '1 1 0', minHeight: 0, width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <img
          src={src}
          alt=""
          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 14, boxShadow: 'var(--shadow)' }}
        />
      </div>
    </div>
  );
}

// The TV is where the music actually plays (so it comes out of the room's speakers).
// The host controls it remotely via the `playing` flag and `restartAt`. Browsers
// block autoplay, so the operator clicks "Enable sound" once to unlock playback.
function TvAudio({ src, playing, restartAt }) {
  const ref = useRef(null);
  const [unlocked, setUnlocked] = useState(isAudioUnlocked());
  const [needTap, setNeedTap] = useState(false);

  // Audio is unlocked by the first interaction anywhere on the TV (see lib/audioUnlock).
  useEffect(() => {
    if (unlocked) return;
    const onUnlock = () => setUnlocked(true);
    window.addEventListener('audio-unlocked', onUnlock);
    return () => window.removeEventListener('audio-unlocked', onUnlock);
  }, [unlocked]);

  // Load a new clip when the question changes.
  useEffect(() => {
    const a = ref.current;
    if (a && src && a.getAttribute('src') !== src) {
      a.setAttribute('src', src);
      a.load();
    }
  }, [src]);

  // Follow the host's play/pause (restart from 0 if the clip had finished).
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    if (playing) {
      if (!unlocked) {
        setNeedTap(true); // never interacted with the TV yet — prompt one tap
        return;
      }
      if (a.ended) a.currentTime = 0;
      a.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
    } else {
      a.pause();
    }
  }, [playing, unlocked, src]);

  // Restart command -> seek to 0 and play.
  useEffect(() => {
    const a = ref.current;
    if (!a || !unlocked || !restartAt) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }, [restartAt]);

  // Fallback only shown if the host presses Play before the TV has been touched.
  const tapStart = () => {
    setUnlocked(true);
    setNeedTap(false);
    const a = ref.current;
    if (a) {
      if (a.ended) a.currentTime = 0;
      a.play().catch(() => {});
    }
  };

  return (
    <>
      <audio ref={ref} preload="auto" />
      {needTap && (
        <button className="primary" style={{ fontSize: '1.5vw', padding: '1vh 2.5vw' }} onClick={tapStart}>
          👆 Tap to start the sound
        </button>
      )}
    </>
  );
}

// Animated equalizer. Bars bounce while the host's audio is playing (driven by the
// `playing` flag broadcast on play/pause) and freeze, dimmed, when paused.
function MusicViz({ playing }) {
  const bars = 32;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.5vw', height: '26vh', width: '70vw' }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="viz-bar"
          style={{
            flex: 1,
            maxWidth: '1.6vw',
            // staggered durations/delays give an organic, music-reactive look
            animationDuration: `${0.55 + ((i * 7) % 9) * 0.07}s`,
            animationDelay: `${(i % 8) * 0.06}s`,
            animationPlayState: playing ? 'running' : 'paused',
            opacity: playing ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

function isImage(url) {
  return /^https?:|^\/|\.(png|jpe?g|gif|webp|avif)$/i.test(url) && !/\.(mp3|wav|ogg|m4a)$/i.test(url);
}
