'use strict';
// Knowledge Ledger — the append-only event store. Movements in; balance is
// always COMPUTED from them, never stored (the bank-statement model).
const { readFileSync, appendFileSync, existsSync, mkdirSync } = require('node:fs');
const { join, dirname } = require('node:path');

// Default: the committed seed file (good for local/demo). In production set
// KNOWLEDGE_LEDGER_PATH to a file on a mounted volume so the ledger starts
// empty (real events only) and persists across redeploys.
const LEDGER = process.env.KNOWLEDGE_LEDGER_PATH || join(__dirname, '..', 'data', 'knowledge-ledger.jsonl');

// The four signed buckets. `events` (total movements) is computed separately.
const BUCKETS = ['documents', 'evidence', 'intents', 'questions'];

// Allowed event types and how each moves the ledger.
const TYPES = {
  'document.ingested': { category: 'documents', delta: 1 },
  'document.removed':  { category: 'documents', delta: -1 },
  'evidence.attached': { category: 'evidence',  delta: 1 },
  'intent.declared':   { category: 'intents',   delta: 1 },
  'intent.fulfilled':  { category: 'intents',   delta: -1 },
  'question.opened':   { category: 'questions', delta: 1 },
  'question.resolved': { category: 'questions', delta: -1 },
};

function readAll() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// Knowledge Growth = a reduce over the ledger. Not a stored datum.
function balance(events = readAll()) {
  const b = { documents: 0, evidence: 0, intents: 0, questions: 0, events: events.length };
  for (const e of events) {
    if (BUCKETS.includes(e.category) && typeof e.delta === 'number') b[e.category] += e.delta;
  }
  return b;
}

function timeline(limit = 10, events = readAll()) {
  return [...events].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}

// Append a real movement. Backends call this at their emit points.
function append({ type, subject = '', source = 'manual', payload }, now) {
  const spec = TYPES[type];
  if (!spec) throw new Error(`Unknown event type: ${type}. Allowed: ${Object.keys(TYPES).join(', ')}`);
  const events = readAll();
  const id = 'ke_' + String(events.length + 1).padStart(6, '0');
  const event = {
    id,
    ts: now || new Date().toISOString(),
    type,
    category: spec.category,
    delta: spec.delta,
    subject,
    source,
    ...(payload ? { payload } : {}),
  };
  try { mkdirSync(dirname(LEDGER), { recursive: true }); } catch (_) {}
  appendFileSync(LEDGER, JSON.stringify(event) + '\n');
  return event;
}

function meta(events = readAll()) {
  const seeded = events.length > 0 && events.every((e) => e.source === 'seed');
  return {
    count: events.length,
    seeded,
    note: seeded
      ? 'Ledger is running on seeded sample events. Real backends (matriya-back, maneger-back) do not yet emit — wire the emit points (see docs/KNOWLEDGE-EVENTS.md).'
      : 'Ledger contains real appended events.',
    lastTs: events.length ? timeline(1, events)[0].ts : null,
  };
}

module.exports = { readAll, balance, timeline, append, meta, TYPES, BUCKETS };
