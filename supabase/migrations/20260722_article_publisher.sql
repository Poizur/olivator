-- Article Publisher: opportunity tracking + draft storage

CREATE TABLE IF NOT EXISTS article_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  keyword TEXT NOT NULL,
  opportunity_type VARCHAR(30) NOT NULL CHECK (opportunity_type IN ('striking_distance', 'content_gap', 'rising_query')),
  gsc_impressions INT,
  gsc_position NUMERIC,
  gsc_clicks INT,
  existing_url TEXT,
  cannibalize_risk TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified', 'drafted', 'reviewed', 'approved', 'rejected', 'published')),
  priority_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_opportunities_status ON article_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_article_opportunities_priority ON article_opportunities(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_article_opportunities_type ON article_opportunities(opportunity_type);

CREATE TABLE IF NOT EXISTS article_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES article_opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  meta_description TEXT,
  body_markdown TEXT NOT NULL,
  reviewer_notes JSONB,
  reviewer_severity VARCHAR(10) CHECK (reviewer_severity IN ('ok', 'warn', 'block')),
  word_count INT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_drafts_status ON article_drafts(status);
CREATE INDEX IF NOT EXISTS idx_article_drafts_opportunity ON article_drafts(opportunity_id);

ALTER TABLE article_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_drafts ENABLE ROW LEVEL SECURITY;
