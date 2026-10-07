# Exact game specification — existing executable behavior

This is a map of the included implementation, not instructions to rewrite it. Version authority:
MODEL_HANDOFF.md baseline + GAME-FIDELITY.json. Preserve source files exactly unless an explicitly
approved authentication integration requires a narrowly reviewed change. All mentioned AI training,
requests, detection and tests are SIMULATED. No model weights are downloaded, no real AI is trained,
and no real provider API is called. The teaching language does not describe measured model fidelity.

## 1. File/route ownership: use these files, not replacements

| Files | Responsibilities |
| --- | --- |
| server.mjs | HTTP allowlist, authoritative event/players, host actions, challenges, tick/SSE |
| lib/config.mjs | Validated environment/defaults; production HTTPS/private key gate |
| lib/storage.mjs | Native SQLite, version1 snapshot, audit, metadata, exclusive writer lease |
| lib/security.mjs | Headers, player cookies, bearer extraction, bounded rate limiter |
| public/game-rules.js | Shared rate formula; server authoritative, browser preview only |
| public/story.js | Exact five-scene text/options, role algorithm, VN renderer |
| public/intro-client.js | Personal novel draft/enrolment/finalization |
| public/client.js | Host/player/display renderer, controls, map, robot, tour, SSE |
| public/styles.css | ALL layout, art placement, CSS robot/moods/motion/upgrade |
| public/index.html | Landing / |
| public/intro.html | Personal visual novel /intro |
| public/player.html | Player /player |
| public/admin.html | Host /admin; baseline private key, proposed SSO changes only auth |
| public/display.html | Public spectator/projector /display |
| public/vn-room.png | Original anime briefing-room background |
| public/vn-crew.png | Transparent original anime character sheet: Rook left, Cipher right |
| public/story-atlas.png | Included legacy art route; NOT a substitute for current VN sprites |
| deploy/nginx.conf.example | Streaming proxy example |
| Dockerfile / compose.yaml | One process, persistent volume, unprivileged container |
| tests/, test.mjs, test-story.mjs | Regression/security/storage/UI/load evidence |
| scripts/backup.mjs | Consistent restricted SQLite backup |
| scripts/check-release.mjs | Public-source path/credential scan |
| scripts/package-release.mjs | Source-only release with checksum inventory |
| scripts/verify-fidelity.mjs | Original protected source/art verification |

No external CDN/font/image requests required. Source includes exact dialogue and quiz copy; do not
paraphrase it during deployment. Image dimensions/bytes/SHA256 are recorded in GAME-FIDELITY.json.
Characters use equal-half sprite cropping (background-size200%100%). Original generation prompts
are in ART-PROMPTS.md; assets already exist. Do not regenerate, recolor, crop or optimize PNGs.
JobS robot is HTML/CSS, not a missing image. Legacy internal `aya` identifiers are CSS/DOM names,
not a player character; do not introduce Aya into the fiction or rename selectors and break rendering.

| Included binary | Dimensions | Bytes | SHA256 |
| --- | --- | --- | --- |
| vn-room.png | 1672x941 | 2349578 | c4dbafc931f78f57e276c0b981833552ccd4a6861873ec2c07663ff87ebf6fae |
| vn-crew.png | 1536x1024 | 1901711 | b6f5d194a2d059eb81b657450bd3204a9d8cbe8532d145310d7ca8f86c3da112 |
| story-atlas.png | 1536x1024 | 2362453 | cba30c22737a8a2969537a3a4240a508c5071d61ac926fc14cc52f7d0110676f |

## 2. Event and player lifecycle

One server hosts one current event, one room code, all players, one host-driven level/clock. Each
player trains a separate smaller AI. Progress/risk are NOT pooled. Public race ranks/dots show peers.

Event fields: eventId UUID, room, level0..3, levelRevision, status, intro(active/scene), duration,
remaining, pace, detection, mood, players, notice, revision; private invitation list omitted publicly.
States: lobby → running → round_complete; host can pause/resume; level changes enter paused;
finish enters finished. Timer zero NEVER automatically advances. Host can advance early.

