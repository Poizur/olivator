-- Bulk jobs — tracking long-running bulk operations (Discovery approve, etc.)
-- Frontend polls bulk_jobs.status + processed for live progress display.
-- Backend processes items sequentially, updates row, doesn't tie to HTTP timeout.

CREATE TABLE IF NOT EXISTS bulk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'discovery_bulk_approve' | 'discovery_bulk_reject'
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total INTEGER NOT NULL,
  processed INTEGER DEFAULT 0,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  current_item TEXT, -- nazev produktu kterej se prave zpracovava
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(100) DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status_started
  ON bulk_jobs(status, started_at DESC);
