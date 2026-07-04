-- V5 Core — Mechanism Entity (Layer 4 of VISION-V5.md: "המנגנון הוא יחידת הידע המרכזית")
-- Run in the V5 Core Supabase project (NOT the management DB — that bridge is read-only).
--
-- Embedding standard (D-007): any future vector column here MUST be vector(1536),
-- model text-embedding-3-small. Do not add 384-dim columns.

-- 1. Mechanisms — the knowledge unit itself
CREATE TABLE IF NOT EXISTS mechanisms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanism_key TEXT UNIQUE NOT NULL,          -- e.g. 'char_formation'
  name_he TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Mechanism claims — a falsifiable statement tying a mechanism to reality
CREATE TABLE IF NOT EXISTS mechanism_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanism_id UUID NOT NULL REFERENCES mechanisms(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'corroborated', 'refuted', 'retired')),
  evidence_tier TEXT NOT NULL
    CHECK (evidence_tier IN ('grounded', 'strong', 'inferred')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  technology_domain TEXT,
  source_system TEXT,                          -- 'management' | 'matriya' | 'world'
  source_experiment_ref UUID,                  -- lab_experiments.id in the management DB.
                                               -- No FK on purpose: cross-database reference.
  conditions JSONB,                            -- validity conditions / detected context
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mechanism_claims_mechanism_idx ON mechanism_claims(mechanism_id);
CREATE INDEX IF NOT EXISTS mechanism_claims_domain_idx ON mechanism_claims(technology_domain);
CREATE INDEX IF NOT EXISTS mechanism_claims_source_exp_idx ON mechanism_claims(source_experiment_ref);

-- 3. Evidence links — LAW-EVIDENCE-001: no claim without evidence
CREATE TABLE IF NOT EXISTS evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES mechanism_claims(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN ('experiment', 'document', 'external')),
  source_system TEXT NOT NULL,                 -- 'management' | 'matriya' | 'world'
  source_ref TEXT NOT NULL,                    -- id in the source system (uuid/doi/url)
  source_label TEXT,                           -- human-readable (e.g. 'EXP-042')
  outcome TEXT,                                -- experiment outcome at capture time
  stance TEXT NOT NULL DEFAULT 'supports'
    CHECK (stance IN ('supports', 'contradicts', 'neutral')),
  snapshot JSONB,                              -- frozen copy of the evidence at link time
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_links_claim_idx ON evidence_links(claim_id);
CREATE INDEX IF NOT EXISTS evidence_links_source_idx ON evidence_links(source_system, source_ref);

COMMENT ON TABLE mechanisms IS 'V5 Layer 4: mechanism as first-class knowledge unit';
COMMENT ON TABLE mechanism_claims IS 'Falsifiable mechanism claims; confidence capped by evidence tier (LAW-EVIDENCE-001)';
COMMENT ON TABLE evidence_links IS 'Evidence backing claims; snapshot freezes the evidence as seen at link time';
