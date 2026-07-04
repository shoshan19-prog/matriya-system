const { createClient } = require('@supabase/supabase-js')
const { requireManagementDb } = require('./env')

// READ-ONLY bridge to the management system DB (lab_experiments, experiment_materials,
// materials, experiment_relations). Entry-test rule #3: V5 Core never writes there.
//
// Enforcement is layered:
//   1. This module never exposes the raw client — only readOnlyFrom().
//   2. Write verbs on the query builder throw V5-CORE-GUARD before any network call.
//   3. Ops layer: the MANAGEMENT_SUPABASE_KEY should itself be a read-only key/role.

const WRITE_VERBS = ['insert', 'update', 'upsert', 'delete', 'rpc']

let client = null

function rawClient() {
    if (!client) {
        const { url, key } = requireManagementDb()
        client = createClient(url, key)
    }
    return client
}

function readOnlyFrom(table) {
    const builder = rawClient().from(table)
    return new Proxy(builder, {
        get(target, prop) {
            if (WRITE_VERBS.includes(prop)) {
                throw new Error(`V5-CORE-GUARD: "${String(prop)}" is blocked — the management DB bridge is read-only`)
            }
            const value = target[prop]
            return typeof value === 'function' ? value.bind(target) : value
        },
    })
}

module.exports = { readOnlyFrom, WRITE_VERBS }
