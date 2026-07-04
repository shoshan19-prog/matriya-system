const { v5Db } = require('../../config/supabase')

// Persistence for the Mechanism Entity (V5 Core DB). Schema: sql/001_v5_core_mechanisms.sql

async function upsertMechanism(mechanism) {
    const { data, error } = await v5Db()
        .from('mechanisms')
        .upsert(
            {
                mechanism_key: mechanism.key,
                name_he: mechanism.name_he,
                name_en: mechanism.name_en,
            },
            { onConflict: 'mechanism_key' }
        )
        .select()
        .single()
    if (error) throw new Error(`mechanism.model.upsertMechanism: ${error.message}`)
    return data
}

async function insertClaim(mechanismRowId, claim) {
    const { data, error } = await v5Db()
        .from('mechanism_claims')
        .insert({
            mechanism_id: mechanismRowId,
            claim_text: claim.claim_text,
            status: claim.status,
            evidence_tier: claim.evidence_tier,
            confidence: claim.confidence,
            technology_domain: claim.technology_domain,
            source_system: claim.source_system,
            source_experiment_ref: claim.source_experiment_ref,
            conditions: claim.conditions,
        })
        .select()
        .single()
    if (error) throw new Error(`mechanism.model.insertClaim: ${error.message}`)
    return data
}

async function insertEvidenceLinks(claimRowId, evidenceLinks) {
    const rows = evidenceLinks.map((e) => ({
        claim_id: claimRowId,
        evidence_type: e.evidence_type,
        source_system: e.source_system,
        source_ref: e.source_ref,
        source_label: e.source_label || null,
        outcome: e.outcome || null,
        stance: e.stance || 'supports',
        snapshot: e.snapshot || null,
    }))
    const { data, error } = await v5Db().from('evidence_links').insert(rows).select()
    if (error) throw new Error(`mechanism.model.insertEvidenceLinks: ${error.message}`)
    return data
}

async function listMechanisms() {
    const { data, error } = await v5Db()
        .from('mechanisms')
        .select('*')
        .order('mechanism_key')
    if (error) throw new Error(`mechanism.model.listMechanisms: ${error.message}`)
    return data || []
}

async function listClaims(mechanismKey) {
    let query = v5Db()
        .from('mechanism_claims')
        .select('*, mechanisms!inner(mechanism_key, name_he, name_en), evidence_links(*)')
        .order('created_at', { ascending: false })
    if (mechanismKey) query = query.eq('mechanisms.mechanism_key', mechanismKey)
    const { data, error } = await query
    if (error) throw new Error(`mechanism.model.listClaims: ${error.message}`)
    return data || []
}

module.exports = { upsertMechanism, insertClaim, insertEvidenceLinks, listMechanisms, listClaims }
