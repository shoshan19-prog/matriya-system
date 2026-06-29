# Knowledge Events — the substrate

> The doctor found the root: nothing higher (Growth, Decision, Reports, Evolution) can
> live until knowledge **movements** are recorded. This is that substrate — the electricity
> before the TV, the heartbeat before the pulse graph.

## The ledger model

A **Knowledge Event** is an immutable transaction — like a line in a bank statement.
You never store a "balance"; you store the movements, and the balance is *computed*.

```
Knowledge Events   →   the movements   (+1 document, +1 evidence, −1 open question…)
Knowledge Growth   →   the balance     (a reduction over the ledger — never stored)
Timeline           →   the statement   (the ledger, in order)
Decision / Reports →   derived views   (read the ledger; emit nothing)
Evolution          →   the trend graph (needs history first — hence it waits)
```

This is why one capability lights up many: the moment the ledger has movements, Growth,
Timeline, Diagnosis-of-growth, and later Decision/Reports all have something to read.

## Event schema

```jsonc
{
  "id":       "ke_000123",                 // append-only sequence
  "ts":       "2026-06-29T20:00:00.000Z",  // ISO timestamp
  "type":     "document.ingested",          // dotted event type (see below)
  "category": "documents",                  // which balance bucket it moves
  "delta":    1,                            // +1 / -1 ledger movement
  "subject":  "final_report.pdf",           // short human label
  "source":   "matriya-back",               // emitting repo / 'manual' / 'seed'
  "payload":  { }                            // optional extra context
}
```

## Event types → balance buckets

| type | category | delta | emitted by |
|---|---|:--:|---|
| `document.ingested` | documents | +1 | matriya-back `/ingest/*`, maneger-back file upload |
| `document.removed`  | documents | −1 | matriya-back `DELETE /documents` |
| `evidence.attached` | evidence  | +1 | matriya-back decision_audit (chunk → claim) |
| `intent.declared`   | intents   | +1 | maneger-back lab (engineering intent) |
| `intent.fulfilled`  | intents   | −1 | maneger-back lab |
| `question.opened`   | questions | +1 | research session / lab |
| `question.resolved` | questions | −1 | research session / lab |

`Knowledge Events` (the count) = every ledger line. The other four metrics are signed sums.

## Derivation (the balance is a reduce, not a column)

```
balance.documents = Σ delta where category = documents
balance.evidence  = Σ delta where category = evidence
balance.intents   = Σ delta where category = intents
balance.questions = Σ delta where category = questions   // = OPEN questions
balance.events    = ledger.length                         // total movements
```

See `lib/knowledgeLedger.js` for the implementation and `GET /api/knowledge` for the live feed.

## Status & what's still open

This substrate is a **POC inside the control plane**: the ledger, the schema, the balance
derivation and the live feed all work, and the Control Tower's Knowledge-Growth panel reads
from them. What's **not** done yet — and the honest next step — is wiring the **emit points**:
matriya-back and maneger-back must POST events into the ledger at the moments in the table
above. Until then the ledger runs on **seeded sample events** (`source: "seed"`), clearly
marked, so the mechanism is visibly alive without pretending the real backends are feeding it.

```
POST /api/knowledge/events     # append a real event (this is the emit endpoint backends call)
GET  /api/knowledge            # { balance, timeline, meta } — what the tower reads
npm run ledger                 # print the balance + recent timeline to the terminal
```
