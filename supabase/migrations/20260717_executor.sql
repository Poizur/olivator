-- Executor audit trail — každá auto-fix operace se loguje
CREATE TABLE executor_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Co se provádělo
  operation_type VARCHAR(50) NOT NULL,  -- fix_broken_token | fix_affiliate_url | recalc_score
  target_type    VARCHAR(30) NOT NULL,  -- product | article | offer
  target_id      UUID,
  target_slug    TEXT,

  -- Co se změnilo
  field_changed VARCHAR(50),
  value_before  TEXT,
  value_after   TEXT,

  -- Verifikace u zdroje
  verified_at_source BOOLEAN DEFAULT false,
  source_url         TEXT,
  source_evidence    TEXT,  -- co jsme na zdroji našli (HTTP status, tracking params, ...)

  -- Výsledek
  status      VARCHAR(20) NOT NULL CHECK (status IN ('applied', 'skipped', 'failed', 'escalated')),
  skip_reason TEXT,

  -- Kontext
  triggered_by       VARCHAR(50),  -- daily_scan | brief_decision
  brief_decision_id  UUID REFERENCES weekly_decisions(id) ON DELETE SET NULL,
  learnings_applied  TEXT[],       -- kódy lekcí (L-001...) použitých při rozhodnutí

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executor_type    ON executor_operations(operation_type);
CREATE INDEX idx_executor_status  ON executor_operations(status);
CREATE INDEX idx_executor_created ON executor_operations(created_at DESC);
CREATE INDEX idx_executor_target  ON executor_operations(target_id) WHERE target_id IS NOT NULL;

ALTER TABLE executor_operations ENABLE ROW LEVEL SECURITY;

-- Executor musí číst + zapisovat přes service role key (bez RLS policy = service role only)

-- Rozšíření weekly_decisions o exekuci
ALTER TABLE weekly_decisions
  ADD COLUMN IF NOT EXISTS executed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_note TEXT;
