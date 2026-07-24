-- Přidá flag pro dotazy, kde Olík nenašel vhodný produkt.
-- no_recommendation = true → žádný /go/ link v odpovědi.
-- Tyto záznamy jsou nejcennějším sigálem — ukazují mezery v katalogu.

ALTER TABLE olik_conversations
  ADD COLUMN IF NOT EXISTS no_recommendation BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_olik_no_recommendation
  ON olik_conversations (no_recommendation, created_at DESC)
  WHERE no_recommendation = true;

COMMENT ON COLUMN olik_conversations.no_recommendation IS
  'true když odpověď neobsahuje žádné doporučení produktu (/go/ link). Signal mezery v katalogu.';
