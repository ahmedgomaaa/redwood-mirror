# Microsoft/company SSO — required new integration contract

**Status: NOT implemented in this source baseline.** This is the owner's requested deployment delta,
not a description of existing login. Current auth is private host key, player browser session/pass.
New environment names/routes below are PROPOSED and do nothing until code is integrated/tested.
Do not call this complete just because this document exists. Preserve the exact game in GAME_SPEC.md.

## 1. Intended outcome and trusted identity

Owner's intended sole admin account: **AHMED.GOMAA@LIQUIDC2.COM** (case-insensitive display).
Find that genuine user in the company Microsoft Entra directory and bind its **tenant ID + immutable
user object ID**, obtained privately from the tenant administrator. Admin role requires both exact IDs
from a verified interactive-user identity; all other users are players. Never authorize by textbox,
nickname, browser localStorage, supplied JSON, unsigned headers, email suffix or first login.
No implicit global-directory-admin/group/domain privileges. Cosmetic game title is unrelated to role.

Microsoft warns against email/username authorization and identifies tenant+object IDs as stable
identity keys. Follow [Microsoft claims validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation).
Use a supported server-side library for OIDC authorization-code flow with PKCE, not handwritten
OAuth/signature code; see [Microsoft auth code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).
Email is for intended account lookup/display, not the security identifier. If account is deleted/recreated,
its new object ID requires a deliberate owner-approved rebinding. Never auto-rebind by matching email.

## 2. Required inputs — stop the SSO release gate if missing

Obtain securely, NOT in public git/issues:

1. Company Directory (tenant) ID GUID.
2. Ahmed's user Object ID GUID in that directory; tenant admin verifies it belongs to intended account.
3. Application (client) ID of a single-tenant Entra WEB app registration.
4. Client secret VALUE with expiry, or a properly supported private certificate credential. Use the
   secret value, not secret-ID label. Secrets are platform-private, never returned to browser.
5. Actual external HTTPS origin. Register exact callback `https://<origin>/auth/microsoft/callback`
   as WEB redirect, not SPA/implicit. Owner/tenant admin must approve registration/consent.
6. Ability to test Ahmed plus a separate ordinary company user. Don't request their passwords;
   users sign in themselves. Conditional access/MFA follows tenant policy.

Do not invent GUIDs or ask model to guess directory configuration. No tenant credentials in repo.
If platform supplies existing verified Microsoft SSO, section9 is the only alternate integration path.

## 3. Configuration and modes — exact proposed names

Keep PORT/HOST/DATA_DIR/PUBLIC_ORIGIN/ROOM_CODE/ROUND_SECONDS/MAX_PLAYERS/REQUIRE_INVITES/
ALLOW_DEMO_BOTS unchanged in meaning. Add these server-only validated values:

| Variable | Meaning |
| --- | --- |
| AUTH_MODE | `private-key` for isolated development; `microsoft` for final production |
| MICROSOFT_TENANT_ID | Single trusted tenant GUID; no common/organizations wildcard |
| MICROSOFT_CLIENT_ID | Registered application's client GUID |
| MICROSOFT_CLIENT_SECRET | Private server credential, never public/example actual value |
| MICROSOFT_ADMIN_OBJECT_ID | Ahmed's verified immutable USER object ID in that tenant |
| MICROSOFT_ADMIN_EMAIL | AHMED.GOMAA@LIQUIDC2.COM, intent/display only, NOT authorization |

Validate all required IDs/config at startup. Production microsoft mode with missing/invalid settings
fails startup with nonsecret error, not fallback to anonymous/admin/private-key mode. Keep baseline
development tests explicit AUTH_MODE=private-key; prevent inherited SSO env from contaminating them.
Production auth default for the integrated final release should be microsoft; nondevelopment
private-key deployment needs explicit owner opt-in, not a silent accidental default.

MIRROR_ADMIN_TOKEN currently required by config.mjs: change that requirement ONLY for implemented
microsoft mode. Production microsoft mode must not require OR accept MIRROR_ADMIN_TOKEN.
Ignore/deny old Authorization:Bearer host key and /admin#secret flow in that mode. No universal
break-glass key by default. If owner later wants break-glass, ask and specify separately.

## 4. Implementation sequence — server-side OIDC library

1. Record baseline hashes/tests. Add isolated auth module (suggested lib/auth.mjs) and dedicated
   auth tests. Use a currently supported OIDC server library compatible with Node24, e.g. openid-client.
   Read its OFFICIAL docs for current API/validation behavior, pin exact tested version in package.json
   and package-lock.json. Do not guess SDK methods or blindly copy outdated tutorials. This dependency
   selection is an auth compatibility decision, not permission to replace the game framework.
2. Discover issuer from fixed configured tenant's v2 OIDC metadata, never a token/header-supplied
   URL. Validate with SDK its signature, issuer, audience, expiry/not-before and nonce. Bind interactive
   user to exact tenant+object ID. Permit only the SDK-supported secure signing algorithms, reject
   unsigned/invalid tokens and app-only credentials. Do not accept a Graph access token as game login.
