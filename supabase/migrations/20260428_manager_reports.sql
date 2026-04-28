-- Olivator Manager Agent — týdenní strategický report.
-- Manager čte data napříč zdroji (affiliate clicks, quality, discovery,
-- completeness), Claude analyzuje, ukládá report + odešle emailem.

CREATE TABLE IF NOT EXISTS manager_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Raw metrics — Manager + UI vidí čísla bez další analýzy
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Plain-text + lehký markdown analýzy z Claude (3 příležitosti, 3 problémy, 3 akce)
  ai_analysis TEXT NOT NULL DEFAULT '',
  -- Strukturované navrhované akce: [{title, description, priority, type}, ...]
  suggested_actions JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'archived')),
  email_sent_to TEXT
);

CREATE INDEX IF NOT EXISTS idx_manager_reports_generated
  ON manager_reports (generated_at DESC);

-- Kategorizace akcí pro filtrování v UI
COMMENT ON COLUMN manager_reports.suggested_actions IS
  'Each action: { title, description, priority: high|medium|low, category: seo|content|affiliate|quality|technical, completed: boolean }';
