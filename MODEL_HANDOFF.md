# Deployment-model handoff: reproduce this app, do not reinvent it

## 0. Status and authority

Owner: Ahmed. Public source: https://github.com/ahmedgomaaa/redwood-mirror . Branch: `main`.
Original tested gameplay baseline: `bc84bb8c2a96c003fca89cc4297cf3541d27b6ca`.
This handoff revision adds documentation/checks, not changed gameplay. Record the actual checked-out
commit with `git rev-parse HEAD`; never deploy an unspecified future revision.

**This repository contains the actual app, all runtime assets, server, storage, styles, animations
and tests. INSTALL AND RUN IT. Do not regenerate it from this prose.** Existing code is the
executable authority; [GAME_SPEC.md](GAME_SPEC.md) explains its precise behavior. Report
discrepancies, do not silently rebalance or redesign.

**Microsoft/company SSO is a NEW, requested integration, NOT already implemented.** The current
server uses a private host bearer key. The final deployment must recognize the genuine Microsoft
identity for `AHMED.GOMAA@LIQUIDC2.COM` as admin; every other identity is player. Follow
[MICROSOFT_SSO.md](MICROSOFT_SSO.md) for this ONE functional delta. Missing tenant/app/admin
object IDs or private credentials is an SSO blocker, never permission to fake login. Local
private-key rehearsal may continue. Do not report SSO working until real-account tests pass.

## 1. Copy/paste delegation prompt

> Deploy https://github.com/ahmedgomaaa/redwood-mirror, main, at a recorded commit. Read AGENTS.md,
> MODEL_HANDOFF.md, GAME_SPEC.md, MICROSOFT_SSO.md, DEPLOYMENT.md, SECURITY.md and TEST-REPORT.md
> completely. Follow every gate below and report evidence. Verify GAME-FIDELITY.json before edits.
> Install the actual app; do not rebuild with another framework, replace SQLite with memory, redraw
> assets, rebalance, weaken tests or add real AI calls. Integrate genuine Microsoft/company SSO only
> as MICROSOFT_SSO.md specifies: Ahmed's pinned tenant + immutable user object ID is the sole admin;
> everyone else is player. Preserve game mechanics and design. Request missing credentials privately,
> never invent them. Adapt infrastructure and this auth adapter only. Run existing plus new auth tests
> and actual HTTPS/two-account/phone acceptance. Return URLs, revision, operational commands,
> backup/recovery instructions, evidence and unresolved blockers. Never publish secrets or claim
> zero bugs. Stop before paid provisioning or actions not authorized by the owner.

## 2. Gate A — exact source and assets

1. Work in a new directory. Do not overwrite unrelated projects or a running event.
2. Clone as below. GitHub ZIP is acceptable if extracted completely, including dotfiles.
3. Record commit, dirty status and Node version. Do not reset/discard user changes.
4. Read all seven files in section1. ART-PROMPTS.md is provenance, NOT an asset regeneration task.
5. Run `node scripts/verify-fidelity.mjs`. Expected PASS. Missing/modified protected files fail.
   Text files permit LF/CRLF equivalence only; PNGs require exact bytes. No other normalization.
6. Never refresh the baseline to hide mismatches. Obtain the correct revision or ask about intentional
   changes. Later approved auth diffs must be disclosed, not used to silently rebaseline game/art.

```sh
git clone https://github.com/ahmedgomaaa/redwood-mirror.git
cd redwood-mirror
git checkout main
git rev-parse HEAD
git status --short
node --version
node scripts/verify-fidelity.mjs
```

Use patched Node24. Locally tested24.19.0. Native node:sqlite rules out older Node/browser-only
runtimes. Record the final version/container digest. Do not infer a license from a public repo.

## 3. Gate B — inventory infrastructure before editing

Record actual answers for ALL:

