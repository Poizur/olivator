-- Noční přepracování draftů: po 3 neúspěšných pokusech „zaparkovat“ (bez volání API),
-- znovu zkusit jen při změně obsahu stránky obchodu (hash), nejvýš 1× týdně.
ALTER TABLE products ADD COLUMN IF NOT EXISTS rescrape_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rescrape_parked_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rescrape_content_hash TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rescrape_checked_at TIMESTAMPTZ;
-- Úklid podezřelých značek: značku, kterou se nepodařilo vyřešit, znovu posílat Claude nejvýš 1× za 30 dní.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS junk_checked_at TIMESTAMPTZ;
