# CLAUDE.md — matriya-system

Guidance for Claude Code (and any AI agent) working in this repository. Read this before making changes.

## What this project is

**matriya-system** is the Matriya RAG system backend, currently an **early-stage scaffold**. Most modules are intentionally empty stubs waiting to be implemented — treat them as a skeleton to fill in, not finished code.

- **Runtime:** Node.js, **CommonJS** (`require`/`module.exports` — this repo is *not* ESM).
- **Framework:** Express.js 5.2.1.
- **Database:** Supabase (PostgreSQL + vector), via `@supabase/supabase-js`.
- **Language:** plain JavaScript. No TypeScript — do not add it.
- **Entry point:** `server.js` → `src/app.js`.

## Project structure

```
server.js              # entry; starts Express on PORT (default 3000)
src/
  app.js               # Express app setup
  config/              # env.js, supabase.js, openai.js
  modules/             # documents, chunks, formulations, rag
                       #   each: controller / model / service / routes
  pipeline/            # embed.js, ingest.js, parse.js, store.js  (stubs)
  middleware/          # errorHandler, logger, validateRequest    (stubs)
  utils/               # constants, hash, normalizer              (stubs)
tests/                 # placeholders (determinism, isolation, threshold)
```

Only `documents` currently has a working route (basic CRUD via Supabase). The module pattern is **controller → service → model → routes**; follow it when implementing new modules.

## How to run, build, and verify

```bash
npm start    # node server.js  (listens on PORT, default 3000)
```

There is **no build step, no linter, and no working test suite** yet (`npm test` is a placeholder that errors). Do not pretend these commands exist or claim tests passed — there are none to run. If you add tests, wire up a real test script and say so.

## Configuration

Config is read from environment variables in `src/config/`. Required: `SUPABASE_URL`, `SUPABASE_KEY` (plus `PORT`, optional OpenAI config). There is no `.env.example` yet — consider adding one if you introduce new vars. Never hardcode or commit secrets; `.env*` is gitignored.

## Working agreement (the important part)

1. **Don't over-engineer.** This is a small, early scaffold. Implement exactly what's asked, following the existing controller/service/model/routes pattern. No new frameworks, no TypeScript, no extra dependencies unless the task truly needs them and you've justified it.
2. **Follow instructions and conventions.** CommonJS (not ESM), kebab-case filenames, camelCase functions. Fill in the existing stubs rather than creating parallel structures. Keep Supabase access in services/models, not scattered through routes.
3. **Don't claim done until it's verified.** Because there's no test suite, "done" means you actually started the server and/or exercised the endpoint and observed it work. If you couldn't run it, say so plainly — never report success on unrun code.
4. **Don't invent APIs.** Many files are empty, so do not assume a helper, service method, or route exists — open the file and check. Use only Express/Supabase methods you've confirmed. Don't guess Supabase table/column names; verify against the actual schema.
5. **Surface uncertainty.** Much of this repo is unbuilt. If the task depends on a stub that isn't implemented yet, say so and propose the smallest path forward instead of guessing.

## Git

- Develop on branch `claude/new-session-ydal7p`.
- Clear, descriptive commit messages. Do not open a PR unless explicitly asked.
- Never commit secrets or `.env`.
