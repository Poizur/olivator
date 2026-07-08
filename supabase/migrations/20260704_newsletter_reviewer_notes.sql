-- AI Reviewer výsledky pro newsletter drafty (Fáze 1)
ALTER TABLE newsletter_drafts
  ADD COLUMN IF NOT EXISTS reviewer_notes JSONB,
  ADD COLUMN IF NOT EXISTS reviewer_severity VARCHAR(20) DEFAULT NULL;
