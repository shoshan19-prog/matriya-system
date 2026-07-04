// Seed mechanism registry — Layer 4 of the V5 vision ("the mechanism is the central
// knowledge unit"). These are the nine mechanism families named in VISION-V5.md.
// POC extraction is deterministic keyword mapping; an LLM extractor can replace
// detectMechanisms() later without touching the entity model.

const MECHANISMS = [
    { key: 'adhesion', name_he: 'הדבקה', name_en: 'Adhesion' },
    { key: 'thermal_decomposition', name_he: 'פירוק תרמי', name_en: 'Thermal decomposition' },
    { key: 'char_formation', name_he: 'יצירת Char', name_en: 'Char formation' },
    { key: 'water_vapor_transport', name_he: 'מעבר אדי מים', name_en: 'Water vapor transport' },
    { key: 'heat_transfer', name_he: 'מעבר חום', name_en: 'Heat transfer' },
    { key: 'dispersion', name_he: 'פיזור', name_en: 'Dispersion' },
    { key: 'catalysis', name_he: 'קטליזה', name_en: 'Catalysis' },
    { key: 'stability', name_he: 'יציבות', name_en: 'Stability' },
    { key: 'material_interaction', name_he: 'אינטראקציות בין חומרים', name_en: 'Material interaction' },
]

// keyword (lowercase) -> mechanism key. Matched against formula + results + materials text.
const KEYWORD_MAP = [
    { pattern: /char|פחם|intumescen|תפיחה/i, key: 'char_formation' },
    { pattern: /adhesion|הדבקה|אדהזיה|bonding|peel/i, key: 'adhesion' },
    { pattern: /thermal decomposition|פירוק תרמי|tga|decompos/i, key: 'thermal_decomposition' },
    { pattern: /vapor|אדי מים|permeab|חדירות/i, key: 'water_vapor_transport' },
    { pattern: /heat transfer|מעבר חום|insulat|בידוד|conductivity/i, key: 'heat_transfer' },
    { pattern: /dispers|פיזור|agglomer|settl/i, key: 'dispersion' },
    { pattern: /cataly|קטליז|קטליט/i, key: 'catalysis' },
    { pattern: /stabil|יציבות|shelf|aging|הזדקנות/i, key: 'stability' },
    { pattern: /interaction|אינטראקצי|compatib|תאימות/i, key: 'material_interaction' },
]

// A material whose role is 'catalyst' implies the catalysis mechanism even without keywords.
const ROLE_MAP = { catalyst: 'catalysis', solvent: 'dispersion' }

function getMechanism(key) {
    return MECHANISMS.find((m) => m.key === key) || null
}

// Deterministic mechanism detection over an experiment's text + material roles.
// Returns an ordered, de-duplicated list of mechanism keys (first match = primary).
function detectMechanisms(experiment, experimentMaterials = []) {
    const text = [
        experiment.formula,
        experiment.results,
        experiment.technology_domain,
        JSON.stringify(experiment.materials || ''),
    ]
        .filter(Boolean)
        .join(' | ')

    const found = []
    for (const { pattern, key } of KEYWORD_MAP) {
        if (pattern.test(text) && !found.includes(key)) found.push(key)
    }
    for (const mat of experimentMaterials) {
        const key = ROLE_MAP[mat.role]
        if (key && !found.includes(key)) found.push(key)
    }
    return found
}

module.exports = { MECHANISMS, getMechanism, detectMechanisms }