3. Server creates authentication transaction: random32bytes each state/nonce/PKCE verifier, S256
   challenge,5minute expiry, single-use, tied to browser transaction cookie. Store sensitive verifier
   privately, state/cookie session hashes as appropriate. Set cookie `__Host-mirror-auth-flow`, Secure,
   HttpOnly, SameSite=Lax, Path=/, maxage300, no Domain. Callback is GET response_mode=query:
   Lax allows top-level cross-site Microsoft return; using Strict here would break callback.
4. GET /auth/microsoft/login: create transaction, redirect fixed tenant authorize endpoint; scopes
   only openid profile email, response_typecode, exactredirect, state, nonce, PKCES256. No Graph/mail
   read/directory/offline-access scopes needed for this game. Return destination is allowlisted
   /admin or /player, never arbitrary attacker URL. Admin entry can request account selection.
5. GET /auth/microsoft/callback: verify transaction/state/cookie/expiry before redeeming code viaSDK
   on server with credential+verifier. Single-use transaction consumed even on handled failure; reject
   duplicate/replayed callback. Validate ID token fully. Do not merely base64-decode claims. Reject
   wrong tenant/issuer/audience/signature/nonce/expiry; show safe error with retry link, no tokens.
6. Create opaque random32byte identity-session ID, store hash and identity on server; rotate on
   login (no fixation). Cookie `__Host-mirror-identity`, Secure,HttpOnly,SameSite=Lax,Path=/,noDomain.
   Absolute expiry8hours, idle30minutes, server enforced. Return role computed SERVER-SIDE:
   `verified user && tid===MICROSOFT_TENANT_ID && oid===MICROSOFT_ADMIN_OBJECT_ID` →admin;
   every other verified user→player. Other-tenant sign-ins denied by single-tenant login; they neveradmin.
7. Store transactions/sessions in private SQLite tables added through explicit versioned migration.
   Reuse existing single-writer Store connection/lease. Do not overwrite version1 game snapshot or
   launch a second game writer. Include hashes,tid,oid,displayname/email,created/lastSeen/expires,
   CSRFtoken hash or securely stored random value. Don't retain raw provider tokens when not needed.
   Expired transaction/session cleanup each60s plus on access; absolute expiry wins over refresh.
8. GET /api/identity returns only authenticated boolean, role(admin/player), displayname/email when
   signed in, and authenticated-session CSRFtoken for same-origin browser use. Cache-Control:no-store.
   Anonymous roleplayer, no admin. Never provider tokens, credentials, host key or directory data.
9. Each /api/admin request loads/validates current session and recomputes role from pinned IDs.
   No user-supplied role/isAdmin accepted. Anonymous401, authenticated nonadmin403. Do not trust
   a stored role after config changes; a revoked/logout/expired session cannot control game.
10. Require exact external Origin for SSO admin POSTs AND session-bound random32byte CSRFtoken
    in X-CSRF-Token. Missing Origin/token or mismatch denied403. Validate constant-time. Do not
    exempt cookie-authenticated admin just because baseline permitted credentialed no-Origin CLI.
    Existing player routes keep their own browser/session flow. Foreign Origin always denied.
11. POST /auth/logout requires same origin+CSRF if authenticated, revokes local session and clears
    identity/flowcookies. Optional Microsoft signout navigation through fixed configured endpoint/
    postlogoutroot only; local revocation sufficient to remove app admin access. Never clear game
    identity/title/scores or create a new event on login/logout. Logout must invalidate server session.
12. Minimal client changes: in microsoft mode fetch /api/identity; show Sign in with Microsoft on
    home/lockedadmin; build host console only for actualadmin; api helper includes X-CSRF-Token
    and same-origin cookies for host actions, never host bearer. Callback admin redirects/admin,
    ordinaryuser/player. Player nickname/title enrollment remains unchanged. Remove fragment key
    storage/use in microsoft mode, but preserve explicit development baseline auth tests.
13. Update Dockerfile/compose/env examples/deployment docs for new runtime dependency/config and
    callbacks. Keep secret values placeholders. Runtime install no longer zero-dependency after this
    SDK addition; report this change. Use production npmci --omit=dev, preserve lockfile version.
14. Minimal CSP changes only if library flow needs them; redirect navigation doesn't require wildcard
    script/connect-src. Keep framingdeny/securityheaders/privatebackend. Reverse proxy must NOT
    log callback query containing authorization codes; redact /auth/microsoft/callback query strings.

Library tests must demonstrate all claim validation, not assume unspecified SDK defaults. Limits:
login/callback/logout request sizes bounded; auth module rate limit30login attempts/5minutes per
client key, transaction cap1000; excess429/retry, cleanup; no unbounded memory or open redirects.
Trust client IP headers only from known private ingress, never arbitrary X-Forwarded-For. These are
NEW auth design requirements; they do not modify game pace/timers. TTLs use server wall-clock.

