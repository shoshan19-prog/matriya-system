-- ============================================================================
-- MATRIYA — Industrial Knowledge Library (KL) schema
-- ============================================================================
-- Purpose
--   A structured, reusable knowledge base describing external industrial
--   materials, technologies, product families and the surrounding technical
--   ecosystem (raw materials, mechanisms, standards, test methods, patents,
--   scientific articles, ...). It is meant to COMPLEMENT — never replace or
--   mix with — Fresco's internal knowledge (formulations, experiments,
--   projects) that lives in the management system (lab_experiments,
--   material_library, research_sessions, ...).
--
-- Design invariants (enforced in the DB where possible; see also the API layer)
--   1. READ-ONLY toward existing MATRIYA/Fresco data.
--      Every object here is a NEW `kl_*` table. Nothing below references,
--      alters or depends on any existing MATRIYA table. There is intentionally
--      NO foreign key from `kl_*` into Fresco tables.
--   2. NOTHING WITHOUT PROVENANCE.
--      Every fact-bearing row carries a NOT NULL `source_id` -> kl_source.
--      A fact that cannot cite a source cannot be stored.
--   3. NEVER INFER.
--      Property/knowledge rows store only what a document states. There is no
--      column that implies a computed/derived value; missing = absent, not 0.
--   4. STRICT LAYER SEPARATION (three independent layers).
--        Layer 1 — External Industrial Knowledge  -> all `kl_*` content tables
--                  (guarded by `layer = 'external'` CHECK constraints).
--        Layer 2 — Fresco Internal Knowledge       -> NOT in this schema. It
--                  stays in the management system and is never copied here.
--        Layer 3 — Connections                      -> `kl_connection` only.
--                  A connection is a HYPOTHESIS linking a Layer 1 entity to a
--                  Layer 2 record by a LOOSE reference (text), never a FK, so
--                  the two knowledge bases stay physically separate. A
--                  connection is `hypothesis` until explicitly validated.
--
-- Conventions
--   * Postgres / Supabase. Idempotent: safe to re-run (CREATE ... IF NOT EXISTS).
--   * All timestamps are TIMESTAMPTZ default now().
--   * `layer` columns are literally pinned to 'external' — they exist to make
--     the invariant explicit and machine-checked, not to allow other values.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Provenance (Layer-1 backbone) — every fact points here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kl_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Where the fact came from. Prefer official manufacturer sources.
  source_url TEXT NOT NULL,
  document_title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'tds',                 -- Technical Data Sheet
    'sds',                 -- Safety Data Sheet
    'brochure',
    'product_selector',
    'product_page',
    'technical_manual',
    'white_paper',
    'application_guide',
    'standard',            -- ASTM / EN / ISO document
    'patent',
    'scientific_article',
    'other'
  )),
  publisher TEXT,                 -- e.g. manufacturer, standards body, journal
  retrieval_date DATE NOT NULL,   -- when the source was captured
  -- Confidence in the *source/extraction*, not an inferred fact.
  confidence TEXT NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  content_hash TEXT,              -- optional: hash of the retrieved document
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Same URL can back many facts; dedupe identical captures.
  UNIQUE (source_url, document_title, retrieval_date)
);
CREATE INDEX IF NOT EXISTS kl_source_type_idx ON kl_source(document_type);
CREATE INDEX IF NOT EXISTS kl_source_url_idx  ON kl_source(source_url);

-- ----------------------------------------------------------------------------
-- 1. Hierarchy: Company -> Product Family -> Product
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kl_company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer TEXT NOT NULL DEFAULT 'external' CHECK (layer = 'external'),
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',       -- e.g. {"Master Builders Solutions","MBS"}
  country TEXT,
  website TEXT,
  website_source_id UUID REFERENCES kl_source(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS kl_product_family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer TEXT NOT NULL DEFAULT 'external' CHECK (layer = 'external'),
  company_id UUID NOT NULL REFERENCES kl_company(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, name)
);
CREATE INDEX IF NOT EXISTS kl_product_family_company_idx ON kl_product_family(company_id);

CREATE TABLE IF NOT EXISTS kl_product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer TEXT NOT NULL DEFAULT 'external' CHECK (layer = 'external'),
  company_id UUID NOT NULL REFERENCES kl_company(id) ON DELETE CASCADE,
  family_id UUID REFERENCES kl_product_family(id) ON DELETE SET NULL,
  -- Identity
  product_name TEXT NOT NULL,
  brand TEXT,
  product_code TEXT,
  version TEXT,
  release_date DATE,
  -- Deduplication across versions: point older/variant rows at the canonical
  -- product. NULL = this row is (currently) canonical.
  canonical_product_id UUID REFERENCES kl_product(id) ON DELETE SET NULL,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- One row per (company, product name, version). Different versions are kept
  -- as distinct rows and tied together via canonical_product_id (dedup rule).
  UNIQUE (company_id, product_name, COALESCE(version, ''))
);
CREATE INDEX IF NOT EXISTS kl_product_company_idx   ON kl_product(company_id);
CREATE INDEX IF NOT EXISTS kl_product_family_idx    ON kl_product(family_id);
CREATE INDEX IF NOT EXISTS kl_product_canonical_idx ON kl_product(canonical_product_id)
  WHERE canonical_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS kl_product_name_idx      ON kl_product(lower(product_name));

