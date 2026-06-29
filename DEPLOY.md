# Deploying the Control Plane

The Control Tower is a plain Express app whose ledger is an append-only JSONL file.
That append needs a **persistent disk** — so deploy on **Railway** (not Vercel, whose
serverless filesystem is ephemeral and would lose every appended event).

## Step 1 — deploy to Railway

1. Railway → **New Project → Deploy from GitHub repo** → pick `matriya-system`, branch
   `claude/inventory-count-actions-wqmidz` (or `main` once merged).
2. Railway reads `railway.json` automatically: `npm start`, health check on `/health`.
3. **Add a Volume** (Service → Settings → Volumes) mounted at e.g. `/data`. This is what
   makes the ledger survive redeploys.
4. Set env var on the service:
   ```
   KNOWLEDGE_LEDGER_PATH=/data/knowledge-ledger.jsonl
   ```
   With this set, the ledger starts **empty** (no seed) and fills with real events only —
   exactly what you want for the observation phase. Leave it unset to keep the seeded demo.
5. Deploy. Note the public URL, e.g. `https://matriya-system-production.up.railway.app`.
   Open it — you should see the Control Tower; the Knowledge-Growth panel reads `0`s on a
   fresh volume (correct — no real events yet).

## Step 2 — point the backends at it

In **both** backends' production env (Vercel dashboard → Settings → Environment Variables),
set the same URL and redeploy:

```
KNOWLEDGE_LEDGER_URL=https://matriya-system-production.up.railway.app
```

- matriya-back → emits `document.ingested`, `document.removed`
- maneger-back → emits `document.ingested`, `document.removed`, `question.opened`, `intent.declared`

The emitter is a no-op until this is set, so nothing changes until you flip it on.

## Step 3 — observe (2–3 days)

Use the apps normally. Each upload / experiment / research session appends a movement.
Watch them accumulate in the Control Tower's Knowledge-Growth panel and ledger timeline,
or from the terminal:

```bash
npm run ledger      # balance + recent movements
```

## Step 4 onward (later)

Only after real events are flowing: wire `evidence.attached` (intentionally deferred), and
promote the JSONL ledger to a DB table for durable production storage. See `meta.plan` in
`capabilities.json` — the registry remembers this roadmap.

## Verify before flipping it on

```bash
curl https://<railway-url>/health           # {"status":"ok",...}
curl https://<railway-url>/api/knowledge     # { balance, timeline, meta }
# smoke-test the emit endpoint end to end:
curl -X POST https://<railway-url>/api/knowledge/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"document.ingested","subject":"smoke test","source":"manual"}'
```
