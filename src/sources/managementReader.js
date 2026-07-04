const { readOnlyFrom } = require('../config/managementDb')

// Read-only access to Layer 1-2 reality data living in the management system.
// This is the ONLY module allowed to touch the management DB.

const EXPERIMENT_COLUMNS =
    'id, project_id, experiment_id, experiment_version, technology_domain, formula, materials, percentages, results, experiment_outcome, is_production_formula, parent_experiment_id, source_file_reference, created_at'

async function getExperimentById(id) {
    const { data, error } = await readOnlyFrom('lab_experiments')
        .select(EXPERIMENT_COLUMNS)
        .eq('id', id)
        .maybeSingle()
    if (error) throw new Error(`managementReader.getExperimentById: ${error.message}`)
    return data
}

// Pick a real experiment for POC-01: prefer a decided outcome with actual content.
async function pickPocExperiment() {
    const { data, error } = await readOnlyFrom('lab_experiments')
        .select(EXPERIMENT_COLUMNS)
        .in('experiment_outcome', ['success', 'failure', 'production_formula'])
        .not('formula', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
    if (error) throw new Error(`managementReader.pickPocExperiment: ${error.message}`)
    return data && data[0] ? data[0] : null
}

async function getExperimentMaterials(experimentUuid) {
    const { data, error } = await readOnlyFrom('experiment_materials')
        .select('material_id, role, percentage')
        .eq('experiment_id', experimentUuid)
    if (error) throw new Error(`managementReader.getExperimentMaterials: ${error.message}`)
    return data || []
}

async function getMaterialsInfo(materialIds) {
    if (!materialIds.length) return []
    const { data, error } = await readOnlyFrom('materials')
        .select('material_id, material_name, material_family, material_role, technology_domain')
        .in('material_id', materialIds)
    if (error) throw new Error(`managementReader.getMaterialsInfo: ${error.message}`)
    return data || []
}

module.exports = { getExperimentById, pickPocExperiment, getExperimentMaterials, getMaterialsInfo }
