// Industrial Knowledge Library — service layer.
// All Supabase access lives here. Every write funnels through the model
// validators so the invariants (provenance + layer separation + enums) hold
// regardless of which route called in. This layer only ever touches kl_*
// tables — it never reads or writes existing MATRIYA / Fresco data.

const supabase = require('../../config/supabase')
const m = require('./knowledgeLibrary.model')

// Small helper: run a Supabase insert and surface a clean error/row.
async function insertOne(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) {
        const err = new Error(error.message)
        err.status = 400
        err.details = error
        throw err
    }
    return data
}

async function verifySourceExists(sourceId) {
    const { data, error } = await supabase
        .from('kl_source').select('id').eq('id', sourceId).maybeSingle()
    if (error) {
        const err = new Error(error.message)
        err.status = 400
        throw err
    }
    if (!data) {
        const err = new m.ValidationError(
            `Provenance not found: no kl_source with id "${sourceId}". ` +
            `Create the source before recording facts against it.`
        )
        throw err
    }
}

// ---- Sources (provenance) --------------------------------------------------
async function createSource(body) {
    m.requireFields(body, ['source_url', 'document_title', 'document_type', 'retrieval_date'])
    m.assertEnum(body.document_type, m.DOCUMENT_TYPES, 'document_type')
    if (body.confidence) m.assertEnum(body.confidence, m.CONFIDENCE_LEVELS, 'confidence')
    return insertOne('kl_source', {
        source_url: body.source_url,
        document_title: body.document_title,
        document_type: body.document_type,
        publisher: body.publisher ?? null,
        retrieval_date: body.retrieval_date,
        confidence: body.confidence ?? 'medium',
        content_hash: body.content_hash ?? null,
        notes: body.notes ?? null,
    })
}

async function listSources() {
    const { data, error } = await supabase
        .from('kl_source').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
}

// ---- Companies -------------------------------------------------------------
async function createCompany(body) {
    m.assertExternalLayer(body)
    m.requireFields(body, ['name'])
    return insertOne('kl_company', {
        name: body.name,
        aliases: body.aliases ?? [],
        country: body.country ?? null,
        website: body.website ?? null,
        website_source_id: body.website_source_id ?? null,
    })
}

async function listCompanies() {
    const { data, error } = await supabase
        .from('kl_company').select('*').order('name')
    if (error) throw error
    return data
}

// ---- Product families ------------------------------------------------------
async function createFamily(body) {
    m.assertExternalLayer(body)
    m.requireFields(body, ['company_id', 'name'])
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_product_family', {
        company_id: body.company_id,
        name: body.name,
        description: body.description ?? null,
        source_id: sourceId,
    })
}

async function listFamilies(companyId) {
    const { data, error } = await supabase
        .from('kl_product_family').select('*')
        .eq('company_id', companyId).order('name')
    if (error) throw error
    return data
}

// ---- Products --------------------------------------------------------------
async function createProduct(body) {
    m.assertExternalLayer(body)
    m.requireFields(body, ['company_id', 'product_name'])
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_product', {
        company_id: body.company_id,
        family_id: body.family_id ?? null,
        product_name: body.product_name,
        brand: body.brand ?? null,
        product_code: body.product_code ?? null,
        version: body.version ?? null,
        release_date: body.release_date ?? null,
        canonical_product_id: body.canonical_product_id ?? null,
        source_id: sourceId,
    })
}

async function listProducts(filters = {}) {
    let q = supabase.from('kl_product').select('*')
    if (filters.company_id) q = q.eq('company_id', filters.company_id)
    if (filters.family_id) q = q.eq('family_id', filters.family_id)
    const { data, error } = await q.order('product_name')
    if (error) throw error
    return data
}

