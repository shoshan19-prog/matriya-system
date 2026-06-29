'use strict';
// Diagnosis engine — the "doctor" layer over the Control Tower.
// It does not invent: every cause is DERIVED by walking the declared
// dependency graph in capabilities.json down to a root that has no
// unhealthy dependency of its own. Where the chain bottoms out at an
// 'unknown' capability, it reports honestly that no source of truth
// declares an implementation — rather than guessing.

function buildIndex(reg) {
  const map = new Map();
  for (const c of reg.capabilities) {
    map.set(c.id, {
      kind: 'capability', id: c.id, label: c.name, state: c.status,
      deps: c.dependencies || [], openItems: c.openItems || [], remedy: c.remedy || null,
    });
  }
  for (const k of reg.connections) {
    map.set(k.id, {
      kind: 'connection', id: k.id, label: k.name, state: k.status,
      deps: [], openItems: k.notes ? [k.notes] : [], remedy: k.remedy || null,
    });
  }
  return map;
}

// A node is "healthy" only when fully ready. design/poc/partial/unknown/
// missing are all states the doctor will explain.
const healthy = (node) => !node || node.state === 'ready';

function rootReason(node) {
  if (node.kind === 'capability') {
    if (node.state === 'unknown') return 'No source of truth declares an implementation — existence unverified.';
    if (node.state === 'design') return 'Not built yet — design stage only.';
    if (node.state === 'poc') return 'Prototype only — not productized.';
    if (node.state === 'partial') return node.openItems.join(' ') || 'Partially implemented.';
  } else {
    if (node.state === 'missing') return node.openItems.join(' ') || 'Not configured.';
    if (node.state === 'partial') return node.openItems.join(' ') || 'Partially configured.';
  }
  return 'Unhealthy.';
}

// All root-cause paths from a symptom node, following only unhealthy deps.
// An 'unknown' node is intrinsically terminal: we can't even verify it exists,
// so reasoning about its dependencies is moot — its own status is the root.
function paths(id, map, trail = []) {
  const node = map.get(id);
  if (!node) return [];
  const t = [...trail, node];
  if (node.state === 'unknown') return [t];
  const bad = node.deps.filter(
    (d) => map.get(d) && !healthy(map.get(d)) && !t.some((n) => n.id === d)
  );
  if (!bad.length) return [t]; // leaf root
  return bad.flatMap((d) => paths(d, map, t));
}

function diagnose(reg) {
  const map = buildIndex(reg);
  const rootTally = new Map();
  const findings = [];

  for (const c of reg.capabilities) {
    if (c.status === 'ready') continue;
    const chains = paths(c.id, map).map((path) => {
      const root = path[path.length - 1];
      rootTally.set(root.id, (rootTally.get(root.id) || 0) + 1);
      return {
        steps: path.map((n) => ({ id: n.id, label: n.label, kind: n.kind, state: n.state })),
        root: { id: root.id, label: root.label, state: root.state, reason: rootReason(root), remedy: root.remedy },
      };
    });
    findings.push({ id: c.id, label: c.name, hebrew: c.hebrew, state: c.status, chains });
  }

  const signals = [];
  for (const h of reg.systemHealth || []) {
    if (h.status !== 'ok') signals.push({ kind: 'health', label: h.name, state: h.status, reason: h.notes, remedy: h.remedy || null });
  }
  if (reg.knowledgeGrowth) {
    const pending = reg.knowledgeGrowth.metrics.filter((m) => !m.wired);
    if (pending.length) {
      const blockers = [...new Set(pending.map((m) => {
        const node = map.get(m.blockedBy);
        return node ? `${node.label} (${node.state})` : (m.blockedBy || m.source);
      }))];
      signals.push({
        kind: 'growth',
        label: `Knowledge Growth — ${pending.length}/${reg.knowledgeGrowth.metrics.length} metrics dark`,
        state: 'pending',
        reason: `No live instrumentation. Blocked by: ${blockers.join('; ')}.`,
        remedy: 'Build the Knowledge Events substrate, then expose a metrics endpoint the tower can read.',
      });
    }
  }

  let topRoot = null;
  for (const [id, count] of rootTally) {
    if (!topRoot || count > topRoot.count) topRoot = { id, count, label: (map.get(id) || {}).label, reason: rootReason(map.get(id)) };
  }

  return {
    summary: {
      needAttention: findings.length,
      unknown: reg.capabilities.filter((c) => c.status === 'unknown').length,
      signals: signals.length,
      topRoot,
    },
    findings,
    signals,
  };
}

module.exports = { diagnose };
