# matriya-system — MATRIYA Platform Control Plane

This repository is the **control plane** for the MATRIYA platform. It does not run product
features — it holds the **single source of truth for what the platform _is_**: which
capabilities exist, how mature they are, what they're wired to, and whether the system is healthy.

It exists because the most important finding of the platform inventory was not "there are 5
repositories" — it was **"there is no single source of truth for the state of capabilities."**
This repo fixes that.

> **History:** this repo began as an attempt to extract RAG out of `matriya-back` into a fresh
> modular service. `matriya-back` matured into the real product first, so that migration stalled.
> Rather than archive or delete the repo, it has been **repurposed as the platform control plane.**
> The dormant `src/` skeleton is kept only until the Control Tower lands, then removed.

## What's here

| File | Role |
|---|---|
| **`capabilities.json`** | **Source of truth.** Machine-readable registry of every capability, connection, repo and health check. Edit this. |
| **`CAPABILITIES.md`** | Human-readable view, **generated** from the JSON. Never edit by hand. |
| `scripts/render-capabilities.mjs` | Renders the MD from the JSON. |
| `server.js` + `public/` | **Control Tower** — live dashboard (Diagnosis → Capabilities → Connections → Knowledge Growth → Health → Repos). |
| `lib/diagnose.js` | **Diagnosis engine** — walks the dependency graph and explains *why* the platform is where it is. |
| `scripts/diagnose.js` | Prints the diagnosis to the terminal; exits non-zero on any `unknown` capability (CI gate). |

## Usage

```bash
npm install
npm start        # Control Tower at http://localhost:3000
npm run render   # regenerate CAPABILITIES.md after editing capabilities.json
npm run diagnose # print the "why" — cause chains to root, for terminal/CI
npm run brief    # MATRIYA Daily Brief — COO morning report (verified-only, UNKNOWN otherwise)
```

The **Daily Brief** (`npm run brief`, or `GET /api/brief`) is a 3–5 minute morning read:
system health, what changed, knowledge growth, the single bottleneck, and the one mission
with the biggest leverage today. It reports verified reality only — anything it cannot
verify is printed `UNKNOWN`, never guessed. It gets rich the moment the ledger goes live.

Read **[CAPABILITIES.md](./CAPABILITIES.md)** first — it's the 30-second map of the whole platform.

## The three layers

1. **Registry** (`capabilities.json`) — *the book of organs.* What exists, how mature, wired to what. Source of truth.
2. **Control Tower** (`server.js` + `public/`) — *the nervous system.* Sees the whole state at a glance, live.
3. **Diagnosis** (`lib/diagnose.js`) — *the doctor.* Doesn't just show 39°C; explains why. Derives cause chains from the declared graph; where there is no source of truth, it says so (UNKNOWN) rather than guessing.

## Roadmap (control plane)

1. ✅ **Capability Registry** — `capabilities.json` + rendered view.
2. ✅ **Control Tower** — live dashboard reading the registry.
3. ✅ **Diagnosis layer** — derived cause chains + remedies.
4. **Knowledge Events** — define the event substrate that lights up the dark Knowledge-Growth metrics (it is, per the diagnosis, the most blocking root).

Each layer reads the one below it; none invents data the registry doesn't declare.