| Requirement | Required answer |
| --- | --- |
| Runtime | Long-running Node24 process or supplied Docker recipe |
| Process count | Exactly ONE worker/replica; no cluster/autoscaling |
| Disk | Persistent writable LOCAL filesystem; absolute DATA_DIR |
| HTTPS | External root hostname, certificate and renewal |
| Backend | HOST/PORT, private internal access, proxy destination |
| Streaming | SSE allowed, buffering/cache off, long read timeout |
| Recovery | Health check, restart policy, disk monitoring, backup destination |
| SSO | Genuine Entra tenant/app/admin IDs and private credentials |
| Devices | Two independent browser profiles and real phone |

Static/GitHub Pages, function-only/serverless and ephemeral-only disk are incompatible. Do not
substitute a static imitation, localStorage persistence, NFS/shared SQLite or multiple replicas.
Ask for compatible infrastructure. Do not silently buy services or invent a hosted URL.
Deploy at hostname ROOT, not /games/mirror/; root API/asset paths are required.

## 4. Gate C — install and verify unchanged baseline

Run sequentially from package.json directory:

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm test
npm run test:load
npm run verify:fidelity
npm run check:release
```

Windows: use npm.cmd/npx.cmd if PowerShell policy blocks .ps1. Tests default to installed Edge on
Windows and Playwright Chromium on Linux; BROWSER_CHANNEL=msedge or chrome selects an installed
channel. Do not skip UI tests or weaken assertions. Playwright1.63.0 is test-only, lockfile-pinned.
Baseline runtime has zero npm dependencies. No bundle/build step: start is node server.mjs.
Tests use isolated temporary data and separate ports; never use live DATA_DIR. Inspect test port
settings for conflicts instead of killing an existing4173 preview. Retain command/exit-code evidence.
A timeout or NOT RUN is not PASS. Fix approved actual failures and repeat full suite.

## 5. Gate D — reproduce locally

1. Start `npm start` in a fresh rehearsal copy with private fresh DATA_DIR, bound to localhost.
2. Open /intro and the development private host link in separate profiles. Never share its key.
3. Enrol two one-word nicknames; choose different novel responses; finish and reload. Names/titles persist.
4. Walk EVERY behavior in GAME_SPEC.md, including wrong answers and independent learning.
5. Compare actual included sprites/CSS/bot. Do not draw replacement art or shrink text to hide clipping.
6. Demo bots are labelled and rehearsal-only. Final public deployment must disable them.
7. For LAN-only phone rehearsal, HOST=0.0.0.0 and computer LAN IP, not phone localhost.
   Do not expose development settings publicly.

## 6. Gate E — integrate genuine Microsoft SSO

1. Execute MICROSOFT_SSO.md in order. Obtain missing inputs privately from owner/tenant administrator.
2. Use its server-side library implementation; trusted-platform identity alternative has explicit gates.
3. Scope changes to auth/session/config, minimal login UI, auth schema/module/tests and deployment config.
   Do not convert framework, change rules/map/ticks/novel/CSS/assets or bind nickname to admin.
4. Record every changed file and reason. Run fidelity verification after edits: approved auth-bound
   files may differ, but differences must be reported. Never refresh manifest merely to make it green.
   Assets, story.js, game-rules.js and game layout remain protected. Retain existing tests.
5. Run baseline tests in explicit DEVELOPMENT private-key mode plus new production SSO tests.
   Final SSO production must NOT accept the old bearer key as another admin path.
6. Until credentials AND two real-account tests succeed, completion status is **SSO PENDING**.

## 7. Gate F — persistence and private environment

Read DEPLOYMENT.md for plain Node/Docker. Its private-host-key instructions describe the unchanged
baseline; MICROSOFT_SSO.md explicitly replaces that auth part for the requested final deployment.
Do not set AUTH_MODE against unchanged server and pretend it works: that variable is not read yet.

Baseline production configuration (private-key rehearsal/unchanged release only):

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=<actual internal port>
DATA_DIR=<absolute persistent local mounted directory>
PUBLIC_ORIGIN=https://<actual hostname>
MIRROR_ADMIN_TOKEN=<private random 32-byte secret encoded as hex>
ROOM_CODE=MIRROR
ROUND_SECONDS=180
MAX_PLAYERS=100
REQUIRE_INVITES=true
ALLOW_DEMO_BOTS=false
```

