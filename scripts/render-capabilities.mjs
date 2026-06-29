#!/usr/bin/env node
// Renders CAPABILITIES.md (human view) from capabilities.json (source of truth).
// Run: npm run render
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'capabilities.json'), 'utf8'));

const STATUS_ICON = { ready: '✅', partial: '🟡', poc: '🟢', design: '🔵', unknown: '⚪' };
const STATUS_WORD = { ready: 'READY', partial: 'PARTIAL', poc: 'POC', design: 'DESIGN', unknown: 'UNKNOWN' };
const LAYER_ICON = { yes: '✅', partial: '🟡', no: '—', na: 'n/a' };
const HEALTH_ICON = { ok: '✅', warning: '⚠️', missing: '❌' };
const CONN_ICON = { ready: '✅', partial: '🟡', missing: '❌' };

const layer = (v) => LAYER_ICON[v] ?? v;
const sIcon = (s) => STATUS_ICON[s] ?? s;

const lines = [];
const p = (s = '') => lines.push(s);

p('# MATRIYA — Capability Registry');
p();
p('> **Generated file — do not edit by hand.** Source of truth: `capabilities.json`. Regenerate with `npm run render`.');
p(`> Platform: **${data.meta.platform}** · As of: **${data.meta.asOf}** · Control plane: **${data.meta.controlPlaneRepo}**`);
p();
p(data.meta.purpose);
p();

// --- Capabilities table ---
p('## Capabilities');
p();
p('| Capability | Status | Backend | Frontend | API | DB | Repos |');
p('|---|---|:--:|:--:|:--:|:--:|---|');
for (const c of data.capabilities) {
  const l = c.layers;
  p(`| **${c.name}** <br/><sub>${c.hebrew}</sub> | ${sIcon(c.status)} ${STATUS_WORD[c.status]} | ${layer(l.backend)} | ${layer(l.frontend)} | ${layer(l.api)} | ${layer(l.db)} | ${c.repos.join(', ') || '—'} |`);
}
p();

// --- Capability detail ---
p('## Capability detail');
p();
for (const c of data.capabilities) {
  p(`### ${sIcon(c.status)} ${c.name} — ${c.hebrew}`);
  p(c.summary);
  if (c.dependencies?.length) p(`- **Depends on:** ${c.dependencies.join(', ')}`);
  if (c.openItems?.length) {
    p(`- **Open items:**`);
    for (const o of c.openItems) p(`  - ${o}`);
  }
  p();
}

// --- Connections ---
p('## Connections');
p();
p('| Connection | Status | Used by | Notes |');
p('|---|---|---|---|');
for (const c of data.connections) {
  p(`| **${c.name}** | ${CONN_ICON[c.status] ?? c.status} ${c.status} | ${(c.usedBy || []).join(', ')} | ${c.notes || ''} |`);
}
p();

// --- Repositories ---
p('## Repositories');
p();
p('| Repo | Maturity | Role | Primary capabilities |');
p('|---|---|---|---|');
for (const r of data.repositories) {
  p(`| **${r.name}** | ${r.maturity} | ${r.role} | ${(r.primaryCapabilities || []).join(', ') || '—'} |`);
}
p();

// --- System health ---
p('## System health');
p();
p('| Check | Status | Notes |');
p('|---|---|---|');
for (const h of data.systemHealth) {
  p(`| **${h.name}** | ${HEALTH_ICON[h.status] ?? h.status} ${h.status} | ${h.notes || ''} |`);
}
p();

// --- Roll-up ---
const counts = data.capabilities.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
p('## Roll-up');
p();
p(Object.entries(counts).map(([s, n]) => `${sIcon(s)} ${STATUS_WORD[s]}: **${n}**`).join(' · '));
p();
p('---');
p(`_Rendered from capabilities.json. ${data.capabilities.length} capabilities, ${data.connections.length} connections, ${data.repositories.length} repositories._`);

writeFileSync(join(root, 'CAPABILITIES.md'), lines.join('\n') + '\n');
console.log(`✓ CAPABILITIES.md rendered (${data.capabilities.length} capabilities).`);
