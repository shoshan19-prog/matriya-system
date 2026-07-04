// V5 Core embedding standard — single source of truth (Decision D-007, 2026-07-04).
//
// One standard for the whole V5 Core: OpenAI text-embedding-3-small, 1536 dims.
// Rationale:
//   - matches the live management vector store (management_vector vector(1536))
//   - hosted model: no local model weights on Railway, deterministic across deploys
//   - the 384-dim local store (matriya-back rag_documents) is the MIGRATION candidate,
//     not the standard; do not add new 384-dim tables.
// Any new vector column in V5 Core MUST be vector(EMBEDDING_DIMENSIONS).
module.exports = {
    EMBEDDING_MODEL: 'text-embedding-3-small',
    EMBEDDING_DIMENSIONS: 1536,
    EMBEDDING_PROVIDER: 'openai',
}
