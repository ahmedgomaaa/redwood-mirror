# Redwood Mirror — Operation Mirror

A host-led, multiplayer browser game about simulated model distillation. Players join the
fictional Redwood C2 team, earn an immutable title through an anime visual novel, and race
to build separate copies of the fictional JobS model. No real AI, real extraction or API keys.

## Start locally

Install **Node.js 24 LTS**, then run from this repository root:

```sh
npm ci --ignore-scripts
npm start
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
The local server prints your private host URL. Never share its fragment/key with players.

- Player novel: http://localhost:4173/intro
- Player dashboard: http://localhost:4173/player
- Projector: http://localhost:4173/display
- Health: http://localhost:4173/healthz

Local development binds to localhost. Phones cannot reach that address on your computer.
For an isolated LAN rehearsal, set `HOST=0.0.0.0` and use your computer's LAN IP on every phone.
Use production HTTPS settings for an Internet event; do not expose the development mode publicly.

## Host flow

1. Open the private host link. In production, use your configured HTTPS origin plus
   `/admin#YOUR_PRIVATE_SECRET`; the production server deliberately does not log it.
2. Set each round's length, pace, and detector strength. Apply before starting the round.
3. In production, generate one-use player passes and distribute one per person privately.
   Each pass grants one enrolment. Existing sessions resume the same identity instead of renaming.
4. Players visit `/intro`, enter their name/pass, then complete three personality decisions.
   Their name is reserved immediately; their earned title locks at the final scene.
5. Alternatively, enrol at `/player` and play a shared intro using the host's opening controls.
   Only the host advances shared scenes. Each player makes their own decisions.
6. Start level one, then advance manually. The clock reaching zero does not auto-advance.
7. New defenses stop each player's extraction. They answer the control question, adjust their
   new slider, explicitly confirm its setting, then press Resume stealing. Wrong answers cost 5 challenge points and up to 3% copy progress.
8. Final results rank copy progress, then challenge points. Unseen tests are explicitly simulated.

Four levels: open access → request cap → repetition check → data integrity (misleading answers).
Defaults: four 180-second rounds, plus the novel and control decisions, for roughly 15–20 minutes.
This is host-paced, not a fixed guaranteed completion time. New levels animate JobS's evolution.

Suspicion at 70% erases 5 progress points; at 100%, 12 more and a five-second freeze.
Sliders show immediate estimated copy speed and suspicion trend. All scoring is server-authoritative.
Progress dots are shared; each player learns independently. The novel affects only the permanent
title: Mastermind, Watchkeeper, Vigilante Hacker, Unethical Hacker, or Conscientious Hacker.
Most frequent stance wins, with the latest choice resolving a tie. No choices means Operative.

## Saved state and recovery

SQLite stores the event, identities, titles, progress, used passes and a security audit trail under
`DATA_DIR` (default `data/`). Successful mutations are committed before their response. Changes
are broadcast with a short coalescing delay to avoid bursts of unnecessary full-room updates.
Use **exactly one application replica** with a persistent local disk/volume. Do not share this
database across replicas or network filesystems. A storage lease prevents a second writer.
After an unclean crash, a new process may need to wait up to 30 seconds for that lease to expire.

A live event restarts paused, with individual extraction stopped. No catch-up penalties are applied
for offline time. The host and players explicitly resume. The **Reset event & scores** control
preserves existing identities/titles. **Open a completely new event** requires `NEW EVENT` confirmation
and invalidates old player sessions. It does not make old players' browser session keys valid again.

Session recovery is tied to the original browser profile. One-use passes are admission control, not
proof of a human's identity. Losing or clearing browser storage may require host assistance.

## Desktop and phone UI

The dashboard fits the viewport at normal zoom. Phones use Controls / Race tabs, with copied progress,
suspicion, copy rate and extraction controls always visible. The first-entry walkthrough highlights
important areas, can be skipped, and can be replayed. Leaderboards and long feedback have bounded
internal scrolling; the dashboard itself does not require page scrolling. Very small landscape
screens, OS text enlargement and assistive zoom can require more space; accessibility takes priority
over forcing unreadably small text. Novel and host pages may scroll where needed.

## Configuration

Copy `.env.example` to `.env` for plain-Node use. `npm start` loads `.env`; direct `node server.mjs`
uses the process environment only. Never commit `.env`, private URLs, database files or backups.

| Variable | Purpose / default |
| --- | --- |
| NODE_ENV | development locally; production for Internet hosting |
| HOST / PORT | 127.0.0.1 / 4173; containers use 0.0.0.0 |
| PUBLIC_ORIGIN | Required HTTPS origin in production; no trailing slash/path |
| MIRROR_ADMIN_TOKEN | Required in production, at least 32 characters; generate random bytes |
| DATA_DIR | Writable persistent directory, default ./data |
| ROOM_CODE | 3–12 uppercase letters/digits; MIRROR |
| ROUND_SECONDS | Default 180; integer 15–600 |
| MAX_PLAYERS | Default/cap 100; configure lower if needed |
| REQUIRE_INVITES | Defaults true in production, false locally |
| ALLOW_DEMO_BOTS | Set false in production; demo bots are visibly labelled |

## Tests

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm test
npm run test:load
npm run check:release
```

Windows tests use installed Edge by default; Linux tests use Playwright Chromium.
Set `BROWSER_CHANNEL=chrome` or `msedge` if that installed channel is needed. Runtime has zero npm
dependencies; Playwright is test-only. Tests use isolated temporary databases, never live event data.
The load test exercises 100 concurrent live streams, not 100 real phones on a production network.

## Deployment and handoff

Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment choices and operational checks.
Give the other model [MODEL_HANDOFF.md](MODEL_HANDOFF.md) and require it to follow the numbered
instructions without rewriting the app. [SECURITY.md](SECURITY.md) states protections and limitations.
See [TEST-REPORT.md](TEST-REPORT.md) for the actual verified checks and remaining deployment gates.

GitHub Pages is not suitable: this app requires a long-running Node server, SSE and a writable disk.
This project is prepared for public source upload, but does not automatically create or push a repo.
There is no license grant inferred from publishing: obtain the owner's chosen license before adding one.
Original generated anime artwork and its generation prompts are documented in [ART-PROMPTS.md](ART-PROMPTS.md).