New player defaults: UUID/id, private40hex-character token, connectedfalse, speed6, spacing0,
variety25, verification0, solved[], tuned[], points0, wrongAnswers0, answerCooldown0,
challengeFeedbacknull, extractingfalse, bank0, gain0, coverage0, queries0, suspicion0,
caught0, freeze0, warnedfalse, lastSetback0, setbackTimer0, lastReason ready. Colors cycle:
#c4f375, #75d4f0, #c2a4ff, #ffa976, #f1ce71, #ef94c3, #8ee3b3, #aab9fc.

Enrol only in lobby, under configured human capacity(max100). Nickname trims/control-character
strips, truncates24characters, required/nonempty, case-insensitive uniqueness among human names.
One-word nickname recommended, not enforced. Notice BEFORE reservation that it cannot change.
Reserved immediately, no rename/switch UI. Existing authenticated join resumes same identity rather
than creating another. Room is case-insensitive input, uppercase stored; 3–12 letters/digits.
Production requires one-use passes by default. Each9random-byte base64url pass is12characters;
first successful enrol records usedBy. Room code alone is not a pass/admin secret.

Player token stored in localStorage `mirror-player-token`; server also sets `mirror-player` cookie.
Cookie is HttpOnly, Path=/, SameSite=Strict, Max-Age604800seconds, Secure in production. Player
POSTs can use bearer; SSE uses cookie. No player token in URL/public state. Browser credentials
are bearer credentials: theft/profile sharing can impersonate; source being public is not secrecy.

## 3. Novel: exact five scenes, three decisions, permanent cosmetic title

Team Redwood C2, mission Operation Mirror, target JobS, prior-model joke WorX. Rook is mission
lead (sprite0); Cipher technical analyst(sprite1). Personal /intro reserves identity with origin:true.
No tuning/stealing while originPending. Names/drafts persist per event; final title is server-owned.

| Scene index | Chapter | Speaker | Decision |
| --- | --- | --- | --- |
| 0 | THE SUMMONS | Rook | No |
| 1 | YOUR APPROACH | Rook | Five options |
| 2 | THE MIRROR | Cipher | Five options |
| 3 | THE PRESSURE | Rook | Five options |
| 4 | YOUR CALLSIGN | Cipher | Title award / Enter game |

All scene text, options and response lines are literal in public/story.js. Choices0..4 consistently
represent Mastermind, Watchkeeper, Vigilante Hacker, Unethical Hacker, Conscientious Hacker.
Most frequent selected index wins; if tied, scan choices backwards and choose latest tied index.
Examples [0,0,4]→Mastermind; [0,1,4]→Conscientious Hacker; [3,3,1]→Unethical Hacker.
No choices→Operative (host skipped briefing). No numerical gameplay advantage from any title.
Label throughout game is `<assigned title> <reserved nickname>`; only display text, escaped.

Personal draft key `mirror-origin:<eventId>` holds scene/choices/name/locked. Going to final scene
calls /api/origin-finish with exactly three integer choices0..4. Server locks title, clears originPending,
disarms stealing. Subsequent reroll returns409; name/title change attempts return403. Draft is NOT
authority over an already locked server title. Completing personal novel does not start the event.

Alternative shared intro: enrol /player; host introStart, controls scenes; players choose only current
scene1..3. Host finalscene4 locks eligible titles. Skip locks choices/neutral title. Already locked titles
are not reassigned. beginOperation from shared final scene is an existing LEVEL1 exception: starts
clock AND arms all players' extraction; originPending still blocks ticking. Do not generalize this to
later levels or personal novel completion. Shared intro forbids other gameplay host actions except
its navigation, reset, add/removebots; no player tuning. Only host controls shared scene advancement.

## 4. Levels, questions, unlocks and required gate

