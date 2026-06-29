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

## Usage

```bash
npm run render   # regenerate CAPABILITIES.md after editing capabilities.json
```

Read **[CAPABILITIES.md](./CAPABILITIES.md)** first — it's the 30-second map of the whole platform.

## Roadmap (control plane)

1. ✅ **Capability Registry** — `capabilities.json` + rendered view. *(done)*
2. **Control Tower** — a live screen that reads `capabilities.json` and shows Capabilities → Connections → Health → Knowledge Growth in real time.
3. **Knowledge Events** — define the event substrate the Control Tower's "Knowledge Growth" panel needs.

The registry is deliberately the first step: the Control Tower has nothing to render without it.
