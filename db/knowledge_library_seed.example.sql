-- ============================================================================
-- ILLUSTRATIVE SEED — NOT VERIFIED DATA. DO NOT TREAT AS FACT.
-- ============================================================================
-- This file exists ONLY to demonstrate the shape of a fully-populated product
-- and the mandatory-provenance flow. The values below are PLACEHOLDERS with a
-- placeholder source (example.invalid). They are deliberately obvious so no one
-- mistakes them for real Technical Data Sheet content.
--
-- To build the real library:
--   1. Retrieve an actual public source (TDS/SDS/product page).
--   2. Insert a real kl_source row (real URL, title, retrieval date).
--   3. Insert only values that the source literally states. Never infer.
--
-- Run AFTER knowledge_library_schema.sql. Safe to skip in production.
-- ============================================================================

BEGIN;

-- 1) Provenance first — every fact below points at this example source.
WITH src AS (
  INSERT INTO kl_source (source_url, document_title, document_type, publisher, retrieval_date, confidence, notes)
  VALUES (
    'https://example.invalid/tds/example-product',
    'EXAMPLE Product — Technical Data Sheet (ILLUSTRATIVE)',
    'tds',
    'Example Manufacturer',
    DATE '2026-07-04',
    'low',
    'ILLUSTRATIVE PLACEHOLDER — not a real document.'
  )
  RETURNING id
),
-- 2) Company
co AS (
  INSERT INTO kl_company (name, aliases, country, website)
  VALUES ('Example Manufacturer', ARRAY['ExampleCo'], 'DE', 'https://example.invalid')
  ON CONFLICT (name) DO UPDATE SET updated_at = now()
  RETURNING id
),
-- 3) Product family
fam AS (
  INSERT INTO kl_product_family (company_id, name, description, source_id)
  SELECT co.id, 'Example Silane Family',
         'ILLUSTRATIVE family grouping of water-repellent silanes.',
         src.id
  FROM co, src
  RETURNING id
),
-- 4) Product (identity)
prod AS (
  INSERT INTO kl_product (company_id, family_id, product_name, brand, product_code, version, source_id)
  SELECT co.id, fam.id, 'Example Silane 100', 'ExampleGuard', 'EX-100', 'v1', src.id
  FROM co, fam, src
  RETURNING id
)
-- 5) Attributes — each carries the same provenance (source_id).
INSERT INTO kl_classification (product_id, value, source_id)
SELECT prod.id, 'Silane', src.id FROM prod, src;

-- The remaining inserts re-select the example product + source by their known
-- keys so this file stays a simple, re-runnable illustration.
INSERT INTO kl_functional_role (product_id, value, source_id)
SELECT p.id, r.value, s.id
FROM kl_product p
JOIN kl_source s ON s.source_url = 'https://example.invalid/tds/example-product'
CROSS JOIN (VALUES ('Water Repellent'), ('Hydrophobic Agent')) AS r(value)
WHERE p.product_name = 'Example Silane 100'
ON CONFLICT (product_id, value) DO NOTHING;

INSERT INTO kl_property (product_id, name, value_text, value_num, unit, source_id)
SELECT p.id, x.name, x.value_text, x.value_num, x.unit, s.id
FROM kl_product p
JOIN kl_source s ON s.source_url = 'https://example.invalid/tds/example-product'
CROSS JOIN (VALUES
  ('Density',       'approx. 0.90 (ILLUSTRATIVE)', 0.90, 'g/cm3'),
  ('Active Matter', '> 99% (ILLUSTRATIVE)',        99.0, '%')
) AS x(name, value_text, value_num, unit)
WHERE p.product_name = 'Example Silane 100';

INSERT INTO kl_compatible_system (product_id, value, source_id)
SELECT p.id, v.value, s.id
FROM kl_product p
JOIN kl_source s ON s.source_url = 'https://example.invalid/tds/example-product'
CROSS JOIN (VALUES ('Cement'), ('Masonry'), ('Concrete')) AS v(value)
WHERE p.product_name = 'Example Silane 100'
ON CONFLICT (product_id, value) DO NOTHING;

INSERT INTO kl_application_domain (product_id, value, source_id)
SELECT p.id, v.value, s.id
FROM kl_product p
JOIN kl_source s ON s.source_url = 'https://example.invalid/tds/example-product'
CROSS JOIN (VALUES ('Facades'), ('Concrete Repair')) AS v(value)
WHERE p.product_name = 'Example Silane 100'
ON CONFLICT (product_id, value) DO NOTHING;

INSERT INTO kl_document (product_id, document_type, title, url, source_id)
SELECT p.id, 'tds', 'EXAMPLE Product — TDS (ILLUSTRATIVE)',
       'https://example.invalid/tds/example-product', s.id
FROM kl_product p
JOIN kl_source s ON s.source_url = 'https://example.invalid/tds/example-product'
WHERE p.product_name = 'Example Silane 100'
ON CONFLICT (product_id, url) DO NOTHING;

INSERT INTO kl_knowledge (product_id, knowledge_type, content, source_id)
SELECT p.id, k.knowledge_type, k.content, s.id
FROM kl_product p
JOIN kl_source s ON s.source_url = 'https://example.invalid/tds/example-product'
CROSS JOIN (VALUES
  ('mechanism_of_action', 'ILLUSTRATIVE: penetrates the substrate and reacts to form a hydrophobic layer.'),
  ('limitation',          'ILLUSTRATIVE: apply only to dry substrate.'),
  ('moisture_limitation', 'ILLUSTRATIVE: do not apply if rain is expected within 4 hours.')
) AS k(knowledge_type, content)
WHERE p.product_name = 'Example Silane 100';

-- 6) Ecosystem example — a standard, linked to the product (Layer 1 only).
WITH s AS (
  SELECT id FROM kl_source WHERE source_url = 'https://example.invalid/tds/example-product'
),
asset AS (
  INSERT INTO kl_knowledge_asset (asset_type, name, identifier, publisher, description, source_id)
  SELECT 'standard', 'EXAMPLE Water Absorption Standard', 'EN 0000 (ILLUSTRATIVE)',
         'Example Standards Body', 'ILLUSTRATIVE placeholder standard.', s.id
  FROM s
  ON CONFLICT (asset_type, name, COALESCE(identifier, '')) DO NOTHING
  RETURNING id
)
INSERT INTO kl_asset_link (asset_id, product_id, relation_type, source_id)
SELECT a.id, p.id, 'conforms_to', s.id
FROM kl_knowledge_asset a
JOIN kl_product p ON p.product_name = 'Example Silane 100'
JOIN s ON true
WHERE a.identifier = 'EN 0000 (ILLUSTRATIVE)'
ON CONFLICT DO NOTHING;

-- 7) Layer 3 example — a HYPOTHESIS connecting this external product to a
--    (fictional) Fresco internal experiment. Loose text reference only; no FK.
--    Stays 'hypothesis' until a human validates it.
INSERT INTO kl_connection (
  kl_ref_type, kl_ref_id, fresco_ref_type, fresco_ref_id,
  relation_type, rationale, status, confidence, created_by
)
SELECT 'product', p.id, 'lab_experiment', 'EXP-EXAMPLE-001',
       'analogous_to',
       'ILLUSTRATIVE: external silane water-repellent resembles internal approach EXP-EXAMPLE-001.',
       'hypothesis', 'low', 'seed'
FROM kl_product p
WHERE p.product_name = 'Example Silane 100'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify:
--   SELECT * FROM kl_product_provenance;
--   SELECT status, count(*) FROM kl_connection GROUP BY status;