## 5. Player identity stays separate; role is not a game title

Admin status belongs to verified Microsoft identity session, NOT nickname Ahmed or a chosen title.
Admin login doesn't automatically enrol/score him. He can join with pass/novel separately if desired.
Ordinary SSO users follow same player novel/pass rules; no invite bypass just because company user.
Keep anonymous invite-based player enrolment unless owner separately asks to require SSO for all.
Anonymous visitors are players only, cannot host. SSO login must not enable rename/reroll, reset
scores, change player token in another browser or attach one existing browser's player to all accounts.
Existing browser sessions remain bearer credentials; Microsoft login doesn't retroactively turn them
into tamper-proof named attendance. A future one-person-per-SSO-user policy is out of scope.

## 6. Permitted diffs and forbidden shortcuts

Allowed: auth module/table migration/tests, auth branches in server.mjs/config/security, minimum
login UI/client auth handling, dependency lockfile, deploy/env/docs. Record exact files/reasons.
Forbidden: score/rate formulas, controls/quiz outcomes, title logic, sourceart, bot animation/layout,
tick interval, level gates, data wiping, new framework/backend or broad rewrite.
GAME-FIDELITY.json remains baseline; expected auth-file changes must be disclosed and reviewed.
Never regenerate baseline hashes to disguise them. Protected art/game-rules/story/styles must remain
unchanged. Extend tests; do not delete baseline private-key tests, replace them with looser mocks
or expose production fallback to keep them passing. Test in explicit developmentmode instead.

## 7. Required automated auth tests — all must pass

Use a controlled local OIDC test issuer/keys behind test-only injection, NOT a production skip-validation
switch. Production issuer/config fixed. Also unit-test pure verified-identity role binding.

1. Exact trusted interactive tid+oidadmin; differentoid same tenantplayer; same email differentoidplayer.
2. Wrongtenant, missingoid/tid, app-only identity neveradmin; case of email cannot change role.
3. Invalidsignature, wrongissuer/audience, expired/notyetvalid, unsignedtoken, badnonce denied.
4. Missing/bad/replayedstate, missingflowcookie,5min expiry, reusedcode transaction denied.
5. Openredirect external URL denied; callbacks don't leak codes/provider tokens in logs/errors.
6. Session rotates on login;8h absolute/30min idle serverexpiry; logout revokes; cookie flags correct.
7. Playercookie alone, forgedrole/body/header/localStorage admin rejected; direct backend spoof denied.
8. Missing/wrong Origin/CSRF denies host POST; validadmin+CSRF succeeds.
9. MIRROR_ADMIN_TOKEN bearer and fragment don't grant production SSO admin, even if key configured.
10. Missing config fails startup; no silent private-key fallback; fresh/restart/migration preservesgame.
11. Auth transactions/sessions capped/cleaned; limiter429; storagefailure failsclosed.
12. All baseline gameplay/security/UI/load/storage/recovery tests still pass with explicitdevelopmentmode.

## 8. Actual hosted SSO acceptance — mock tests are not sufficient

On real HTTPS origin, owner signs in himself using company Microsoft/MFA. Verify /api/identity roleadmin
and all host actions work. Another genuine companyaccount signs in separately: roleplayer and direct
hostPOST403. AnonymoushostPOST401. Test logout, expiry, another browser profile, phone return from
Microsoft, lost/cancelled login/retry, backend inaccessible, origin/CSRF, privatekeybypassdenied,
restart persistentgame, callbacks/console/logs no secret leakage. Then run all MODEL_HANDOFF GateH.
Record YES/NO evidence without publishing passwords/tokens/object IDs unnecessarily. Until actual
accounts work, status SSO PENDING; infrastructure approval/credential issues remain explicit blockers.

## 9. Existing platform Microsoft SSO alternative (only if really provided)

Do not add second parallel login if platform supplies a supported server-verifiable OIDC session.
Inventory its official SDK: issuer/audience/tenant/user claim validation, signed session TTL/logout,
CSRF, gateway/backend isolation. Map VERIFIED tid+oid to exactadmin, everyotherplayer. Document
equivalent routes/UI/tests and deviations from section4 for owner review. Token/session security
must meet the same acceptance requirements; platform-native SDK may replace proposed cookie/DB
internals, but cannot change game state/roles. Do not merely trust email asserted in a browser.

Forwarded identity headers trusted ONLY if ingress strips attacker-supplied identity headers, backend
unreachable except authenticated trusted gateway, and identity assertions cryptographically verified
or securely supplied through documented platform server API. Public raw X-User-Email is forbidden.
Test directbackend/headerinjection. If platform exposes only email and cannot provide stable verified
tenant+user IDs, stop and request a suitable integration; do not assume SSO is secure by label alone.
