const { createClient } = require('@supabase/supabase-js')
const { requireV5Db } = require('./env')

// V5 Core's OWN database (mechanisms, mechanism_claims, evidence_links). Read/write.
let client = null

function v5Db() {
    if (!client) {
        const { url, key } = requireV5Db()
        client = createClient(url, key)
    }
    return client
}

module.exports = { v5Db }
