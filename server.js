// MATRIYA Control Tower — serves the live capability dashboard.
// The registry (capabilities.json) is read on each request so edits show
// up without a restart. Run: npm start  (then open http://localhost:3000)
const express = require('express');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { diagnose } = require('./lib/diagnose');
const ledger = require('./lib/knowledgeLedger');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const REGISTRY = join(__dirname, 'capabilities.json');
const loadRegistry = async () => JSON.parse(await readFile(REGISTRY, 'utf8'));

// Live registry feed — the Control Tower UI reads from here.
app.get('/api/capabilities', async (_req, res) => {
  try {
    res.type('application/json').send(await readFile(REGISTRY, 'utf8'));
  } catch (err) {
    res.status(500).json({ error: 'Cannot read capabilities.json', detail: String(err) });
  }
});

// Diagnosis feed — the "doctor" layer. Explains WHY, derived from the graph.
app.get('/api/diagnosis', async (_req, res) => {
  try {
    res.json(diagnose(await loadRegistry()));
  } catch (err) {
    res.status(500).json({ error: 'Diagnosis failed', detail: String(err) });
  }
});

// Knowledge feed — the balance (Growth) and statement (Timeline), computed live
// from the ledger. This is what lights up the tower's Knowledge-Growth panel.
app.get('/api/knowledge', (_req, res) => {
  try {
    const events = ledger.readAll();
    res.json({ balance: ledger.balance(events), timeline: ledger.timeline(8, events), meta: ledger.meta(events) });
  } catch (err) {
    res.status(500).json({ error: 'Cannot read ledger', detail: String(err) });
  }
});

// Emit point — backends POST real movements here.
app.post('/api/knowledge/events', (req, res) => {
  try {
    res.status(201).json(ledger.append(req.body || {}));
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

// Daily Brief feed — the COO morning report as JSON-wrapped markdown.
app.get('/api/brief', async (_req, res) => {
  try {
    const { execFileSync } = require('node:child_process');
    const date = typeof _req.query.date === 'string' ? _req.query.date : '';
    const args = [join(__dirname, 'scripts', 'daily-brief.js')];
    if (date) args.push(date);
    const text = execFileSync('node', args, { encoding: 'utf8' });
    res.type('text/markdown').send(text);
  } catch (err) {
    res.status(500).json({ error: 'Brief failed', detail: String(err) });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'matriya-control-tower' }));

app.use(express.static(join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`MATRIYA Control Tower → http://localhost:${PORT}`);
});
