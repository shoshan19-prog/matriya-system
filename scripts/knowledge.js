#!/usr/bin/env node
'use strict';
// Print the Knowledge balance + recent timeline. Run: npm run ledger
const ledger = require('../lib/knowledgeLedger');

const events = ledger.readAll();
const b = ledger.balance(events);
const m = ledger.meta(events);

console.log('\nMATRIYA · Knowledge Ledger\n' + '='.repeat(40));
console.log(`Documents ${b.documents}  ·  Evidence ${b.evidence}  ·  Intents ${b.intents}  ·  Open Questions ${b.questions}  ·  Events ${b.events}`);
console.log(m.seeded ? '(seeded sample data — backends not yet emitting)' : '(live)');

console.log('\nRecent movements\n' + '-'.repeat(40));
for (const e of ledger.timeline(10, events)) {
  const sign = e.delta > 0 ? '+' : '';
  console.log(`${e.ts.slice(0, 10)}  ${sign}${e.delta}  ${e.type.padEnd(18)} ${e.subject}  [${e.source}]`);
}
console.log('');
