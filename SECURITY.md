# Security model and deployment boundaries

This is an educational simulation. No real target models or third-party credentials are involved.

## Enforced on the server

- Player credentials are random bearer secrets; other players' credentials are never in public state.
- Host operations require the private host secret, compared using a timing-safe comparison.
- Titles are derived from choices and locked; names and scoring cannot be overwritten through player APIs.
- Only known tuning fields are accepted. Numeric inputs must be finite and are clamped to valid ranges.
- Slider unlocks, company questions, answer cooldowns, score awards and rollback are authoritative.
- Correct-answer replay cannot earn additional points. A player cannot alter another identity by posting an ID.
- Pending origin novels and unanswered company updates do not make requests or incur automatic detection.
- Production requires HTTPS-origin configuration and a configured host secret, without logging that secret.
- One-use passes default on in production, preventing reuse after the first enrolment.
- HttpOnly, SameSite=Strict cookies authenticate SSE without session secrets in URLs. Production cookies are Secure.
- CSP disallows inline JavaScript and framing; origin checks reject cross-origin mutation requests.
- Only explicit public files are served. Database, environment files and source directories are not HTTP routes.
- Request sizes, mutation rates, SSE counts and slow-client buffers are bounded.
- A persistent SQLite snapshot is committed on mutation; audit entries record host actions and scored answers.

## What this does NOT claim

Tests are not an external security audit or a proof that there are no bugs. TLS, reverse-proxy configuration,
host OS patching, firewall rules, secrets and volume access remain deployment responsibilities.
This is one event on one process, capped at 100 players; no multi-region or horizontal scaling is implemented.
Server resources can still be exhausted by a sufficiently large attack. Put an Internet event behind the
platform's edge protection and enforce network-level limits without blocking all attendees behind one NAT.

Visitors can see game formulas and use browser tools. The anti-cheat boundary is that those tools cannot
award server-side score, bypass gated sliders, replay scored answers or become the host without a secret.
The host is trusted and intentionally can boost/set back players. Shared answers, collusion, automated
legitimate parameter tuning, stolen passes and extra passes issued to the same person cannot be fully
prevented by anonymous browser software. Do not use this as a high-stakes prize system without stronger identity.

Bearer secrets remain available to the browser's JavaScript for session recovery. An XSS vulnerability or
malicious browser extension could steal them; all displayed nicknames/dialogue are escaped or textContent.
Same-origin credentials are a security boundary: do not host untrusted apps under the same origin.
The SQLite volume and backups contain session secrets. Keep them private, restrict file access, and never
upload them to GitHub. Revoke all player credentials by creating a new event. Rotate the host secret in
the environment and restart if exposed; do not change an active event's PUBLIC_ORIGIN casually.

## Before an Internet event

1. Use the exact HTTPS PUBLIC_ORIGIN and a cryptographically random secret.
2. Keep REQUIRE_INVITES=true and ALLOW_DEMO_BOTS=false.
3. Block direct public access to the backend port when behind a proxy.
4. Preserve a single writable disk/volume and one process/replica; do not use ephemeral/serverless-only storage.
5. Verify cookies, SSE reconnects, cross-origin denial and private data isolation through the actual proxy.
6. Run tests, a load rehearsal, backup/restore rehearsal and real-phone checks on the hosted URL.
7. Keep the deployment out of public use until these checks succeed.

Report vulnerabilities privately to the repository owner; do not include real secrets in public issues.