// Assemble the full product view exactly as the spec's output structure asks:
// Identity / Classification / Properties / Functional Roles / Compatible
// Systems / Application Domains / Documents / Knowledge / Provenance.
async function getProductFull(productId) {
    const { data: product, error } = await supabase
        .from('kl_product').select('*').eq('id', productId).maybeSingle()
    if (error) throw error
    if (!product) return null

    const [
        company, family, source,
        classifications, functionalRoles, properties,
        compatibleSystems, applicationDomains, documents, knowledge, assetLinks,
    ] = await Promise.all([
        supabase.from('kl_company').select('*').eq('id', product.company_id).maybeSingle(),
        product.family_id
            ? supabase.from('kl_product_family').select('*').eq('id', product.family_id).maybeSingle()
            : Promise.resolve({ data: null }),
        supabase.from('kl_source').select('*').eq('id', product.source_id).maybeSingle(),
        supabase.from('kl_classification').select('*').eq('product_id', productId),
        supabase.from('kl_functional_role').select('*').eq('product_id', productId),
        supabase.from('kl_property').select('*').eq('product_id', productId),
        supabase.from('kl_compatible_system').select('*').eq('product_id', productId),
        supabase.from('kl_application_domain').select('*').eq('product_id', productId),
        supabase.from('kl_document').select('*').eq('product_id', productId),
        supabase.from('kl_knowledge').select('*').eq('product_id', productId),
        supabase.from('kl_asset_link').select('*, kl_knowledge_asset(*)').eq('product_id', productId),
    ])

    return {
        identity: {
            id: product.id,
            company: company.data?.name ?? null,
            brand: product.brand,
            product_family: family.data?.name ?? null,
            product_name: product.product_name,
            product_code: product.product_code,
            version: product.version,
            release_date: product.release_date,
            canonical_product_id: product.canonical_product_id,
        },
        classification: classifications.data ?? [],
        properties: properties.data ?? [],
        functional_roles: functionalRoles.data ?? [],
        compatible_systems: compatibleSystems.data ?? [],
        application_domains: applicationDomains.data ?? [],
        documents: documents.data ?? [],
        knowledge: knowledge.data ?? [],
        ecosystem_links: assetLinks.data ?? [],
        provenance: source.data ?? null,
    }
}

// ---- Product attributes (generic; each requires provenance) ----------------
async function addProductAttribute(segment, productId, body) {
    const map = m.PRODUCT_ATTRIBUTE_TABLES[segment]
    if (!map) {
        const err = new m.ValidationError(`Unknown attribute type: "${segment}".`)
        throw err
    }
    m.requireFields(body, ['value'])
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne(map.table, {
        product_id: productId,
        [map.valueColumn]: body.value,
        source_id: sourceId,
    })
}

async function addProperty(productId, body) {
    m.requireFields(body, ['name', 'value_text'])
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_property', {
        product_id: productId,
        name: body.name,
        value_text: body.value_text,
        value_num: body.value_num ?? null,  // only if the source states one number
        unit: body.unit ?? null,
        test_method: body.test_method ?? null,
        source_id: sourceId,
    })
}

async function addDocument(productId, body) {
    m.requireFields(body, ['document_type', 'title', 'url'])
    m.assertEnum(body.document_type, m.PRODUCT_DOCUMENT_TYPES, 'document_type')
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_document', {
        product_id: productId,
        document_type: body.document_type,
        title: body.title,
        url: body.url,
        source_id: sourceId,
    })
}

async function addKnowledge(productId, body) {
    m.requireFields(body, ['knowledge_type', 'content'])
    m.assertEnum(body.knowledge_type, m.KNOWLEDGE_TYPES, 'knowledge_type')
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_knowledge', {
        product_id: productId,
        knowledge_type: body.knowledge_type,
        content: body.content,
        source_id: sourceId,
    })
}

// ---- Ecosystem assets ------------------------------------------------------
async function createAsset(body) {
    m.assertExternalLayer(body)
    m.requireFields(body, ['asset_type', 'name'])
    m.assertEnum(body.asset_type, m.ASSET_TYPES, 'asset_type')
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_knowledge_asset', {
        asset_type: body.asset_type,
        name: body.name,
        identifier: body.identifier ?? null,
        code: body.code ?? null,
        publisher: body.publisher ?? null,
        jurisdiction: body.jurisdiction ?? null,
        description: body.description ?? null,
        source_id: sourceId,
    })
}

