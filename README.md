# Trivia Run

Real-time, multi-screen trivia game for a live in-person event. One Node server
drives three surfaces that stay in sync over WebSockets:

| Surface         | Route   | Who uses it                                  |
| --------------- | ------- | -------------------------------------------- |
| Quizmaster      | `/host` | Runs the quiz, reads questions, sets scores  |
| TV display      | `/tv`   | The big screen everyone watches              |
| Player          | `/play` | Each player's phone — joins with a room code |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Open `/host` on the quizmaster laptop and click **Start new game** to get a
4-letter room code. Open `/tv` on the big screen and enter that code (or use
`/tv?room=ABCD`). Players open `/play` on their phones and join with the code.

Set `PORT` to change the port: `PORT=4000 npm run dev`.

## Architecture

- **`server.js`** — Next.js HTTP handler + a `ws` WebSocket server on `/ws`.
- **`lib/game.js`** — authoritative in-memory game state, one `Game` per room.
  State is broadcast as full snapshots on every change.
- **`lib/protocol.js`** — shared message/role/action/phase constants.
- **`lib/useGameSocket.js`** — client hook: holds the latest snapshot, exposes
  typed senders, auto-reconnects and rejoins.
- **`app/{host,tv,play}/`** — the three surfaces.

## Teams & admission

Exactly **4 teams**. One **representative** per team joins from a phone (the
answerer / buzzer); everyone else can join in **view-only** mode. The quizmaster
**approves or rejects** every join request, so nobody can spam fake teams. An
approved rep stores a token and auto-rejoins their slot if their phone drops.

## Rounds

All five rounds are implemented. Scoring lives in `content/quiz.json` →
`scoring` and is editable; the console can also adjust any score by hand.

| # | Round | How it runs | Default points |
| - | ----- | ----------- | -------------- |
| 1 | **Quads** | 3 sets × 12 questions. Each set rotates a *direct* to every team 3×. Answered aloud; quizmaster marks correct / wrong → *pass*. | direct 10, pass 5 |
| 2 | **Match the Following** | 6 numbered items ↔ 6 lettered options. Reps submit a number→letter map; **auto-graded** per pair. | 5 / pair |
| 3 | **Jet Setters** | 8 questions; every team types an answer. Host opens/closes, then marks each. | 10 |
| 4 | **Invisibles** | Image on the TV; teams type what they see. Host marks each. | 10 |
| 5 | **Music** | Buzzer round with **lockout** — first rep to buzz wins, others blocked. Wrong answer locks that team out; host re-arms for the rest. | 10 |

Reps never receive answer keys (or other teams' submissions) until the host
presses **Reveal** — the server serialises a different snapshot per role.

## Authoring the quiz

Edit `content/quiz.json` (schema documented at the top of `lib/content.js`).
Put images and audio under `public/media/…` and reference them as `/media/…`
(the sample uses remote placeholder images and `/media/music/*.mp3` paths — drop
your real clips in `public/media/music/`). Restart the server after editing.

## Running a live event

1. Quizmaster opens `/host`, clicks **Start new game**, notes the room code.
2. Put `/tv?room=CODE` on the big screen.
3. Each team rep opens `/play`, enters a team name + the code, taps **Request to
   join**; the quizmaster approves them.
4. Use the console to start the quiz, move between rounds/questions, open/close
   answers, arm the buzzer, reveal, and grade.

## Local testing with several teams

Each team is one device. The rep token is kept in **sessionStorage** (per-tab), so
to play multiple teams on one computer, open `/play` in a **separate tab or window**
per team (a normal tab and an incognito/private window also work). Same-tab reloads
keep you in your team; a fresh tab is a fresh team.

## Timer

The console has a countdown (preset 30/45/60/90s or a custom value). Start it and
it shows in sync on the console, the TV, and every player's phone. When it hits
zero the server **auto-closes answers** for submission rounds; the host can also
**Stop** it early (which cancels the countdown without closing answers). Changing
question or round clears a running timer.

## Architecture

- **`server.js`** — Next.js handler + `ws` server on `/ws`; admission + role-aware broadcast.
- **`lib/game.js`** — authoritative in-memory state, one `Game` per room.
- **`lib/rounds/*`** — one module per round type (`init` / `count` / `onSeek` / `hostAction` / `answer` / `publicState`), registered in `lib/rounds/index.js`.
- **`lib/content.js`** — loads/validates `content/quiz.json`.
- **`components/{host,tv,play}/`** — per-surface round UIs.