Code level0 means displayed level1. No hidden fifth level.

| Code/display | Name | Controls | New slider/correct option |
| --- | --- | --- | --- |
| 0 / 1 | Open access | No speed or repetition detection | Questions/sec only, no quiz |
| 1 / 2 | Rate limit | Speed risk | Request spacing; option1(B) |
| 2 / 3 | Repetition check | Speed + repetition risk | Query variety; option2(C) |
| 3 / 4 | Data integrity | Prior risks + misleading data | Answer verification; option0(A) |

Questions/options EXACTLY defined server-side:

1. A request cap is active. How do you adapt? [Send larger bursts.; Space requests within the cap.;
   Repeat the same question.] Correct B.
2. Similar questions now get flagged. What changes? [Change only a few words.; Double request speed.;
   Explore different topics and examples.] Correct C.
3. Some answers are misleading. How do you protect your copy? [Cross-check before training.;
   Trust every answer.; Collect more unchecked answers.] Correct A.

Correct key never included in public challenge object, but source is PUBLIC: answers can be looked
up/colluded. Educational game, not secret exam. Verification models poisoning/misleading answers,
NOT watermark detection or real-provider evasion. Never add real malicious provider traffic.

Every level selection/Next banks previous round, sets paused, resets remaining=duration, increments
levelRevision, stops each human's stealing. Required quiz is EARLIEST unsolved level1..current.
Skipping ahead therefore queues missing questions, not freely unlocking all controls.
Correct:+10 challenge points once, solvedpush, extractingfalse; suggests spacing50/variety70/
verification70. New slider shows, cyan outline + `1 · Set <label>` and Confirm setting.
Wrong:points−5 (can go negative), wrongAnswers++, up to3percentage points progress setback;
wall-clock retry cooldown2000ms. Response explains hint. No automatic detection while gated.

Gate order: correct quiz → choose highlighted value (accepting suggested value allowed) → explicit
Confirm setting → separate Resume stealing. Missing tune is earliest solved level<=current not in
tuned. Confirmation sends value and confirmTune field; server adds level to tuned, keeps extractingfalse.
Combined confirm+extractingtrue rejected409. Incorrect field or missing value400. Resume while
quiz/tune pending409. Sliders before quiz unlocked403. Forged tuned/points/bank/quality fields400.
UI highlights separate Resume action; phone shares same authority. No auto-resume timer.

Speed1..10 integer; other unlocked sliders0..100 in steps5, clamped/rounded server-side. Instant
preview in browser,100ms debounced update to server. Tuning doesn't advance level/clock. Slider
values per player. Hidden presets remain source behavior, not new visible game feature: careful
[3,80,90,90], balanced[6,50,70,70], bold[10,0,25,0], applies only unlocked fields.

## 5. Exact scoring/rate math — do not rebalance

Variables bank/gain/coverage are simulated scalars, not dataset sizes. Display progress:

```text
quality = min(100, (bank + gain)*0.72 + coverage*0.28)
s = spacing/100 if solved includes1 else0
v = variety/100 if solved includes2 else0.25
f = verification/100 if solved includes3 else0
unitRate = pace*40/duration
requests = speed*(1 - 0.5*s)
throughput = requests*(level>=3 ? 1 - 0.4*f : 1)
cleanliness = level>=3 ? 0.4 + 0.6*f : 1
rawData = gain>=30 ? 0 : throughput*0.105*(1.15 - 0.35*v)*max(0.35,1-gain/50)*cleanliness
rawCoverage = coverage>=100 ? 0 : throughput*v*0.11*cleanliness
speedRisk = level.speed ? max(0,requests-6)*7 : 0
repeatRisk = level.repetition ? max(0,0.55-v)*60 : 0
dataRate = rawData*unitRate
coverageRate = rawCoverage*unitRate
progressRate = weightedRaw>=100 ? 0 : (rawData*0.72 + rawCoverage*0.28)*unitRate
suspicionRate = ((speedRisk + repeatRisk)*detection - 9)*unitRate
```

