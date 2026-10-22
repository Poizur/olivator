-- Olík: celé odpovědi + výsledek kontroly výstupu. Uchování 12 měsíců (mazání v cron:link-check).
ALTER TABLE olik_conversations ADD COLUMN IF NOT EXISTS response_full TEXT;
ALTER TABLE olik_conversations ADD COLUMN IF NOT EXISTS validation JSONB DEFAULT '{}';
