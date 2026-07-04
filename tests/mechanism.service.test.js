const test = require('node:test')
const assert = require('node:assert/strict')

const {
    TIER_CAPS,
    deriveTier,
    computeConfidence,
    assertEvidenceGate,
    buildClaimFromExperiment,
} = require('../src/modules/mechanisms/mechanism.service')
const { detectMechanisms } = require('../src/modules/mechanisms/mechanism.registry')
const fixture = require('../src/poc/fixtures/experiment.fixture.json')

const expEvidence = (overrides = {}) => ({
    evidence_type: 'experiment',
    source_system: 'management',
    source_ref: 'uuid-1',
    outcome: 'success',
    stance: 'supports',
    ...overrides,
})

test('LAW-EVIDENCE-001: claim with no evidence is rejected', () => {
    assert.throws(() => assertEvidenceGate([]), /LAW-EVIDENCE-001/)
    assert.throws(() => assertEvidenceGate(undefined), /LAW-EVIDENCE-001/)
})

test('LAW-EVIDENCE-001: evidence link must carry type, system and ref', () => {
    assert.throws(
        () => assertEvidenceGate([{ evidence_type: 'experiment', source_system: 'management' }]),
        /source_ref/
    )
})

test('tier is derived from evidence, not asserted', () => {
    assert.equal(deriveTier([expEvidence()]), 'grounded')
    assert.equal(
        deriveTier([{ evidence_type: 'document', source_system: 'matriya', source_ref: 'd1' }]),
        'strong'
    )
    assert.equal(
        deriveTier([{ evidence_type: 'external', source_system: 'world', source_ref: 'doi:x' }]),
        'inferred'
    )
})

test('confidence never exceeds the tier cap', () => {
    const many = Array.from({ length: 20 }, (_, i) => expEvidence({ source_ref: `uuid-${i}` }))
    assert.ok(computeConfidence(many) <= TIER_CAPS.grounded)

    const manyInferred = Array.from({ length: 20 }, (_, i) => ({
        evidence_type: 'external',
        source_system: 'world',
        source_ref: `doi:${i}`,
        stance: 'supports',
    }))
    assert.ok(computeConfidence(manyInferred) <= TIER_CAPS.inferred)
})

test('contradicting evidence lowers confidence; zero support means zero confidence', () => {
    const base = computeConfidence([expEvidence(), expEvidence({ source_ref: 'uuid-2' })])
    const withContradiction = computeConfidence([
        expEvidence(),
        expEvidence({ source_ref: 'uuid-2' }),
        expEvidence({ source_ref: 'uuid-3', stance: 'contradicts' }),
    ])
    assert.ok(withContradiction < base)
    assert.equal(computeConfidence([expEvidence({ stance: 'contradicts' })]), 0)
})

test('mechanism detection on the fixture finds char formation first', () => {
    const keys = detectMechanisms(fixture.experiment, fixture.experiment_materials)
    assert.equal(keys[0], 'char_formation')
    assert.ok(keys.includes('adhesion'))
})

test('POC-01 pipeline (pure part): fixture experiment -> claim + evidence + confidence', () => {
    const { mechanism, claim, evidenceLinks } = buildClaimFromExperiment(
        fixture.experiment,
        fixture.experiment_materials
    )
    assert.equal(mechanism.key, 'char_formation')
    assert.equal(claim.evidence_tier, 'grounded')
    assert.equal(claim.status, 'proposed')
    assert.ok(claim.confidence > 0 && claim.confidence <= TIER_CAPS.grounded)
    assert.equal(evidenceLinks.length, 1)
    assert.equal(evidenceLinks[0].source_ref, fixture.experiment.id)
    assert.equal(evidenceLinks[0].snapshot.experiment_id, 'EXP-FIXTURE-001')
    assert.match(claim.claim_text, /EXP-FIXTURE-001/)
})

test('experiment with no detectable mechanism is refused, not invented', () => {
    const blank = {
        id: 'u', experiment_id: 'EXP-BLANK', technology_domain: 'x',
        formula: null, results: null, materials: [], experiment_outcome: 'success',
    }
    assert.throws(() => buildClaimFromExperiment(blank, []), /refusing to invent/)
})

test('management DB bridge blocks write verbs', () => {
    process.env.MANAGEMENT_SUPABASE_URL = 'https://example.supabase.co'
    process.env.MANAGEMENT_SUPABASE_KEY = 'test-key'
    const { readOnlyFrom } = require('../src/config/managementDb')
    const table = readOnlyFrom('lab_experiments')
    for (const verb of ['insert', 'update', 'upsert', 'delete']) {
        assert.throws(() => table[verb]({}), /V5-CORE-GUARD/)
    }
    assert.equal(typeof table.select, 'function')
})