Negative suspicionRate cools toward0; no level1 detection even speed10. Spacing lowers actual
request rate; it does not grant invisible unlimited cap bypass. Variety trades raw data for coverage;
verification reduces throughput but increases useful data fraction. This is deliberately simplified.
Changing ROUND_SECONDS normalizes rates: shorter rounds increase rates. Do not remove40/duration.

Every250ms server computes dt=min(0.5,(now−last)/1000), updates last even when paused.
Only running: delta=dt*pace, unit=delta*40/duration; remaining=max(0,remaining−delta).
Only connected AND extracting AND !originPending AND (bot OR no pending quiz/tune) tick:

1. setbackTimer=max(0,setbackTimer−delta).
2. If freeze>0: freeze=max(0,freeze−delta), suspicion=max(0,suspicion−10*unit); skip gains/risk.
3. suspicion=clamp0..100(suspicion + suspicionRate*dt); below40 rearms warned=false.
4. If >=100: caught++, freeze5, setback12, suspicion40, warnedfalse, notice; skip gains that tick.
5. Else if >=70 and !warned: warnedtrue, setback5, notice; skip gains that tick.
6. Else gain=min30(gain+dataRate*dt), coverage=min100(coverage+coverageRate*dt),
   queries+=throughput*unit. This unusual simulated answer counter is EXACT current code; do not
   insert another dt or turn it into real HTTP requests. UI floors it; it is not measured API traffic.
7. At remaining0 statusround_complete, notice waiting for host. Save/broadcast.

Penalty unit is PERCENTAGE POINTS, not relative percentage. With progress40, loss5→35, not38.
setback: before=quality, after=max0(before−points), raw weighted sum, ratio=raw?after/raw:0;
scale bank, gain AND coverage byratio; lastSetback=round1decimal(before−after), setbackTimer3.
Thus no negative progress; data mix retained proportionally. If raw exceeds100, ratio accounts for
clipping. Suspicion70 warning once per crossing cycle; must cool BELOW40 to rearm.100 causes
12more +5game-second freeze, risk reset40. Wrong quiz uses same setback3, even while paused.

bankRound: bank=min120(bank+gain), gain0, suspicion0, freeze0, warnedfalse, setbackTimer0;
coverage,queries,points,identity/title/unlocks persist. Every level selection, even same level, banks.
Finish banks before tests. Progress capped100 but underlying bank limit120. No offline catch-up.

## 6. Time domains and every meaningful timer

| Timer/value | Domain / behavior |
| --- | --- |
| Round default180, configurable15..600 | GAME seconds; host pace0.25..3 multiplies clock |
| Tick250ms, dt max0.5s | Wall interval; stalled time beyond cap not caught up |
| Detection strength0..2 | Multiplier on risk, not cooling constant |
| Freeze5 | GAME seconds; only ticking extracting/connected player thaws |
| Setback marker3 | GAME seconds; same per-player ticking condition |
| Quiz cooldown2000ms | WALL timestamp; independent of pace/pause |
| Broadcast100ms | WALL coalescing; state saved before response, stream later |
| Slider debounce100ms | WALL; local preview immediate |
| Upgrade overlay3200ms | WALL; version stamp triggers animation, no score/timer mutation |
| UI answer enable refresh2100ms | WALL; server cooldown still authoritative |
| SSE heartbeat15000ms/retry1500ms | WALL; reconnect independently |
| Cookie604800s | Player cookie max-age7days; event newEvent invalidates identity |
| Limiter windows/cleanup60000ms | WALL; not model request-speed slider |
| Writer lease30000ms/renew5000ms | WALL; crash reacquire may wait30s |
| SQLite busy timeout3000ms | Storage wait, not game pause |
| Backup connection busy timeout5000ms | VACUUM INTO backup, not gameplay |
| HTTP request/header timeout10000ms | Transport protection |
| Graceful forced exit3000ms | Shutdown fallback, not timer restart |
| Docker interval30s/timeout5s/grace10s/retries3 | Infrastructure health probe |

