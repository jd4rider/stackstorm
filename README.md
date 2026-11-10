# Stackstorm

A neon, portrait-first **falling-block puzzle game** for Little Joy Arcade.
Stack tetraminos, slide them into place after they land, and break the storm.

Play: <https://jd4rider.github.io/stackstorm/play/>

Built with **Phaser 3.90**, **TypeScript (strict)** and **Vite**. All art is drawn
at runtime with Phaser Graphics; all audio is synthesised with the Web Audio API.
There are no third-party assets, no network calls in play, and no account
requirement.

---

## The slide window

The piece a player asked for: a real moment to adjust a tetramino **after** it
touches the stack. A piece does not lock on contact. It rests for 500 ms while
its outline pulses and a slim bar drains at the top of the board. Each successful
left/right move or rotation restarts the timer, up to 15 resets. The engine
implements this as a bounded lock-delay reset, separate from gravity, so the
window never depends on frame rate. Shift and hard drop still lock immediately.

## Modes

| Mode | Rules |
| --- | --- |
| **Classic Marathon** | Endless 10×20 play. Level rises every ten lines; gravity speeds up on a fixed table. |
| **Storm Mode** | Clears charge a meter. At 100 the player may activate a 12-second **Storm Surge** worth double points. |
| **Sprint** | Clear 40 lines as fast as possible at a fixed speed. Best time is saved. |
| **Time Attack** | Two minutes, maximum score. The clock pauses with the game. |
| **Puzzle Journey** | 500 finite levels across ten worlds. Fixed piece sequence, static stone board, target line count. |

## Scoring

| Clear | Points × level |
| --- | --- |
| Single | 100 |
| Double | 300 |
| Triple | 500 |
| Four lines | 800 |
| T-spin single / double / triple | 800 / 1200 / 1600 |

Consecutive clears add `50 × (combo − 1) × level`; back-to-back four-line clears
and T-spins pay 1.5×; a completely empty board pays a perfect-clear bonus.
Soft drop is 1 point per cell, hard drop 2 per cell. Every rule lives in
`src/engine/scoring.ts` so the HUD, tests and modes cannot drift apart.

## Engine

`src/engine/` is plain TypeScript with no Phaser import:

- `pieces.ts` — all four rotation states of all seven tetraminos, plus the SRS
  wall-kick tables in screen coordinates.
- `board.ts` — collision, hard-drop distance, row cleaning and board slicing.
- `rng.ts` — seeded Mulberry32 and the seven-bag randomizer.
- `engine.ts` — gravity, DAS/ARR, lock delay with bounded resets, hold, ghost
  support, T-spin detection, combos, back-to-back, storm meter, timers and
  mode goals. Inputs are methods; outputs are a typed event queue.
- `scoring.ts` — the single scoring and gravity table.

The renderer only reads engine state. Line-clear effects never mutate the grid;
the engine removes rows after its own clear timer.

## Puzzle validation

The 500 Journey levels are **constructed from a working solution** and then
**replayed through the shipped engine**.

`scripts/generate-levels.ts` fills one to three four-row stone bands, carves one
or two wells to the top, places a few decoy pieces on the solid shoulders, and
records the exact placement of every piece. The generator then replays the stored
solution through `StackstormEngine`; a level that does not finish with the
objective met is discarded and retried with fewer decoys. The fallback is a
single band and a single I piece, which is always solvable.

`tests/puzzles.test.ts` independently replays all 500 stored solutions and checks
board dimensions, row completeness, sequence/solution parity, objectives and star
times. `src/puzzles/levels.json` is the committed catalogue; CI does not
regenerate it.

A level starts with no complete row, so there are no free clears. Decoys come
first in the fixed sequence, which is the actual puzzle: spend them without
blocking a well, then drop the I pieces.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | ← → (DAS/ARR) | hold ◀ / ▶ |
| Soft drop | ↓ | hold ▼ |
| Hard drop | Space | ⤓ |
| Rotate CW / CCW | ↑ or X / Z | ↻ / ↺ |
| Hold | C or Shift | HOLD |
| Pause | Esc or P | pause icon |
| Storm Surge | S | SURGE button when ready |

The default touch layout is a two-row pad with large targets and press-and-hold
repeat. An optional gesture mode uses a tap to rotate, a horizontal swipe to
move, a downward swipe to soft drop, a fast downward flick to hard drop, and a
two-finger tap to hold.

## Presentation

- Eight data-driven themes with their own block palettes, backgrounds and UI
  accents, unlocked by Journey stars.
- Animated menu background, true journey map with serpentine paths and level
  nodes, animated results screen, pause overlay and tutorial.
- Particle bursts, energy trails, impact flashes, line sweeps, a four-line
  lightning strike, combo callouts, storm surges and a shaking camera.
- Three quality levels, reduced motion and no screen shake reduce particle
  counts and disable flashes; the game logic is untouched.
- Blocks carry a per-piece symbol as well as a colour, so shape and symbol
  identify a piece even without colour.

## Saves

`stackstorm-save-v1` in `localStorage` (with an in-memory fallback for private
mode). The schema is versioned and every value is clamped and rebuilt on load.
`mergeProgress` is conservative: best scores, fastest sprint, furthest unlock,
union of achievements. Journey stars and times only improve.

When the page is inside Little Joy Arcade, `public/arcade-client.js` mirrors the
same Web Storage payload into the player's `game_progress` row. The game never
needs an account and never blocks play on the network. Achievements are stored in
the save payload; the platform client has no separate achievement endpoint, so
the adapter reports state through the save rather than inventing an API.

## Build, test, deploy

```bash
npm install
npm run dev        # local
npm test           # engine, lock delay, bag, puzzle replay, saves
npm run build      # typecheck + production bundle
npm run preview
```

`.github/workflows/pages.yml` runs the test suite and build, then publishes the
bundle and a copy at `/play/` to GitHub Pages. `base: './'` keeps the build
portable.

## Known limitations and decisions

- **500 levels are shipping**, not more. Every one is replay-validated; the
  directive explicitly preferred correctness over an unvalidated count.
- Journey puzzles are well-and-decoy constructions rather than open-ended
  arbitrary boards. This is a deliberate design: the stored solution is a proof,
  and the player's challenge is sequencing decoys around the wells.
- The arcade drop-in client has no leaderboard or achievement endpoint; only
  account sync is used.
- There is no ad surface and no purchase path in this build, so nothing is
  gated behind monetisation.
- Audio is synthesised. There is no voice work.
- Tested in Chromium at desktop and phone sizes; Safari iOS and Android Chrome
  use the same Phaser WebGL/Canvas paths but were not run on physical devices in
  this session.

A Little Joy Arcade original. Made by FreeBuff.
