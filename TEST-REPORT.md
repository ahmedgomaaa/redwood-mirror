# Release verification

Verified locally on 7 October 2026 with Node 24.19.0 and automated Microsoft Edge browser tests on Windows. This is a tested release candidate, not a guarantee of zero bugs or cheating.

## Detailed-handoff revision verification

- Re-ran the complete `npm test` successfully after adding the handoff and fidelity tooling. Existing
  server/lib/public gameplay and art are unchanged from baseline bc84bb8c2a96c003fca89cc4297cf3541d27b6ca.
- `npm run verify:fidelity`: all 42 protected files matched. The generated source release also passed.
  Negative tests reject modified text, changed/missing binary assets, traversal and duplicate entries;
  LF/CRLF-only text differences are permitted for cross-platform git checkouts.
- Re-ran `npm run test:load`: 100 progressing streams, health p95 32 ms, 1,755 received frames,
  approximately 47.1 MB received locally. This supplements, not upgrades, the hosting guarantee.
- `npm run check:release`, `git diff --check`, production dependency audit and local documentation
  link checks passed. Source-only package includes all three guides, fidelity manifest, original assets
  and tests; private live event data was not included or changed.
- Microsoft/company SSO is a requested, detailed integration contract in MICROSOFT_SSO.md,
  **not implemented or tested authentication in this baseline**. Tenant/app/admin IDs, private
  credentials and real two-account testing remain required. Current build still uses private host key.

## Passed

- Clarity revision: mission explained as asking JobS questions and training a smaller AI from its answers; teacher/student explicitly defined as model roles. Dashboard and phone HUD use Your AI progress / Your AI; the walkthrough explains simulated learning rather than stealing model files. Revised novel and normal-zoom layouts rechecked.
- Layout correction: resized bot positioning after banner compaction; automated checks verify its face and antenna remain inside the visible frame at all nine viewports. Roomy desktops use at least 14px control labels and a taller 180px banner instead of applying phone-like density everywhere.
- Newly unlocked controls require explicit setting confirmation before a separate resume action. Server tests reject forged confirmations, missing values, premature resume and combined confirm/resume; the gate survives restart. Browser tests verify the highlighted slider, confirmation button, and Resume stealing highlight; all three guided unlocks fit the tested desktop/phone viewports.

- Full `npm test`: simulation invariants across 1,080 tuning combinations; title majority/tie rules; immutable names/titles; independent players; server-authoritative scoring; role checks; invalid numeric/unknown-field rejection; invitation enforcement; origin checks; answer replay protection and cooldowns.
- Fail-closed production configuration, private-secret log redaction, Secure cookie attributes, disabled production demo bots, incompatible database version protection and single-writer lease.
- Consistent SQLite backup, integrity check and restored identity/session. Abrupt process termination and WAL recovery preserve progress; recovered live games pause and disarm extraction without offline penalties.
- All five visual-novel titles, choice persistence, no title reroll after locking, host-only event progression, new-level question gates, manual extraction resume, wrong-answer setbacks and final results.
- Normal-zoom dashboard checks at 1920x1080, 1366x768, 1280x720, 1024x768, 768x1024, 430x932, 390x844, 360x640 and 320x568. All quizzes and four unlocked sliders tested. No document overflow; phone HUD keeps progress, suspicion, copy rate and extraction available across Controls/Race tabs. Long nickname with Conscientious Hacker prefix tested.
- Local load rehearsal: 100 authenticated live player streams, all progressing; 101st player rejected. Most recent measured health-check p95 was 47 ms, with 1,835 received frames totaling approximately 49.6 MB. These are local measurements, not a hosting capacity guarantee.
- Dependency audit reported zero known vulnerabilities at verification time. Release-source scan excludes private state, logs, credentials and machine-specific paths.

## Remaining hosting acceptance checks

- Docker build/run is unverified because the local Docker daemon was unavailable. Plain Node execution was tested.
- Actual public HTTPS termination, reverse-proxy SSE streaming, persistent-volume permissions, edge protections and deployed backup/restore require testing on the chosen host.
- Phone layouts were automated touch/viewport emulations, not physical-device Safari/Chrome testing. Rehearse with real phones, two independent human players and the presenter before the event.
- Automated usability checks verify visibility and workflows, not human comprehension. Tune round timing with the actual audience; 15–20 minutes is a pacing target, not a guaranteed completion time.
- Server validation prevents direct client score/title forgery. It cannot prevent all collusion, stolen invitations/sessions, automated legitimate tuning or a compromised host. See SECURITY.md.

Follow MODEL_HANDOFF.md and DEPLOYMENT.md for installation and the remaining acceptance checklist. Do not publish databases, backups, `.env` or private logs.