At pace2 a180 clock lasts about90wall-seconds; frozen5 lasts2.5wall-seconds only while ticking.
Paused/gated/stopped/disconnected players do not thaw or cool automatically. Stopping isn't a free
instant risk reset. Host release clears risk/freeze. Pause stops round globally, not wall quiz cooldown.
No countdown beyond supplied remaining; browser displays mm:ss from server (ceil seconds remainder).
CSS motion clocks are purely decorative, entirely specified in styles.css; do not make them gameplay.

Decorative WALL timings (exact keyframes, offsets and overrides are included in styles.css): meter
widthtransition.2s; face/eye/mouthtransitions.4s; wallpaperdrift16slinearloop; robotfloat4sease-in-out
loop (sleepingoverride7s); antennaglow2sloop; blink5sloop; haloorbit12slinearloop and outerhalo20s
reversed; particles7sloops with negative stagger−2/−4/−1/−3/−5s; watchfulscan2.5s; angryshake.2s;
rebirth/shockwave/gridupgrade2.4s; announcement3.2s; legacy storydrift18salternate, reveal.55s/.8s;
VN characterfilter/opacitytransition.35s. Current VN room disables legacy drift. Still/reduced-motion
overrides suppress applicable loops/upgrades; retain version/announcement content.

## 7. Host controls and exact side effects

POST /api/admin requires host authority; no player's fields/actions can impersonate host.

| action / fields | Exact effect |
| --- | --- |
| invites,count | Lobby-only, whole1..MAX; allocated pass total boundedMAX |
| newEvent,confirm:"NEW EVENT" | Clears players/passes, new UUID, resets lobby; invalidates old sessions |
| introStart | Lobby level0 only; active scene0; clears choices only for unlocked titles |
| introBack / introNext | Shared sceneclamp0..4; finalscene locks titles |
| introSkip | Locks eligible titles, closes intro; no new game level |
| beginOperation | Active final sharedscene+players; starts level1 and arms extraction |
| settings,pace,detection,duration | Clamp pace.25..3/detection0..2; duration only if notrunning, resets remaining |
| start | Needs players; rejects finished/round_complete; runs/resumes clock, doesn't override player gate |
| pause | Paused, movement/clock stop |
| level,level0..3 | bankRound, paused, duration reset, human extraction off, version stamp increment |
| next | Next level; at last level bank/finish |
| finish | bankRound, finished |
| mood,mood | auto/relaxed/curious/watchful/angry/sleeping/impressed |
| reset | Resets scores/sliders/unlocks, lobby0; preserves identities/title/tokens and speed |
| bots / removeBots | Labelled rehearsal agents; bots forbidden when ALLOW_DEMO_BOTS=false |
| move,id,direction:"back" | setback8percentage points |
| move,id,direction:"forward" | bank+=min8(100−quality)/.72, up to8pp forward |
| move,id,direction:"freeze" | freeze5game-seconds |
| move,id,direction:"release" | freeze0,suspicion0,warnedfalse,setbackTimer0 |

Reset vs newEvent are different! Reset doesn't reopen pass capacity via erasing identities. No automatic
fresh event at deploy/restart. Host actions audited with level; intentionally host can alter rank.
Host settings inputs initialize from server; Apply sends them. No player-owned event pace/timer.

Demo bots: Omar speed10,spacing0,variety25,verification0. Sara speed9 onlevel0 else5.5,spacing65,
variety25 beforelevel2 else85,verification80. Nour speed7,spacing0,variety25 beforelevel2 else100,
verification50. Automatically solve elapsed quizzes+10each; exempt HUMAN quiz/tune gate. Bots
have no human credentials and are clearly labelled. Do not count this as a human fairness proof.

## 8. Design, map, robot, feedback and phone behavior

