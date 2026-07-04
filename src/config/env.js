require('dotenv').config()

// V5 Core environment contract.
// Two databases, two different trust levels:
//   V5_SUPABASE_*        — the V5 Core's own DB (mechanisms, claims, evidence). Read/write.
//   MANAGEMENT_SUPABASE_* — the management system DB (lab_experiments, materials...). READ-ONLY.
const env = {
    port: process.env.PORT || 3000,

    v5: {
        url: process.env.V5_SUPABASE_URL || process.env.SUPABASE_URL,
        key: process.env.V5_SUPABASE_KEY || process.env.SUPABASE_KEY,
    },

    management: {
        url: process.env.MANAGEMENT_SUPABASE_URL,
        key: process.env.MANAGEMENT_SUPABASE_KEY,
    },
}

function requireV5Db() {
    if (!env.v5.url || !env.v5.key) {
        throw new Error('V5 Core DB not configured: set V5_SUPABASE_URL and V5_SUPABASE_KEY')
    }
    return env.v5
}

function requireManagementDb() {
    if (!env.management.url || !env.management.key) {
        throw new Error('Management bridge not configured: set MANAGEMENT_SUPABASE_URL and MANAGEMENT_SUPABASE_KEY (read-only credentials)')
    }
    return env.management
}

module.exports = { env, requireV5Db, requireManagementDb }
