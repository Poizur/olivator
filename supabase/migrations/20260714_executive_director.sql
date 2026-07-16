-- AI Ředitel — weekly executive brief + decision tracking
-- Spouští se každou neděli ve 20:00 UTC, generuje brief pro pondělní ranní rozhodnutí

CREATE TABLE IF NOT EXISTS weekly_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,                        -- Pondělí daného týdne (ISO week start)
  week_label VARCHAR(20) NOT NULL,                 -- Např. "2026-W29"
  raw_data JSONB NOT NULL DEFAULT '{}',            -- 8 zdrojů dat (bez AI)
  brief_md TEXT,                                   -- AI-generovaný brief (Markdown)
  brief_json JSONB,                                -- Strukturovaný výstup AI (decisions[])
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'reviewed', 'archived')),
  generation_error TEXT,                           -- Chyba při generaci (pro debugging)
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(week_label)
);

CREATE TABLE IF NOT EXISTS weekly_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES weekly_briefs(id) ON DELETE CASCADE,
  decision_key VARCHAR(100) NOT NULL,              -- Unikátní klíč rozhodnutí (pro dedup)
  title TEXT NOT NULL,                             -- Krátký název (1 řádek)
  context TEXT,                                    -- Proč je to relevantní tento týden
  options JSONB NOT NULL DEFAULT '[]',             -- [{label, description, impact}]
  recommended_option VARCHAR(50),                  -- Klíč doporučené volby
  admin_choice VARCHAR(50),                        -- Volba admina (null = pending)
  admin_note TEXT,                                 -- Volitelný komentář admina
  priority VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  category VARCHAR(50),                            -- 'seo', 'content', 'affiliate', 'product', 'tech'
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brief_id, decision_key)
);

-- Indexy pro admin UI (listování, filtrování)
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_week_start ON weekly_briefs(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_decisions_brief_id ON weekly_decisions(brief_id);
CREATE INDEX IF NOT EXISTS idx_weekly_decisions_pending ON weekly_decisions(brief_id, admin_choice)
  WHERE admin_choice IS NULL;
