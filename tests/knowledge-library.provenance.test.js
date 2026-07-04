// Core-invariant tests for the Industrial Knowledge Library model layer.
// These are pure (no DB) and cover the rules the whole library depends on:
//   1. Nothing without provenance.
//   2. Knowledge Library content is external (Layer 1) only.
//   3. Enum values match the DB CHECK constraints.
// Run with: npm run test:kl   (plain Node, no test framework required)

const assert = require('node:assert')
const m = require('../src/modules/knowledge-library/knowledgeLibrary.model')

let passed = 0
function test(name, fn) {
    fn()
    passed++
    console.log('  ok -', name)
}
function throwsValidation(fn) {
    assert.throws(fn, (e) => e instanceof m.ValidationError && e.status === 400)
}

console.log('knowledge-library model invariants')

// 1. Provenance is mandatory.
test('requireProvenance rejects a missing source_id', () => {
    throwsValidation(() => m.requireProvenance({}))
    throwsValidation(() => m.requireProvenance({ source_id: '' }))
    throwsValidation(() => m.requireProvenance({ source_id: '   ' }))
})
test('requireProvenance accepts a present source_id', () => {
    assert.strictEqual(m.requireProvenance({ source_id: 'abc' }), 'abc')
})

// 2. Layer separation: only external is writable here.
test('assertExternalLayer rejects a non-external layer', () => {
    throwsValidation(() => m.assertExternalLayer({ layer: 'internal' }))
    throwsValidation(() => m.assertExternalLayer({ layer: 'connection' }))
})
test('assertExternalLayer allows external / unspecified', () => {
    assert.doesNotThrow(() => m.assertExternalLayer({}))
    assert.doesNotThrow(() => m.assertExternalLayer({ layer: 'external' }))
})

// 3. Enum guards.
test('assertEnum rejects an unknown knowledge_type', () => {
    throwsValidation(() => m.assertEnum('guessed_mechanism', m.KNOWLEDGE_TYPES, 'knowledge_type'))
})
test('assertEnum accepts a documented knowledge_type', () => {
    assert.doesNotThrow(() => m.assertEnum('mechanism_of_action', m.KNOWLEDGE_TYPES, 'knowledge_type'))
})
test('asset + connection enums are populated and consistent', () => {
    assert.ok(m.ASSET_TYPES.includes('raw_material'))
    assert.ok(m.ASSET_TYPES.includes('standard'))
    assert.ok(m.ASSET_TYPES.includes('patent'))
    assert.ok(m.CONNECTION_STATUSES.includes('hypothesis'))
    assert.ok(m.CONNECTION_KL_REF_TYPES.includes('product'))
})

// requireFields
test('requireFields flags every missing field', () => {
    throwsValidation(() => m.requireFields({ name: 'x' }, ['name', 'company_id']))
    assert.doesNotThrow(() => m.requireFields({ name: 'x', company_id: 'y' }, ['name', 'company_id']))
})

console.log(`\n${passed} passed`)