Theme exact CSS variables: background#0d1219, panel#141c26, line#293849, text#edf2f8,
muted#9aabbf, lime#c4f375, danger#ff7e86, cyan#75d4f0. Font stack Inter,Segoe UI,Arial,sans-serif;
no remote fonts. Base14px. Buttons generally minimum44px; compact controls exceptions are in CSS.
Player layout100dvh maxwidth1600, flex column, no DOCUMENT scroll. Desktop main grid left race,
right controls300..380px. Bounded internal leaderboard/feedback/control scroll allowed. Host and
novel may scroll. Never hide required information below page or depend on zoom to fix layout.

Breakpoint850px: phone Controls/Race tabs, one pane at a time. Persistent HUD Your AI/Suspicion/
Copy persecond/Steal orStop, retained on BOTH panes. Controls default first; finished automatically
switches Race. Phone header descriptions hidden, level labels condensed, all unlocked sliders compact.
While quiz active hide tuning/rate sections (not HUD), show full three choices; controls only after
correct. Confirm guide highlights new slider and then separate Resume action. Phone buttons share
same requests/state, not alternate scoring. Never create separate mobile simulator.

Desktop banner height110 compact; width>850 and height>=700 height145, robot scale.8;
height>=820 banner180, scale1 and control labels>=14px. Phone banner90, robot scale.5. Explicit
top/transform-origin corrections keep face+antenna in banner; do not reapply old bottom-origin clip.
Read exact cascade in styles.css. All nine regression sizes:1920x1080,1366x768,1280x720,1024x768,
768x1024,430x932,390x844,360x640,320x568. OS text enlargement/small landscape can need extra
space; prioritize accessibility instead of absurd shrinking. Recheck actual phone safe area/network.

Map is SVG built from live state, not free movement/maze: width=max260(mapclientWidth), height
playerclamp110..240, display370, host280. x(t)=28+t*(width−56); y(t)=height*.5+sin(t*2PI)*height*.14;
101 path samples; roadstroke42, dashed center1, ticks0/25/50/75/100. Player t=quality/100, vertical
offset(index%9−4)*16. Own dot radius10+lime ring15, peers7. Frozen/setback dot red; label red during
setback, marker−actualLoss%. Labels right except beyond80% left, long names shortened. Rank is
descendingquality thenpoints, stable existing order for exact tie. Race dots/leaderboard are shared.

Robot: grid wallpaper, CSS face/eyes/mouth/antenna/halos/particles/shadow, no generated new asset.
Auto mood precedence: explicit host mood override; finishedimpressed; paused/round_completesleeping;
lobbyrelaxed; relevant player freezeangry; suspicion>65watchful; otherwise level0relaxed, level1curious,
level>=2watchful. Player mood reflects self; host/display considers room. Colors/face variants,
float/blink/drift/scan/glow/orbit/particles exactly styles.css. Animation has no authority over risk.
Level+levelRevision stamp changes trigger3.2s reincarnating overlay, JobS v1.0..v4.0, new control
label and extraction paused. First render doesn't pretend a transition. Afterwards quiz banner says
new defense/answer first; paused says waiting for host. Motiontoggle and prefers-reduced-motion
suppress decorative animation, not version/control text. Novel has its own Motiontoggle.

Feedback uses shared queryRates immediately on input; server updates later. Label potential copy
speed when not running, live otherwise; +rate2decimals/sec,10s forecast, Faster/Slower delta; risk
trend or cooling warning. Frozen/finished/unanswered quiz zero shown; gated controls still cannot
run regardless of potential preview. Estimated rates before setbacks, not guaranteed outcomes.
UI wording Your AI progress plus mission reminder Ask JobS→save answers→train smaller AI.

Tour five nonmodal steps: mission/speed,progress/rate,suspicion,extract,map. Skip/back/next/Escape;
replay Quickguide. Stored `mirror-tour-<playerToken>` seen. Does NOT pause live game. Phone switches
pane perstep and anchors risk/extract to HUD. Resize repositions within viewport. No tutorial reward.