Final SSO: same game/storage/origin settings plus MICROSOFT_SSO.md auth config; remove production
host-key authorization. All credentials go in platform secret storage, never client code/public git.
npm start loads .env; direct node server.mjs only reads process environment. DATA_DIR belongs to
service account, outside public root. Confirm it survives container/process replacement. ONE worker.

Docker baseline: `docker compose config --quiet`, `docker compose up -d --build`.
Don't print expanded config/secrets. Final SSO must update Docker/compose for auth variables and
runtime library. NEVER `docker compose down -v`: it deletes event data. Docker execution requires
a running daemon on deployment host; preparing a Dockerfile is not proof of hosted success.

## 8. Gate G — HTTPS and streaming

1. GET /healthz must return200, ok:true, storage:"ready".
2. Map real HTTPS root to private backend port. PUBLIC_ORIGIN is exact external scheme+host(+port),
   without slash/path/query/fragment. Do not use wildcard CORS to conceal origin errors.
3. Adapt deploy/nginx.conf.example when applicable. /api/events buffering/cache off; long read timeout.
4. Verify actual live SSE updates through proxy for >15s, including heartbeat15s and reconnection.
5. Docker health: interval30s, timeout5s, startup grace10s, retries3. Infrastructure may adapt these;
   do NOT change game clocks to satisfy platform probes.
6. Check all scripts/assets same-origin, no font/CDN dependency. A working landing page is insufficient.

## 9. Gate H — hosted acceptance: every row required

Use actual HTTPS, two separate profiles and one real phone on attendee network. Record device/browser,
viewport and evidence. Tabs sharing storage are not independent players.

| Check | Pass condition |
| --- | --- |
| Storage | Health ready; mounted data survives restart |
| Art | Manifest matches; original VN room/characters present; bot unclipped |
| SSO admin | Ahmed's pinned identity admin; different real account only player |
| Admin protection | Anonymous/player/email/header forgery and old host key denied in SSO mode |
| Admission | Missing/used pass denied; two passes produce independent identities |
| Identity | Permanent nickname/title across reload/restart, no rename/reroll |
| Novel | Five scenes/three decisions; majority/latest-tie title; zero score impact |
| Independent learning | Different parameters produce separate progress/risk/dots |
| Host | Only host advances/starts/pauses; clock0 waits, no automatic next |
| Clock | Pace1 ~1game-second/wall-second; pause freezes simulation |
| Defense | Speed10 player stopped at new level before automatic penalty; clear bot evolution |
| Quiz | Wrong−5pts/up to−3pp; under2s retry denied; correct reward not replayable |
| Tune | Correct unlocks highlighted slider; must choose+confirm; no automatic stealing |
| Resume | Separate manual resume after confirmation; combined bypass denied |
| Suspicion | 70→−5pp once;100→−12pp+freeze; risk reduction rearms warning only below40 |
| Feedback | Slider input immediately updates copy rate and risk feedback |
| Phone | Controls/Race tabs, persistent progress/risk/rate/steal HUD |
| Desktop | Bot face/antenna visible; roomy control text readable |
| Motion | Toggle/reduced-motion stop motion, not critical state labels |
| Results | Progress then points ranking; simulated unseen tests |
| Reconnect | One client offline does not break others; original identity recovers |
| Restart | Running becomes paused; extraction off; names/titles/scores/passes preserved |
| Security | Foreign-origin writes denied, framing blocked, private files404, secure cookies |
| Backup | Consistent backup restored in separate rehearsal directory |
| Privacy | No credentials/provider tokens/private URLs in public logs/report |

