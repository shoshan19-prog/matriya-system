#!/usr/bin/env node
'use strict';
// Prints the diagnosis to the terminal. Useful in CI: exits non-zero if any
// capability is 'unknown' (an undeclared/unverified part of the platform).
// Run: npm run diagnose
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { diagnose } = require('../lib/diagnose');

const reg = JSON.parse(readFileSync(join(__dirname, '..', 'capabilities.json'), 'utf8'));
const d = diagnose(reg);

const arrow = ' → ';
console.log('\nMATRIYA · Diagnosis\n' + '='.repeat(40));
const t = d.summary.topRoot;
console.log(`${d.summary.needAttention} capabilities need attention · ${d.summary.unknown} unknown · ${d.summary.signals} system signals`);
if (t) console.log(`Most blocking root: ${t.label} ×${t.count} — ${t.reason}`);

console.log('\nCAPABILITIES\n' + '-'.repeat(40));
for (const f of d.findings) {
  console.log(`\n● ${f.label} [${f.state.toUpperCase()}]`);
  for (const ch of f.chains) {
    const trail = ch.steps.map((s) => s.label).join(arrow);
    console.log(`  ${trail}`);
    console.log(`    ↳ root: ${ch.root.reason}`);
    if (ch.root.remedy) console.log(`    ↳ fix:  ${ch.root.remedy}`);
  }
}

if (d.signals.length) {
  console.log('\nSYSTEM SIGNALS\n' + '-'.repeat(40));
  for (const s of d.signals) {
    console.log(`\n▲ ${s.label} [${s.state}]`);
    console.log(`  ${s.reason}`);
    if (s.remedy) console.log(`  ↳ fix: ${s.remedy}`);
  }
}
console.log('');

// CI gate: an 'unknown' capability means the registry is out of sync with reality.
process.exit(d.summary.unknown > 0 ? 1 : 0);
