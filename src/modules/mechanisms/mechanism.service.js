const { getMechanism, detectMechanisms } = require('./mechanism.registry')

// Evidence tiers and their confidence ceilings.
// LAW-EVIDENCE-001: a claim's confidence may never exceed what its evidence supports.
const TIER_CAPS = { grounded: 0.95, strong: 0.7, inferred: 0.4 }
const DECIDED_OUTCOMES = ['success', 'failure', 'partial', 'production_formula']

// Tier is DERIVED from evidence, never asserted by the caller:
//   grounded — at least one experiment evidence with a decided outcome
//   strong   — document evidence only
//   inferred — external/analogy evidence only
function deriveTier(evidenceLinks) {
    if (
        evidenceLinks.some(
            (e) => e.evidence_type === 'experiment' && DECIDED_OUTCOMES.includes(e.outcome)
        )
    ) {
        return 'grounded'
    }
    if (evidenceLinks.some((e) => e.evidence_type === 'document')) return 'strong'
    return 'inferred'
}

// Deterministic confidence: base 0.35 for the first supporting evidence,
// +0.10 per additional supporting, -0.15 per contradicting, clamped to the tier cap.
function computeConfidence(evidenceLinks) {
    const supporting = evidenceLinks.filter((e) => e.stance !== 'contradicts').length
    const contradicting = evidenceLinks.filter((e) => e.stance === 'contradicts').length
    if (supporting === 0) return 0
    const tier = deriveTier(evidenceLinks)
    const raw = 0.35 + 0.1 * (supporting - 1) - 0.15 * contradicting
    return Math.max(0, Math.min(TIER_CAPS[tier], Number(raw.toFixed(2))))
}

// The gate: no claim exists without evidence. Throws instead of storing.
function assertEvidenceGate(evidenceLinks) {
    if (!Array.isArray(evidenceLinks) || evidenceLinks.length === 0) {
        throw new Error(
            'LAW-EVIDENCE-001: a mechanism claim cannot be created without at least one evidence link'
        )
    }
    for (const e of evidenceLinks) {
        if (!e.evidence_type || !e.source_system || !e.source_ref) {
            throw new Error(
                'LAW-EVIDENCE-001: every evidence link requires evidence_type, source_system and source_ref'
            )
        }
    }
}

// Build a mechanism claim from a REAL experiment row (management DB shape).
// Pure function: no I/O, fully testable. Returns { mechanism, claim, evidenceLinks }.
function buildClaimFromExperiment(experiment, experimentMaterials = [], mechanismKey = null) {
    const detected = detectMechanisms(experiment, experimentMaterials)
    const key = mechanismKey || detected[0]
    if (!key) {
        throw new Error(
            `No mechanism detected for experiment ${experiment.experiment_id} — refusing to invent one (LAW-EVIDENCE-001)`
        )
    }
    const mechanism = getMechanism(key)
    if (!mechanism) throw new Error(`Unknown mechanism key: ${key}`)

    const outcomeHe =
        { success: 'הצלחה', failure: 'כישלון', partial: 'הצלחה חלקית', production_formula: 'פורמולת ייצור' }[
            experiment.experiment_outcome
        ] || experiment.experiment_outcome

    const evidenceLinks = [
        {
            evidence_type: 'experiment',
            source_system: 'management',
            source_ref: experiment.id,
            source_label: experiment.experiment_id,
            outcome: experiment.experiment_outcome,
            stance: 'supports',
            snapshot: {
                experiment_id: experiment.experiment_id,
                technology_domain: experiment.technology_domain,
                formula: experiment.formula,
                results: experiment.results,
                experiment_outcome: experiment.experiment_outcome,
                materials: experimentMaterials,
                captured_from: 'lab_experiments (read-only bridge)',
            },
        },
    ]

    assertEvidenceGate(evidenceLinks)
    const tier = deriveTier(evidenceLinks)
    const confidence = computeConfidence(evidenceLinks)

    const claim = {
        mechanism_key: mechanism.key,
        claim_text:
            `בניסוי ${experiment.experiment_id} (תחום: ${experiment.technology_domain}) ` +
            `נצפתה תוצאה מסוג "${outcomeHe}" התומכת במעורבות מנגנון "${mechanism.name_he}". ` +
            `בסיס: ${experiment.results || experiment.formula || 'נתוני הניסוי'}`,
        status: 'proposed',
        evidence_tier: tier,
        confidence,
        technology_domain: experiment.technology_domain,
        source_system: 'management',
        source_experiment_ref: experiment.id,
        conditions: {
            experiment_outcome: experiment.experiment_outcome,
            detected_mechanisms: detected,
        },
    }

    return { mechanism, claim, evidenceLinks }
}

module.exports = {
    TIER_CAPS,
    deriveTier,
    computeConfidence,
    assertEvidenceGate,
    buildClaimFromExperiment,
}
