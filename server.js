// MATRIYA Control Tower — serves the live capability dashboard.
// The registry (capabilities.json) is read on each request so edits show
// up without a restart. Run: npm start  (then open http://localhost:3000)
const express = require('express');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { diagnose } = require('./lib/diagnose');

const app = express();
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'matriya-control-tower' }));

app.use(express.static(join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`MATRIYA Control Tower → http://localhost:${PORT}`);
});
