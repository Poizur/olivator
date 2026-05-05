-- Brand research drafts — auto-fill orchestrátor (lib/brand-auto-fill.ts)
-- ukládá výsledek každého běhu sem. Při high-confidence (≥75) se data
-- rovnou aplikují do brand row, ale draft se zachová pro audit/rollback.
-- Při low-confidence draft čeká na schválení adminem v UI.

CREATE TABLE IF NOT EXISTS brand_research_drafts (
  brand_id UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
  candidate_url TEXT,
  url_confidence INTEGER,
  url_source VARCHAR(20), -- 'web_search' | 'heuristic'
  verify_confidence INTEGER,
  verify_reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('applied', 'pending_review', 'rejected', 'no_url', 'error')),
  draft JSONB, -- PolishedDraft tvar (tldr, descriptionShort, story, …)
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_drafts_status
  ON brand_research_drafts(status);

COMMENT ON TABLE brand_research_drafts IS
  'Auto-fill výsledky pro značky. Pending = admin musí schválit, applied = už zapsáno do brands.';