-- ----------------------------------------------------------------------------
-- 2. Product attributes. Each row is a documented fact -> NOT NULL source_id.
--    Free-text `value` columns hold ONLY what the source states (no inference).
-- ----------------------------------------------------------------------------

-- Classification (Silane, Polycarboxylate, Defoamer, Intumescent Additive, ...)
CREATE TABLE IF NOT EXISTS kl_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, value)
);
CREATE INDEX IF NOT EXISTS kl_classification_product_idx ON kl_classification(product_id);
CREATE INDEX IF NOT EXISTS kl_classification_value_idx   ON kl_classification(lower(value));

-- Functional role (Water Repellent, Char Former, Binder, UV Resistance, ...)
CREATE TABLE IF NOT EXISTS kl_functional_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, value)
);
CREATE INDEX IF NOT EXISTS kl_functional_role_product_idx ON kl_functional_role(product_id);
CREATE INDEX IF NOT EXISTS kl_functional_role_value_idx   ON kl_functional_role(lower(value));

-- Documented properties. Store the value verbatim as text; the optional
-- numeric split is provided ONLY when the source gives a single numeric value,
-- purely to enable querying — it is never inferred or unit-converted.
CREATE TABLE IF NOT EXISTS kl_property (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  name TEXT NOT NULL,             -- Density, pH, Solid Content, VOC, Fire Rating...
  value_text TEXT NOT NULL,       -- exact text as documented ("approx. 1.05 g/cm3")
  value_num NUMERIC,              -- optional, only if the source states one number
  unit TEXT,                      -- as documented
  test_method TEXT,               -- e.g. "ISO 2811" if the source cites it
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kl_property_product_idx ON kl_property(product_id);
CREATE INDEX IF NOT EXISTS kl_property_name_idx    ON kl_property(lower(name));

-- Compatible systems (Cement, Gypsum, Silicate Paint, Epoxy, EIFS, Mortars...)
CREATE TABLE IF NOT EXISTS kl_compatible_system (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, value)
);
CREATE INDEX IF NOT EXISTS kl_compatible_system_product_idx ON kl_compatible_system(product_id);

-- Application domains (Facades, Concrete Repair, Tunnel Coatings, Waterproofing)
CREATE TABLE IF NOT EXISTS kl_application_domain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, value)
);
CREATE INDEX IF NOT EXISTS kl_application_domain_product_idx ON kl_application_domain(product_id);

-- Document links (TDS / SDS / manuals / brochures) attached to a product.
CREATE TABLE IF NOT EXISTS kl_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'tds','sds','brochure','product_selector','product_page',
    'technical_manual','white_paper','application_guide','other'
  )),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, url)
);
CREATE INDEX IF NOT EXISTS kl_document_product_idx ON kl_document(product_id);

-- Knowledge layer: reusable engineering knowledge, documented only.
CREATE TABLE IF NOT EXISTS kl_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES kl_product(id) ON DELETE CASCADE,
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
    'mechanism_of_action',
    'advantage',
    'limitation',
    'compatibility',
    'known_interaction',
    'environmental_limitation',
    'temperature_limitation',
    'moisture_limitation'
  )),
  content TEXT NOT NULL,          -- documented statement; never invented
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kl_knowledge_product_idx ON kl_knowledge(product_id);
CREATE INDEX IF NOT EXISTS kl_knowledge_type_idx    ON kl_knowledge(knowledge_type);

-- ----------------------------------------------------------------------------
-- 3. Broader ecosystem (Industrial Knowledge Library expansion)
--    Beyond products: raw materials, mechanisms, standards, lab equipment,
--    test methods, manufacturing processes, patents, scientific articles.
--    One flexible, provenance-bound table + a generic link table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kl_knowledge_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer TEXT NOT NULL DEFAULT 'external' CHECK (layer = 'external'),
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'raw_material',
    'commercial_product_ref',
    'mechanism',
    'standard',                -- ASTM / EN / ISO
    'lab_equipment',
    'test_method',
    'manufacturing_process',
    'patent',
    'scientific_article'
  )),
  name TEXT NOT NULL,
  -- Stable external identifier when one exists: "ASTM C494", "EN 998-1",
  -- "ISO 2811", a patent number, a DOI, a CAS number, ...
  identifier TEXT,
  code TEXT,
  publisher TEXT,               -- standards body / patent office / journal
  jurisdiction TEXT,            -- for patents/standards
  description TEXT,             -- documented summary only
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (asset_type, name, COALESCE(identifier, ''))
);
CREATE INDEX IF NOT EXISTS kl_knowledge_asset_type_idx ON kl_knowledge_asset(asset_type);
CREATE INDEX IF NOT EXISTS kl_knowledge_asset_ident_idx ON kl_knowledge_asset(lower(identifier));
CREATE INDEX IF NOT EXISTS kl_knowledge_asset_name_idx  ON kl_knowledge_asset(lower(name));