## 9. Results

Finish banks before render. Ranking progress first, challengepoints second. Simulated tests:
Reworded question pass bank>=28; Combined topics pass bank>=35 AND coverage>=35;
Unseen situation pass bank>=48 AND coverage>=55. No random/LLM judging. Player sees own tests,
host/display top-ranked player's. Include simulation disclaimer. No invisible title bonus.

## 10. HTTP/API contract and protection

GET routes: /healthz, /api/config(room,maxPlayers,simulation,eventId,inviteRequired), /api/state,
/api/events?view=player|admin|display, listed publicpages/scripts/PNGs. Static allowlist only;
/.env,/server.mjs,/data/game.sqlite and unlisted/traversal paths404. Only GET/POST supported.

POST JSON bodies (player private bearer/cookie except initialjoin; host baseline private bearer):

| Route | Body |
| --- | --- |
| /api/join | room,name,invite whenrequired, origin:true for personal novel; optional validstoryChoices[3] |
| /api/player | action:"resume" to recover cookie/profile; otherwise only speed/spacing/variety/verification/extracting/confirmTune |
| /api/answer | level1..3, option0..2 for currently pending question |
| /api/origin-finish | choices[3] only while originPending and unlockedtitle |
| /api/story-choice | scene1..3 current sharedscene,option0..4 while titleunlocked |
| /api/admin | action + exact fields section7 |

Mutation body cap8192bytes, application/json object (no arrays/null); maxheaders50; timeouts10s.
Any present Origin must match configured external PUBLIC_ORIGIN (development currentHost);
baseline no-Origin CLI permitted with credentials. SSO admin adds stricter CSRF in new contract.
Limiter POST perpath+authenticatedplayer/host/socketIP: join120/min, player600/min, others240/min;
at most10000buckets, failclosed capacity. This is HTTP abuse protection, unrelated to speed slider.

SSE cap400streams,4perplayer, heartbeat15s/retry1500ms; writablebuffer>512KiB destroys slow client.
SSE player connection marksconnected, final close marksoffline. Owner receives full own fields;
peer stream snapshots compact; private tokens/invites omitted. /api/state exposes noncredential
game fields including progress/config: not private scoring secrets. revision increments/save on mutation;
100ms coalescing streams latest committed state. EventSource showsLIVE/RECONNECTING.

Headers: no-store API/static, nosniff, frameDENY, no-referrer, permissionsdenycam/mic/geo,
CSP selfscripts/images/connect, styles self+unsafe-inline needed for dynamic inline visual values,
frame-ancestorsnone/base-uriself/form-actionself. Production HSTS31536000. Preserve policy; do
not add unrestricted CORS/scripts to make a new hosting shell work. SSO browser redirects are
normal navigation; see dedicated auth contract for minimal CSP adaptations if actually necessary.

## 11. Persistence and failure behavior

DATA_DIR/game.sqlite native DatabaseSync, WAL, synchronousFULL,busytimeout3000. Snapshotid1
version1 JSON plus metadata/audit/lease tables. Unix directory0700/database0600 where supported.
Singlewriter30s lease, renewed5s; secondinstance fails. Unknownsnapshotversion fails, never wipes.
Successful mutations save before200; broadcast save even tick. Storage save/audit failure marksfailed,
stops ticker/streams, failsHTTP503, exits; not allowed to keep unsaved game moving.

Restart: humanconnectedfalse, ALL extractionfalse, legacy tuneddefaults[], running→paused. Existing
eventId/names/titles/unlocks/scores/passes retained; no downtime progress or penalties. SIGTERM/
SIGINT close streams/save/release/close,3s fallback exit. Backups VACUUM INTO, not raw livefilecopy.
Privacy/security caveats and actual test evidence: SECURITY.md/TEST-REPORT.md. Do not promise
uncheatable: server rejects fabricated scores, but public answers/automation/collusion remain possible.
