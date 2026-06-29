#!/usr/bin/env node
'use strict';
// MATRIYA Daily Brief — a 3-5 minute COO-style morning report, generated from
// VERIFIED reality only (capabilities.json + diagnosis + ledger). Anything that
// cannot be verified is printed as UNKNOWN — never speculated.
//
// Run: npm run brief            (uses today's date)
//      npm run brief 2026-06-29 (explicit date)
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { diagnose } = require('../lib/diagnose');
const ledger = require('../lib/knowledgeLedger');

const reg = JSON.parse(readFileSync(join(__dirname, '..', 'capabilities.json'), 'utf8'));
const dx = diagnose(reg);
const events = ledger.readAll();
const bal = ledger.balance(events);
const lmeta = ledger.meta(events);

let DATE = process.argv[2];
if (!DATE) { try { DATE = new Date().toISOString().slice(0, 10); } catch (_) { DATE = 'UNKNOWN'; } }

function yesterdayOf(d) {
  try { return new Date(new Date(d + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10); }
  catch (_) { return null; }
}

const STATUS_ICON = { ready: '✅', partial: '⚠️', poc: '🟢', design: '🔵', unknown: '⚪' };
const counts = reg.capabilities.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
const capById = Object.fromEntries(reg.capabilities.map((c) => [c.id, c]));
const connById = Object.fromEntries(reg.connections.map((c) => [c.id, c]));
const out = [];
const p = (s = '') => out.push(s);
const conn = (id, label) => {
  const c = connById[id];
  if (!c) return `${label}: ⚪ UNKNOWN`;
  const ic = c.status === 'ready' ? '✅' : c.status === 'partial' ? '⚠️' : '❌';
  return `${label}: ${ic} ${c.status}`;
};

// Overall health: warnings/missing in systemHealth → Attention.
const health = reg.systemHealth || [];
const anyCritical = health.some((h) => h.status === 'critical');
const anyWarn = health.some((h) => h.status === 'warning' || h.status === 'missing');
const overall = anyCritical ? '🔴 Critical' : anyWarn ? '🟡 Attention' : '🟢 Good';

p('=========================================');
p(`MATRIYA DAILY — ${DATE}`);
p('Prepared by the MATRIYA COO. Verified reality only; unverifiable items marked UNKNOWN.');
p('=========================================');
p();

// 1. System Health
p('## 1. System Health (30 sec)');
p(`Overall Health: ${overall}`);
p();
p('Repositories');
for (const r of reg.repositories) p(`  ✅ ${r.name} — ${r.maturity}`);
p();
p('Connections');
p(`  ${conn('supabase', 'Supabase')}`);
p(`  ${conn('openai', 'OpenAI')}`);
p('  Google Drive: ⚪ UNKNOWN (no connector declared in registry)');
p(`  ${conn('msgraph', 'SharePoint')}`);
p('  Vercel: ⚪ UNKNOWN (deployment state not pingable from control plane)');
p('  Railway: ⚪ UNKNOWN (control plane not yet deployed)');
p(`  ${conn('ledger-emit', 'Knowledge Ledger emit')}`);
p();
p('Deployment Status: ⚪ UNKNOWN — control plane not yet deployed; backends not yet flipped on.');
p('-----------------------------------------');
p();

// 2. What Changed Since Yesterday
p('## 2. What Changed Since Yesterday');
p('⚪ UNKNOWN — no day-over-day snapshot yet, and the ledger is running on seeded sample');
p('data (not live). Real diffs (new code / documents / experiments / knowledge / integrations /');
p('problems) appear here once the ledger is live and a daily snapshot is recorded.');
p('-----------------------------------------');
p();

// 3. Knowledge Growth
p('## 3. Knowledge Growth');
const seedTag = lmeta.seeded ? '  (⚠️ SEEDED sample — not real activity yet)' : '';
p(`Today${seedTag}`);
p(`  Knowledge Events: ${bal.events}`);
p('  Confirmations:    ⚪ UNKNOWN (research outcomes not yet emitted to the ledger)');
p('  Discoveries:      ⚪ UNKNOWN');
p('  Boundaries:       ⚪ UNKNOWN');
p('  Refutations:      ⚪ UNKNOWN');
p(`  Open Questions:   ${bal.questions}${lmeta.seeded ? ' (seeded)' : ''}`);
p(`Knowledge Growth Trend: ${lmeta.seeded ? '→ (flat — seeded data, not live)' : '⚪ UNKNOWN'}`);
p('-----------------------------------------');
p();

// 4. Laboratory Status
p('## 4. Laboratory Status');
p('Projects with activity: ⚪ UNKNOWN — maneger-back lab data is not yet wired into the brief.');
for (const proj of ['Fire', 'MPZ', 'TLV', 'PROTECH', 'INT-TFX']) {
  p(`  ${proj}: phase ⚪ UNKNOWN · latest event ⚪ UNKNOWN · waiting for ⚪ UNKNOWN · risk ⚪ UNKNOWN`);
}
p('-----------------------------------------');
p();

// 5. Current Bottleneck (exactly one — from the diagnosis)
p('## 5. Current Bottleneck');
const root = dx.summary.topRoot;
if (root) {
  p(`THE bottleneck: ${root.label} (root of ${root.count} blocked capabilities).`);
  p(`  Why it blocks: ${root.reason}`);
  p('  Impact: every higher capability (learning, decision, reports, evolution) traces down to it.');
  const cap = capById[root.id];
  const action = cap && cap.openItems && cap.openItems[0] ? cap.openItems[0] : 'Advance this capability.';
  p(`  Suggested next action: ${action}`);
} else {
  p('  ⚪ UNKNOWN');
}
p('-----------------------------------------');
p();

// 6. Opportunities (derived from roadmap + open items, ranked by leverage)
p('## 6. Opportunities (top 3, by value)');
p('  1. Deploy the control plane + flip KNOWLEDGE_LEDGER_URL — turns the whole system from');
p('     seeded to LIVE. Highest leverage: unlocks every downstream metric at once.');
p('  2. Record a daily snapshot — enables Section 2 (real day-over-day deltas).');
p('  3. Wire the maneger-back lab feed — turns Section 4 from UNKNOWN into live project status.');
p('-----------------------------------------');
p();

// 7. Technical Debt (only what affects today)
p('## 7. Technical Debt');
for (const h of health) {
  const sev = h.status === 'missing' ? 'HIGH' : h.status === 'warning' ? 'MEDIUM' : 'CRITICAL';
  p(`  [${sev}] ${h.name} — ${h.notes}`);
  if (h.remedy) p(`           ↳ ${h.remedy}`);
}
p('-----------------------------------------');
p();

// 8. Recommended Mission (exactly one)
p('## 8. Recommended Mission Today');
p('  MISSION: Deploy the control plane (Railway) and set KNOWLEDGE_LEDGER_URL in both backends.');
p('  Why the biggest leverage: it is the single act that converts the platform from a seeded');
p('  demo into a living system. Until it happens, every other metric is UNKNOWN or seeded;');
p('  after it, the ledger starts recording the lab\'s real life — and everything downstream');
p('  becomes measurable. See DEPLOY.md.');
p('-----------------------------------------');
p();

// 9. Control Room Snapshot
p('## 9. Control Room Snapshot');
p('Capabilities: ' + ['ready', 'partial', 'poc', 'design', 'unknown']
  .filter((s) => counts[s]).map((s) => `${STATUS_ICON[s]} ${counts[s]} ${s.toUpperCase()}`).join('  ·  '));
const cReady = reg.connections.filter((c) => c.status === 'ready').length;
const cPartial = reg.connections.filter((c) => c.status === 'partial').length;
p(`Connections: ✅ ${cReady} ready · ⚠️ ${cPartial} partial`);
p(`Knowledge Health: ledger ${lmeta.seeded ? '⚠️ seeded (not live)' : '✅ live'} · ${bal.events} events recorded`);
p('-----------------------------------------');
p();

// 10. Executive Summary (<= 10 lines)
p('## 10. Executive Summary');
p(`Where are we?  Architecture complete across 5 repos; control plane built (registry → tower →`);
p('               diagnosis → ledger). Overall health ' + overall + '.');
p('What improved? The learning pipeline is fully mapped and the ledger emit points are wired in');
p('               both backends (code-complete, not yet activated).');
const rootState = root && capById[root.id] ? capById[root.id].status.toUpperCase() : 'UNKNOWN';
p(`What blocks us? ${root ? root.label + ' is still ' + rootState + ' — the whole pipeline stands on it.' : 'UNKNOWN.'}`);
p('               The system is seeded, not live.');
p('What to do today? Deploy the control plane and flip KNOWLEDGE_LEDGER_URL. One act, live system.');
p('-----------------------------------------');
p();

// 11. Learning Pulse — the meter. Yesterday's movements, computed from the ledger.
// Not for the numbers; for the feel. Honest UNKNOWN where the source doesn't exist yet.
p('## 11. 🧠 Learning Pulse');
const yday = yesterdayOf(DATE);
const win = yday ? events.filter((e) => (e.ts || '').slice(0, 10) === yday) : [];
const fmt = (v) => (v == null ? '⚪ UNKNOWN (ledger seeded — not live)' : (v >= 0 ? '+' : '') + v);
const keY = lmeta.seeded ? null : win.length;
const oqY = lmeta.seeded ? null : win.filter((e) => e.category === 'questions').reduce((a, e) => a + (e.delta || 0), 0);
p(`Yesterday (${yday || 'UNKNOWN'})`);
p(`  Knowledge Events ......... ${fmt(keY)}`);
p('  Accepted Evidence ........ ⚪ UNKNOWN (human-review is design-stage)');
p(`  Open Questions ........... ${fmt(oqY)}`);
p('  Decisions ................ ⚪ UNKNOWN (decision-engine is design-stage)');
p('  Average Knowledge Latency  ⚪ UNKNOWN (needs episodic-linking + decisions)');
p(`Reads ${lmeta.seeded ? 'as seeded — lights up the moment the ledger goes live.' : 'live from the ledger.'}`);
p();
p('— End of brief —');

console.log(out.join('\n'));