-- Link an asset to a product and/or to another asset (all within Layer 1).
-- e.g. product --tested_per--> test_method, product --conforms_to--> standard,
--      mechanism --explains--> product, product --contains--> raw_material.
CREATE TABLE IF NOT EXISTS kl_asset_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES kl_knowledge_asset(id) ON DELETE CASCADE,
  product_id UUID REFERENCES kl_product(id) ON DELETE CASCADE,
  related_asset_id UUID REFERENCES kl_knowledge_asset(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'contains',
    'tested_per',
    'conforms_to',
    'explains',
    'produced_by',
    'described_in',
    'related_to'
  )),
  source_id UUID NOT NULL REFERENCES kl_source(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- An asset link must point at exactly one target (a product OR another asset).
  CONSTRAINT kl_asset_link_one_target CHECK (
    (product_id IS NOT NULL AND related_asset_id IS NULL) OR
    (product_id IS NULL AND related_asset_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS kl_asset_link_asset_idx   ON kl_asset_link(asset_id);
CREATE INDEX IF NOT EXISTS kl_asset_link_product_idx ON kl_asset_link(product_id);
CREATE INDEX IF NOT EXISTS kl_asset_link_related_idx ON kl_asset_link(related_asset_id);

-- ----------------------------------------------------------------------------
-- 4. Layer 3 — Connections (hypotheses between external KL and Fresco internal).
--    CRITICAL: no FK into Fresco tables. The internal side is referenced only
--    by loose text (fresco_ref_type + fresco_ref_id), so the two knowledge
--    bases stay physically separate and external data is never merged in.
--    A connection is a hypothesis until explicitly validated.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kl_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- External (Layer 1) side: which kl_* entity this connection touches.
  kl_ref_type TEXT NOT NULL CHECK (kl_ref_type IN ('product','knowledge_asset')),
  kl_ref_id UUID NOT NULL,
  -- Internal (Layer 2) side: LOOSE reference only. Never a foreign key.
  -- e.g. fresco_ref_type='lab_experiment', fresco_ref_id='EXP-2024-017'
  fresco_ref_type TEXT NOT NULL,
  fresco_ref_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'analogous_to',       -- external tech resembles an internal approach
    'candidate_substitute',
    'benchmark_for',
    'explains_result',
    'potential_ingredient',
    'related_to'
  )),
  rationale TEXT,                 -- why the hypothesis was proposed
  -- Lifecycle: hypotheses stay hypotheses until a human validates/rejects them.
  status TEXT NOT NULL DEFAULT 'hypothesis'
    CHECK (status IN ('hypothesis','validated','rejected')),
  confidence TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence IN ('high','medium','low')),
  -- Optional: the external source that motivated the hypothesis.
  source_id UUID REFERENCES kl_source(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  UNIQUE (kl_ref_type, kl_ref_id, fresco_ref_type, fresco_ref_id, relation_type)
);
CREATE INDEX IF NOT EXISTS kl_connection_kl_ref_idx     ON kl_connection(kl_ref_type, kl_ref_id);
CREATE INDEX IF NOT EXISTS kl_connection_fresco_ref_idx ON kl_connection(fresco_ref_type, fresco_ref_id);
CREATE INDEX IF NOT EXISTS kl_connection_status_idx     ON kl_connection(status);

-- ----------------------------------------------------------------------------
-- 5. Convenience view: a product with its provenance, for read-only consumers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW kl_product_provenance AS
SELECT
  p.id           AS product_id,
  p.product_name,
  c.name         AS company,
  f.name         AS product_family,
  s.source_url,
  s.document_title,
  s.document_type,
  s.retrieval_date,
  s.confidence
FROM kl_product p
JOIN kl_company c        ON c.id = p.company_id
LEFT JOIN kl_product_family f ON f.id = p.family_id
JOIN kl_source s         ON s.id = p.source_id;

-- ============================================================================
-- End of Industrial Knowledge Library schema.
-- Fresco internal knowledge (Layer 2) intentionally does NOT appear here.
-- ============================================================================
