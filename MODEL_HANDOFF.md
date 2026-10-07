# Exact handoff for the deployment model

You are deploying the existing Redwood Mirror app, not designing a replacement. Follow these steps
in order. Report the actual commands, results, adapted infrastructure settings and remaining blockers.
Never fabricate a working URL, passing test, persistent volume or successful deployment.

## Non-negotiable game behavior

- Entire game is a self-contained simulation. No real AI services, extraction traffic or paid APIs.
- Fictional target JobS; fictional team Redwood C2; Rook and Cipher brief the operators.
- Player chooses a name once. Advise a one-word nickname. No rename/switch/reroll controls.
- Novel has three decisions. Five title families are derived by majority, latest-choice tie-break.
- Title is cosmetic, immutable once awarded, and carried into gameplay across reloads/restarts.
- Each player has an independent student. One shared host-driven event, live dots and rankings.
- Host controls levels, clock, pace, defenses and any deliberate boosts/setbacks. Players do not advance levels.
- New level pauses every real player's extraction. Quiz first, then set and explicitly confirm each newly unlocked slider, then manually Resume stealing. The server enforces confirmation and a separate resume request; do not bypass this gate or auto-resume.
- Wrong control answer: −5 challenge points and up to −3% copy progress, with two-second retry cooldown.
- Suspicion: 70% costs 5 progress points; 100% costs 12 more and a five-second freeze.
- Server owns score, timing, unlocks and detection. Do not trust client-supplied scoring fields.
- Viewport-fitting dashboard; phone Controls/Race tabs and persistent copied/risk/rate/extraction HUD.
- Skip/replayable first-entry guide. Animated JobS moods and level evolution respect motion preferences.
- All state survives restart in SQLite; a live round restarts paused and extraction is disarmed.

## Numbered implementation/deployment steps

1. Get the exact repository URL and branch/commit from the human. Do not invent them. If given an archive,
   extract it into a new directory and work next to package.json. Do not overwrite unrelated projects.
2. Read README.md, SECURITY.md, DEPLOYMENT.md and this file completely. Inspect package.json,
   server.mjs, lib/, public/ and tests/. Do not print .env, session tokens, private keys or database payloads.
3. Inventory your infrastructure: Node version, container support, long-running process support, writable
   **persistent local** volume, HTTPS ingress hostname, internal port, SSE support and process manager.
4. Choose exactly one of the existing deployment paths: plain Node 24 or the supplied Dockerfile/compose.
   Static-only/serverless/ephemeral-only hosting is incompatible. If necessary, request a compatible service
   from the human. Do not remove persistence or rewrite the app to satisfy an incompatible platform.
5. Install Node 24's latest patched LTS if allowed. Verify `node --version`. Run `npm ci --ignore-scripts`.
   Never replace the lockfile just to avoid an install error. Investigate the error first.
6. Install test browsers: `npx playwright install --with-deps chromium`. On an existing Windows machine,
   installed Edge can be used via BROWSER_CHANNEL=msedge. Run `npm test`, `npm run test:load`, and
   `npm run check:release`. Fix actual failures without weakening assertions or bypassing security gates.
7. Provision one writable persistent directory/volume for DATA_DIR. Exactly one app replica/process.
   Do not use horizontal autoscaling, shared/NFS storage, or an ephemeral working directory for SQLite.
8. Generate a private random 32-byte host secret. Store it in the platform's secret/environment settings.
   Configure production variables exactly as DEPLOYMENT.md describes. Set actual PUBLIC_ORIGIN, HOST,
   PORT and DATA_DIR for your infrastructure. Keep REQUIRE_INVITES=true and ALLOW_DEMO_BOTS=false.
9. Start using `node server.mjs` or the supplied container recipe. No bundling/build step is necessary.
   Configure /healthz, restart-on-failure and persistence. Check logs without exposing host credentials.
10. Connect HTTPS ingress to the internal service. Preserve the hostname root URL paths. Disable SSE
    buffering/caching and use a long streaming timeout. Do not add a wildcard permissive CORS workaround.
11. Perform EVERY acceptance check in DEPLOYMENT.md on the actual hosted HTTPS origin with two
    independent browser profiles and at least one real phone. Inspect console/network errors. Verify
    origin checks and Secure cookies through the proxy, not just against localhost.
12. Rehearse service restart and consistent backup/restore. Confirm identities, locked titles, used passes,
    questions, scores and paused timer survive. Never wipe the event to pretend recovery works.
13. Run a 15–20-minute host rehearsal and verify all four levels, answer penalties, deliberate setbacks,
    phone tabs, copy-rate feedback and final results. Record any constraints or failures honestly.
14. Return: deployed revision, public PLAYER URL, private host-link **format** (no actual secret in a public
    report), persistent volume location, install/start commands, tests and results, backup procedure,
    restart behavior, resource/network limits and remaining risks. Do not claim zero bugs or cheat-proof.

## What may change

Environment values, internal port, HTTPS/proxy configuration, process-manager settings, persistent-volume
path and infrastructure health checks. Platform-specific deployment manifests may be added without changing
game rules. Keep the source architecture intact; if code must change for a demonstrated compatibility bug,
describe the bug, make the smallest fix, add a regression test and re-run the full suite.

## What must never be uploaded to the public repo

.env or actual secrets, data/, database/WAL files, backups/, logs containing private host links, attendee
sessions or personal paths. Only the game project belongs in the repo—not the neighboring PowerPoint files.
Use `.gitignore` and the release check. The release zip is source code, not a backup of a running event.
