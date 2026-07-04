#!/usr/bin/env node
// POC-01 — one LIVE Mechanism Entity, end to end.
//
//   source : a REAL experiment from the management DB (read-only bridge)
//   output : mechanism_claim + evidence_links + confidence, persisted in the V5 Core DB
//
// Usage:
//   node src/poc/poc01-mechanism.js                  # live run (needs both DB envs)
//   node src/poc/poc01-mechanism.js --experiment <uuid>
//   node src/poc/poc01-mechanism.js --dry-run        # fixture in, no DB writes, prints result
//
// Gate (decision 2026-07-04): Layer 3 ingestion and hypothesis/N generation do NOT start
// before this POC produces one real mechanism entity end-to-end.

const { buildClaimFromExperiment } = require('../modules/mechanisms/mechanism.service')

async function loadRealExperiment(experimentId) {
    const reader = require('../sources/managementReader')
    const experiment = experimentId
        ? await reader.getExperimentById(experimentId)
        : await reader.pickPocExperiment()
    if (!experiment) {
        throw new Error(
            'POC-01: no eligible experiment found in the management DB (need a decided outcome with a formula)'
        )
    }
    const materials = await reader.getExperimentMaterials(experiment.id)
    return { experiment, experiment_materials: materials }
}

function loadFixture() {
    return require('./fixtures/experiment.fixture.json')
}

async function persist(result) {
    const model = require('../modules/mechanisms/mechanism.model')
    const mechanismRow = await model.upsertMechanism(result.mechanism)
    const claimRow = await model.insertClaim(mechanismRow.id, result.claim)
    const evidenceRows = await model.insertEvidenceLinks(claimRow.id, result.evidenceLinks)
    return { mechanismRow, claimRow, evidenceRows }
}

async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')
    const expFlag = args.indexOf('--experiment')
    const experimentId = expFlag !== -1 ? args[expFlag + 1] : null

    console.log(`POC-01 Mechanism Entity — ${dryRun ? 'DRY RUN (fixture, no writes)' : 'LIVE'}`)

    const { experiment, experiment_materials } = dryRun
        ? loadFixture()
        : await loadRealExperiment(experimentId)

    console.log(`source experiment: ${experiment.experiment_id} (${experiment.technology_domain}, outcome=${experiment.experiment_outcome})`)

    const result = buildClaimFromExperiment(experiment, experiment_materials)

    const output = {
        mechanism: result.mechanism,
        mechanism_claim: result.claim,
        evidence_links: result.evidenceLinks,
        confidence: result.claim.confidence,
        evidence_tier: result.claim.evidence_tier,
    }

    if (dryRun) {
        console.log(JSON.stringify(output, null, 2))
        console.log('\nDRY RUN complete — nothing persisted.')
        return
    }

    const persisted = await persist(result)
    output.persisted = {
        mechanism_id: persisted.mechanismRow.id,
        claim_id: persisted.claimRow.id,
        evidence_link_ids: persisted.evidenceRows.map((r) => r.id),
    }
    console.log(JSON.stringify(output, null, 2))
    console.log('\nPOC-01 complete — one live Mechanism Entity persisted end-to-end.')
}

main().catch((err) => {
    console.error(`POC-01 failed: ${err.message}`)
    process.exit(1)
})