async function listAssets(filters = {}) {
    let q = supabase.from('kl_knowledge_asset').select('*')
    if (filters.asset_type) q = q.eq('asset_type', filters.asset_type)
    const { data, error } = await q.order('name')
    if (error) throw error
    return data
}

async function createAssetLink(body) {
    m.requireFields(body, ['asset_id', 'relation_type'])
    m.assertEnum(body.relation_type, m.ASSET_RELATION_TYPES, 'relation_type')
    const hasProduct = !!body.product_id
    const hasAsset = !!body.related_asset_id
    if (hasProduct === hasAsset) {
        throw new m.ValidationError(
            'An asset link must target exactly one of product_id or related_asset_id.'
        )
    }
    const sourceId = m.requireProvenance(body)
    await verifySourceExists(sourceId)
    return insertOne('kl_asset_link', {
        asset_id: body.asset_id,
        product_id: body.product_id ?? null,
        related_asset_id: body.related_asset_id ?? null,
        relation_type: body.relation_type,
        source_id: sourceId,
    })
}

// ---- Layer 3 connections (hypotheses) --------------------------------------
async function createConnection(body) {
    m.requireFields(body, [
        'kl_ref_type', 'kl_ref_id', 'fresco_ref_type', 'fresco_ref_id', 'relation_type',
    ])
    m.assertEnum(body.kl_ref_type, m.CONNECTION_KL_REF_TYPES, 'kl_ref_type')
    m.assertEnum(body.relation_type, m.CONNECTION_RELATION_TYPES, 'relation_type')
    if (body.confidence) m.assertEnum(body.confidence, m.CONFIDENCE_LEVELS, 'confidence')
    // New connections are always hypotheses; validation is a separate step.
    if (body.status && body.status !== 'hypothesis') {
        throw new m.ValidationError(
            'A new connection starts as "hypothesis". Validate it later via ' +
            'PATCH /connections/:id — connections are hypotheses until validated.'
        )
    }
    return insertOne('kl_connection', {
        kl_ref_type: body.kl_ref_type,
        kl_ref_id: body.kl_ref_id,
        fresco_ref_type: body.fresco_ref_type,   // loose text; never a FK
        fresco_ref_id: body.fresco_ref_id,       // loose text; never a FK
        relation_type: body.relation_type,
        rationale: body.rationale ?? null,
        status: 'hypothesis',
        confidence: body.confidence ?? 'low',
        source_id: body.source_id ?? null,
        created_by: body.created_by ?? null,
    })
}

async function listConnections(filters = {}) {
    let q = supabase.from('kl_connection').select('*')
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.kl_ref_id) q = q.eq('kl_ref_id', filters.kl_ref_id)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    return data
}

// Validate or reject a hypothesis. This is the only path that changes status.
async function reviewConnection(id, body) {
    m.requireFields(body, ['status'])
    if (!['validated', 'rejected'].includes(body.status)) {
        throw new m.ValidationError('status must be "validated" or "rejected".')
    }
    const patch = {
        status: body.status,
        validated_by: body.validated_by ?? null,
        validated_at: new Date().toISOString(),
    }
    if (body.confidence) {
        m.assertEnum(body.confidence, m.CONFIDENCE_LEVELS, 'confidence')
        patch.confidence = body.confidence
    }
    const { data, error } = await supabase
        .from('kl_connection').update(patch).eq('id', id).select().single()
    if (error) {
        const err = new Error(error.message)
        err.status = 400
        throw err
    }
    return data
}

module.exports = {
    createSource, listSources,
    createCompany, listCompanies,
    createFamily, listFamilies,
    createProduct, listProducts, getProductFull,
    addProductAttribute, addProperty, addDocument, addKnowledge,
    createAsset, listAssets, createAssetLink,
    createConnection, listConnections, reviewConnection,
}
