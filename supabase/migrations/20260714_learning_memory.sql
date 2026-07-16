-- Learning Memory Layer pro Olivator AI agenty (Krok 0.5)
-- Konsolidovaná paměť nahrazující roztříštěné project_learnings.md

CREATE TABLE learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('bug_fix','automation','editorial','seo','affiliate','architecture')),
  context TEXT,
  observation TEXT NOT NULL,
  rule TEXT NOT NULL,
  keywords TEXT[],
  impact VARCHAR(10) DEFAULT 'medium' CHECK (impact IN ('high','medium','low')),
  related_commit VARCHAR(40),
  related_tickets TEXT[],
  times_applied INT DEFAULT 0,
  last_applied_at TIMESTAMPTZ,
  validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50) DEFAULT 'user'
);

CREATE INDEX idx_learnings_category ON learnings(category);
CREATE INDEX idx_learnings_keywords ON learnings USING GIN(keywords);
CREATE INDEX idx_learnings_impact ON learnings(impact);

CREATE TABLE learning_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_id UUID REFERENCES learnings(id) ON DELETE CASCADE,
  agent_name VARCHAR(50) NOT NULL,
  context TEXT,
  decision_made TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_learning ON learning_applications(learning_id);
CREATE INDEX idx_applications_agent ON learning_applications(agent_name);

CREATE TABLE patterns_observed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  occurrences INT DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  example_contexts JSONB,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','converted','ignored')),
  converted_to_learning UUID REFERENCES learnings(id)
);

CREATE INDEX idx_patterns_status ON patterns_observed(status);
CREATE INDEX idx_patterns_occurrences ON patterns_observed(occurrences DESC);
