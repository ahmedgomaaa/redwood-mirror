# Repository instructions

Read MODEL_HANDOFF.md and DEPLOYMENT.md before deployment work. This is an existing app,
not a request to redesign it. Preserve the simulation, server-authoritative scoring, immutable
identities/titles, host-controlled progression, phone HUD and per-level extraction gate.

Use Node 24, one replica and a persistent local SQLite volume. Never replace storage with memory
or deploy the app as a static site. Never add a real AI service without a new explicit human request.
Do not weaken tests or authentication to accommodate a hosting environment. Adapt infrastructure
settings first; add the smallest tested fix if a demonstrated compatibility bug needs code changes.

Before handoff run npm test, npm run test:load and npm run check:release. Keep .env, data/, databases,
backups and private logs out of public commits. ART-PROMPTS.md records asset provenance; the art is
already generated and included, so do not treat it as a task to regenerate assets.

Do not publish, spend money, create cloud resources or message another task unless the human has
authorized that action. Report real failures and unverified deployment gates; never claim zero bugs.
