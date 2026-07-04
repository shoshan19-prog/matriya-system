// Industrial Knowledge Library — model layer.
// Pure constants + validators. No DB access here so the core invariants
// (mandatory provenance, layer separation, allowed enum values) can be unit
// tested in isolation and reused by the service/controller.

// Enumerations kept in sync with db/knowledge_library_schema.sql.
const DOCUMENT_TYPES = [
    'tds', 'sds', 'brochure', 'product_selector', 'product_page',
    'technical_manual', 'white_paper', 'application_guide',
    'standard', 'patent', 'scientific_article', 'other',
]

// Documents attached to a product are a narrower set (no standard/patent/article).
const PRODUCT_DOCUMENT_TYPES = [
    'tds', 'sds', 'brochure', 'product_selector', 'product_page',
    'technical_manual', 'white_paper', 'application_guide', 'other',
]

const CONFIDENCE_LEVELS = ['high', 'medium', 'low']

const KNOWLEDGE_TYPES = [
    'mechanism_of_action', 'advantage', 'limitation', 'compatibility',
    'known_interaction', 'environmental_limitation',
    'temperature_limitation', 'moisture_limitation',
]

const ASSET_TYPES = [
    'raw_material', 'commercial_product_ref', 'mechanism', 'standard',
    'lab_equipment', 'test_method', 'manufacturing_process',
    'patent', 'scientific_article',
]

const ASSET_RELATION_TYPES = [
    'contains', 'tested_per', 'conforms_to', 'explains',
    'produced_by', 'described_in', 'related_to',
]

const CONNECTION_KL_REF_TYPES = ['product', 'knowledge_asset']

const CONNECTION_RELATION_TYPES = [
    'analogous_to', 'candidate_substitute', 'benchmark_for',
    'explains_result', 'potential_ingredient', 'related_to',
]

const CONNECTION_STATUSES = ['hypothesis', 'validated', 'rejected']

// Attribute tables that each require a source_id (mandatory provenance).
// Maps a public route segment -> its physical table + free-text value column.
const PRODUCT_ATTRIBUTE_TABLES = {
    classifications: { table: 'kl_classification', valueColumn: 'value' },
    'functional-roles': { table: 'kl_functional_role', valueColumn: 'value' },
    'compatible-systems': { table: 'kl_compatible_system', valueColumn: 'value' },
    'application-domains': { table: 'kl_application_domain', valueColumn: 'value' },
}

class ValidationError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ValidationError'
        this.status = 400
    }
}

// The single most important rule: nothing may exist without provenance.
// Every write that records a fact must carry a source_id.
function requireProvenance(body, field = 'source_id') {
    const value = body && body[field]
    if (!value || typeof value !== 'string' || value.trim() === '') {
        throw new ValidationError(
            `Missing provenance: "${field}" is required. Every fact in the ` +
            `Knowledge Library must cite a kl_source. Create the source first ` +
            `via POST /api/knowledge-library/sources.`
        )
    }
    return value
}

function requireFields(body, fields) {
    const missing = fields.filter((f) => {
        const v = body && body[f]
        return v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
    })
    if (missing.length) {
        throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`)
    }
}

function assertEnum(value, allowed, field) {
    if (!allowed.includes(value)) {
        throw new ValidationError(
            `Invalid ${field}: "${value}". Allowed: ${allowed.join(', ')}.`
        )
    }
}

// Layer guard: Knowledge Library content is Layer 1 (external) by definition.
// Reject any attempt to smuggle a different layer in through a write payload.
function assertExternalLayer(body) {
    if (body && body.layer !== undefined && body.layer !== 'external') {
        throw new ValidationError(
            `Layer violation: Knowledge Library entities are external (Layer 1) ` +
            `only. Internal Fresco knowledge (Layer 2) must never be written ` +
            `here; cross-layer relationships belong in kl_connection (Layer 3).`
        )
    }
}

module.exports = {
    DOCUMENT_TYPES,
    PRODUCT_DOCUMENT_TYPES,
    CONFIDENCE_LEVELS,
    KNOWLEDGE_TYPES,
    ASSET_TYPES,
    ASSET_RELATION_TYPES,
    CONNECTION_KL_REF_TYPES,
    CONNECTION_RELATION_TYPES,
    CONNECTION_STATUSES,
    PRODUCT_ATTRIBUTE_TABLES,
    ValidationError,
    requireProvenance,
    requireFields,
    assertEnum,
    assertExternalLayer,
}
