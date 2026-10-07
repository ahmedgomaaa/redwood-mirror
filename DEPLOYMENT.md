# Deployment runbook

Use a long-running **Node.js 24** service with a persistent **local** volume, exactly one replica,
and an HTTPS reverse proxy or managed HTTPS ingress. The app has no runtime npm dependencies.
Do not deploy to GitHub Pages or a static-only/serverless-function service. Do not add real AI keys.

## Local rehearsal

```sh
npm ci --ignore-scripts
npm start
```

Keep development bound to 127.0.0.1. The server prints a private host link and saves its generated
development secret in the private database. Copy `.env.example` to `.env` only if overriding settings.
Never put the host URL in a public issue, commit, screenshot, document or player invitation.

## Plain Node hosting

1. Install the latest patched Node 24 LTS. Verify `node --version` reports v24.x.
2. Clone the uploaded repository or extract the source archive. Work in its root, next to package.json.
3. Run `npm ci --omit=dev --ignore-scripts`.
4. Provision a writable persistent directory owned by the service account. Do not put it inside
   the web server's document root. Do not use a shared/network filesystem.
5. Generate a secret, privately: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
6. Set these **environment variables** in the platform's private configuration:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=<port assigned by the platform, or 4173>
DATA_DIR=<absolute writable mounted directory>
PUBLIC_ORIGIN=https://<actual hostname>
MIRROR_ADMIN_TOKEN=<generated secret>
ROOM_CODE=MIRROR
ROUND_SECONDS=180
MAX_PLAYERS=100
REQUIRE_INVITES=true
ALLOW_DEMO_BOTS=false
```

7. Start command: `node server.mjs`. Set automatic restart on failure and exactly one process/replica.
   No build command is needed. `npm start` also works and loads a local `.env` if provided.
8. Point health/readiness checks at `/healthz`. The configured port is the internal listening port.
9. Connect HTTPS ingress to that internal port. Set PUBLIC_ORIGIN to the **external** origin exactly,
   without a trailing slash, path, query or fragment. The app is deployed at the hostname root.
10. Support Server-Sent Events: no response buffering or caching for `/api/events`, long read timeout,
    and reconnect support. Do not add restrictive timeouts that kill a live session every few seconds.
11. If using nginx, adapt `deploy/nginx.conf.example` inside your existing HTTPS server block.
    Supply your own certificate and hostname; keep backend port access private.
12. Stop deployment if the infrastructure cannot provide a long-running process and persistent local disk.
    Do not silently switch to memory storage, change the game's rules, or remove authentication.

Production logs do not print the private key. Open `https://<hostname>/admin#<secret>` yourself;
the browser moves the secret into sessionStorage and removes it from the address bar. Treat
that browser profile as privileged. Never give this link to players.

## Docker alternative

Dockerfile runs as the unprivileged node user. Compose mounts a persistent named volume and binds
port 4173 only on the host loopback address. An external HTTPS proxy is still required.

1. Create a private `.env` containing PUBLIC_ORIGIN, MIRROR_ADMIN_TOKEN and any overrides above.
2. Ensure Docker's daemon is running.
3. Run `docker compose config --quiet` (avoid printing the full rendered config, which contains secrets).
4. Run `docker compose up -d --build`.
5. Run `docker compose ps` and check health. Do not use `docker compose down -v`: that deletes saved event data.
6. Route the real HTTPS hostname to localhost:4173 using your platform/proxy.
7. Perform all acceptance checks below.

The supplied container recipe was prepared locally, but Docker execution must be verified on a host
with a running daemon. The development computer's daemon was unavailable during this build.

## Acceptance checks on the actual HTTPS deployment

- `/healthz` returns HTTP 200 with ok:true and storage:ready.
- `/intro` loads both character sprites and the briefing background without console errors.
- A missing player pass cannot enrol. Generate two passes as host; enrol two independent browser profiles.
- A used pass cannot create another identity. A returning session keeps its existing name and title.
- The title assigned by the novel is unchanged on the dashboard and after refreshing.
- Host alone controls rounds. A direct player call to `/api/admin` returns 401.
- Player-modified score/bank/quality payloads are rejected; gated sliders and unanswered extraction are denied.
- Cookies are HttpOnly, SameSite=Strict and Secure. Player secrets are absent from URLs/public snapshots.
- Start a round; both players see movement and live rates. Disconnect/reconnect one phone; the room stays consistent.
- Move to a new level at high speed. The player's extraction stops and does not accrue automatic penalties
  until the question is answered, the newly unlocked slider is explicitly confirmed, and stealing is manually resumed.
- A wrong answer deducts points/progress; retry cooldown and correct-answer replay protection work.
- Test desktop 1280x720 and real phones at default zoom. Switch Controls/Race; extraction and risk stay visible.
- Restart the service. Names, titles, scores and passes remain; a live round recovers paused with extraction off.
- Check that direct /.env, /data/game.sqlite and /server.mjs requests return 404.
- Verify foreign Origin mutation requests are denied and framing is prevented.
- Rehearse 15–20 minutes with the actual network/attendee devices before the live talk.

## Backup and restore

`npm run backup` makes a consistent SQLite backup under private `backups/` using VACUUM INTO.
Production needs the same environment settings as the running app when invoking this command.
For containers, execute the backup script outside the runtime image against the mounted volume,
or use your platform's documented consistent volume/database backup mechanism. Do not copy a live
SQLite main file alone: committed data may still be in its WAL file.

To restore: stop the app; preserve the current data directory as a recoverable backup; restore the
chosen consistent backup to DATA_DIR/game.sqlite in a clean directory; restore ownership/permissions;
wait up to 30 seconds for any saved lease to expire; restart with the same host secret and origin.
Never overwrite the only backup. Restoring an older backup also restores older scores, credentials
and invitation usage, so tell the host and do not perform an unannounced mid-event rollback.

## Updating safely

Pause the game, create a backup, record the revision you are deploying, then stop/redeploy/restart.
Run health and two-player checks before resuming. Preserve the existing persistent volume and private
environment. If an update fails, restore the previous **code version** first, not old scores by default.
Do not open a new event merely because the service restarts. Upgrade SQLite schema only with an explicit
migration; an unknown saved-state version fails startup rather than overwriting data.

## Primary technical references

- [Node release support](https://github.com/nodejs/release)
- [Node 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [nginx proxy buffering and timeouts](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Playwright CI setup](https://playwright.dev/docs/ci)
