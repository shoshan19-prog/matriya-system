# matriya-system — MATRIYA V5 Core

**Engine core only.** This repo is the home of MATRIYA V5's truth engines:
knowledge entities (mechanisms, claims, evidence) and the engines that produce them.

- Charter, entry test, embedding standard, POC-01: [`docs/V5-CORE.md`](docs/V5-CORE.md)
- Canonical vision: `matriya-front-/MATRIYA/VISION-V5.md`
- Mechanism Entity schema: [`sql/001_v5_core_mechanisms.sql`](sql/001_v5_core_mechanisms.sql)

## Quick start

```bash
npm install
npm test               # pure-logic tests, no DB needed
npm run poc:01:dry     # POC-01 pipeline on a fixture, no DB needed
cp .env.example .env   # fill in both DB configs
npm run poc:01         # POC-01 LIVE: real experiment -> persisted mechanism entity
npm start              # GET /health, GET /api/mechanisms, GET /api/mechanisms/claims
```

## Hard rules

1. **Read-only bridge**: the management DB (lab_experiments, materials) is never written to from here — enforced in code (`V5-CORE-GUARD`) and by ops (read-only key).
2. **One embedding standard**: `text-embedding-3-small`, `vector(1536)`. No new 384-dim tables.
3. **LAW-EVIDENCE-001**: no claim without evidence; confidence is capped by the evidence tier, which is derived from the evidence itself.
4. **Gate**: no Layer 3 (world knowledge ingestion) and no hypothesis generation before POC-01 runs live end-to-end.

Previous state of this repo (an empty RAG scaffold — ~30 zero-byte files) was removed on 2026-07-04 per the V5 Core revival decision.
