# Industrial Knowledge Library (KL)

A structured, reusable knowledge base describing **external** industrial
materials, technologies, product families and the surrounding technical
ecosystem. It is designed to **complement** Fresco's internal knowledge — never
to replace, absorb, or mix with it.

> The goal is not to scrape product catalogs. The goal is a reusable knowledge
> base that can later enrich Fresco's internal knowledge **while keeping the two
> strictly separate**.

---

## The three layers (separation rule)

| Layer | What it holds | Where it lives |
|-------|---------------|----------------|
| **Layer 1 — External Industrial Knowledge** | Public info: products, raw materials, mechanisms, standards, patents, articles… | `kl_*` tables (this module) |
| **Layer 2 — Fresco Internal Knowledge** | Private formulations, experiments, projects | The management system (`lab_experiments`, `material_library`, …). **Not in this schema.** |
| **Layer 3 — Connections** | *Hypotheses* linking a Layer 1 entity to a Layer 2 record | `kl_connection` only |

Hard rules, enforced in the schema and the API:

1. **Read-only toward existing MATRIYA/Fresco data.** Every object here is a new
   `kl_*` table. There is **no foreign key** from `kl_*` into any Fresco table.
2. **Nothing without provenance.** Every fact-bearing row has a `NOT NULL`
   `source_id → kl_source`. The API rejects any fact write missing a source.
3. **Never infer.** Properties/knowledge store only what a document literally
   states. Missing means absent — never `0`, never a guess.
4. **Never merge layers.** Layer 3 connections reference the internal side by
   **loose text** (`fresco_ref_type` + `fresco_ref_id`), not a FK, so the two
   knowledge bases stay physically separate. A connection is a **hypothesis**
   until a human validates it.

---

## Files

```
db/knowledge_library_schema.sql        -- all kl_* tables + a provenance view
db/knowledge_library_seed.example.sql  -- ILLUSTRATIVE placeholder data only
src/modules/knowledge-library/
  knowledgeLibrary.model.js            -- enums + validators (provenance/layer/enum)
  knowledgeLibrary.service.js          -- Supabase access; guards every write
  knowledgeLibrary.controller.js       -- thin HTTP wrappers
  knowledgeLibrary.routes.js           -- mounted at /api/knowledge-library
tests/knowledge-library.provenance.test.js  -- pure invariant tests (npm test)
```

Apply the schema in the Supabase SQL editor (or `psql`):

```
\i db/knowledge_library_schema.sql
```

---

## Data model

### Hierarchy (products)

```
kl_company ─< kl_product_family ─< kl_product
                                      ├─< kl_classification      (Silane, Polycarboxylate, …)
                                      ├─< kl_functional_role     (Water Repellent, Char Former, …)
                                      ├─< kl_property            (Density, pH, VOC, Fire Rating, …)
                                      ├─< kl_compatible_system   (Cement, Epoxy, EIFS, …)
                                      ├─< kl_application_domain  (Facades, Waterproofing, …)
                                      ├─< kl_document            (TDS / SDS / manual / brochure links)
                                      └─< kl_knowledge           (mechanism, advantage, limitation, …)
```

Deduplication across versions: keep each version as its own `kl_product` row and
point non-canonical rows at the canonical one via `canonical_product_id`.

### Ecosystem (the broader Industrial Knowledge Library)

`kl_knowledge_asset` holds everything beyond finished products —
`raw_material`, `mechanism`, `standard` (ASTM/EN/ISO), `lab_equipment`,
`test_method`, `manufacturing_process`, `patent`, `scientific_article`.
`kl_asset_link` connects an asset to a product or to another asset
(`contains`, `tested_per`, `conforms_to`, `explains`, …) — all within Layer 1.

### Provenance

Every fact points at a `kl_source`: `source_url`, `document_title`,
`document_type`, `publisher`, `retrieval_date`, `confidence`. `confidence`
describes trust in the **source/extraction**, not an inferred fact.

---

## API

Base path: `/api/knowledge-library`. Read endpoints are open; **every write that
records a fact requires `source_id` in the body** (HTTP 400 otherwise).

| Method & path | Purpose |
|---------------|---------|
| `POST /sources` · `GET /sources` | Create/list provenance records |
| `POST /companies` · `GET /companies` | Companies |
| `POST /families` · `GET /companies/:companyId/families` | Product families |
| `POST /products` · `GET /products` · `GET /products/:id` | Products (`:id` returns the full assembled view) |
| `POST /products/:id/properties` | Documented property (`name`, `value_text`, optional `value_num`/`unit`/`test_method`) |
| `POST /products/:id/documents` | TDS/SDS/manual/brochure link |
| `POST /products/:id/knowledge` | Engineering knowledge (`knowledge_type`, `content`) |
| `POST /products/:id/classifications` \| `functional-roles` \| `compatible-systems` \| `application-domains` | Single-value attributes (`value`) |
| `POST /assets` · `GET /assets` · `POST /asset-links` | Ecosystem entities & links |
| `POST /connections` · `GET /connections` · `PATCH /connections/:id` | Layer 3 hypotheses; `PATCH` validates/rejects |

### Ingestion contract (order matters)

```
1. POST /sources        -> get source_id   (retrieve the real public document first)
2. POST /companies      -> company_id
3. POST /families       -> family_id        (needs source_id)
4. POST /products       -> product_id       (needs source_id)
5. POST /products/:id/{properties,knowledge,classifications,...}   (each needs source_id)
6. (optional) POST /assets + /asset-links   for standards/test methods/raw materials
7. (optional) POST /connections             to propose Layer-3 hypotheses
```

Example — a documented property may never be invented:

```jsonc
// POST /api/knowledge-library/products/<id>/properties
{ "name": "Density", "value_text": "approx. 1.05 g/cm³",
  "value_num": 1.05, "unit": "g/cm3", "source_id": "<uuid-from-step-1>" }
```

---

## Growing the library (the 20+ companies)

Scope starts with construction chemicals, coatings, fire protection, cement
additives, concrete technology, mineral systems, functional fillers, polymers
and surface treatments — e.g. BASF, Evonik, Dow, Wacker, Arkema, Sika,
Saint-Gobain, Mapei, Master Builders Solutions, Nouryon, Cabot, Imerys, Omya,
Clariant, Solenis, Elementis, Lanxess, BYK, Synthomer, Eastman, Huntsman.

Build **incrementally, completeness over speed**:

- Prefer official manufacturer sources (TDS/SDS/product pages/selectors).
- One product at a time: source → identity → documented attributes → knowledge.
- Record only what a source states. Leave unknowns empty.
- Deduplicate versions via `canonical_product_id`.
- Keep external facts (Layer 1) and Fresco knowledge (Layer 2) apart; express
  any relationship as a Layer-3 hypothesis and validate it deliberately.

> This module ships the **foundation** (schema + guarded API + provenance +
> separation + tests). Populating real vendor data is a later, deliberate
> increment — no values are fabricated here.

---

## Tests

```
npm test        # runs the pure invariant tests (provenance, layer, enums)
```