Run all nine automated viewport sizes in GAME_SPEC.md, including quiz, unconfirmed slider,
all-four-sliders, Race and results. Inspect browser console/network errors. Hosted proxy/SSO and
real phones add acceptance beyond automated tests.100 streams do not guarantee100 real phones
on unknown Wi-Fi. Accessible zoom/text enlargement takes priority over forced unreadable shrinking.

## 10. Gate I — host rehearsal, roughly15–20minutes

This is a host runbook, NOT extra automation. Preserve manual levels, pause protection and balance.

1. Prepare intended fresh event, generate one unused pass/person in lobby. Share /intro and private
   individual pass. Project /display. Never share host credential.
2. ~2minutes intro: reserve nickname, five scenes/three decisions. Explain questions→saved answers→
   training smaller AI; not stolen model files. Title only cosmetic and permanent.
3. Level1 duration180/pace1/detection1/moodauto. HostStart, playersReady/Start stealing. Compare rates.
4. Timer0 hostNext: level2 paused, every real player disarmed. Explain rate cap; quiz→spacing value→
   Confirm→separate Resume. Host starts round when ready.
5. Run level2 for180game-seconds; encourage risk awareness, not blindly highest speed.
6. Next level3 paused, quiz→variety→Confirm→Resume. Run180game-seconds.
7. Next level4 paused, quiz→verification→Confirm→Resume. Run180game-seconds.
8. Finish/Next at last level banks results; compare simulated unseen tests, ~1minute debrief.
9. Four rounds=12minutes active at pace1; intro/transitions/debrief normally total15–20. Host pauses
   and pace alter wall time. This is not guaranteed fixed completion time.

Duration normalizes learning/risk as well as clock. Shortening rounds is not just a shorter timer.
Disclose deliberate host boosts/setbacks. Don't add auto-next or penalties while a player answers.

## 11. Gate J — updates, recovery and release

1. Pause before updating; `npm run backup` with actual private DATA_DIR/env. Restricted destination,
   not public repo. Keep previous code revision for rollback.
2. Rehearse graceful restart. SIGTERM/SIGINT releases writer lease; abrupt crash may need30s.
   Never delete database/lease just to accelerate startup. Never auto-create new event on restart.
3. Restore in separate rehearsal directory: stop app, preserve current data, put consistent backup
   at DATA_DIR/game.sqlite in clean directory, restore ownership, wait lease, start same config/code.
4. Do not copy only a live SQLite main file; WAL may hold committed data. Never overwrite only backup.
   Older backup means older scores/passes. Live rollback needs host direction.
5. Disk/storage failures fail closed; repair/restore before restarting. No memory fallback/unsaved scores.
6. Re-run full tests/load/release scan. `npm run package:release` makes ignored release/ source
   directory plus release-manifest.json; not an event backup.
7. Upload ONLY game project. Exclude .env, data/, databases/WAL/SHM, backups/, logs, session/provider
   tokens, private URLs and neighboring PowerPoints. Never embed a previously pasted GitHub token.

## 12. Required completion record

```text
Repository:
Checked-out commit:
Deployed commit / approved auth diff:
Baseline fidelity result/date/count:
Protected files changed + individual reasons:
Node version / container digest:
Hosting service / exactly ONE replica proof:
Player URLs (/intro, /player):
Display URL (/display):
Admin route (/admin; no secret):
SSO status: PENDING or VERIFIED:
Pinned Microsoft tenant/admin verified privately: yes/no:
Second real-account player-only test: yes/no:
DATA_DIR mount / persistence proof:
Install/start/stop/restart commands:
HTTPS/SSE/health settings:
Tests: commands, exit codes, date, runtime/browser:
Gate H: EACH row PASS/FAIL/NOT RUN + evidence:
Rehearsal: actual duration/devices/network:
Backup/restore proof and restricted location:
Failures/limitations/missing inputs:
Owner steps before live event:
```

Never imply "SSO implemented", "all devices tested", "no bugs" or "cheat-proof" without evidence.
Even passing tests do not prevent collusion, automation, public-source answer lookup or stolen
browser credentials. See SECURITY.md for limitations.
