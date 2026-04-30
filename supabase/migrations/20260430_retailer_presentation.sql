-- Retailer presentation — info o eshopu (nejen jméno + URL).
-- User feedback: "pojďme se zmínit i o eshopu v hezkém. O eshopu na kterém vždy
-- zákazník produkt najde. Aby eshopy radost měli ze prezentujeme hezky."
--
-- Příklad: reckonasbavi.cz založili Zdeněk a Marcelka, vášniví cestovatelé z Řecka.
-- Tohle by se mělo objevit pod offers tabulkou na produktové stránce + admin
-- správa.

ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS tagline VARCHAR(160),                  -- krátký 1-řádek hook
  ADD COLUMN IF NOT EXISTS story TEXT,                            -- delší příběh / o nás
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,                  -- rok založení eshopu
  ADD COLUMN IF NOT EXISTS founders VARCHAR(160),                 -- "Zdeněk a Marcelka"
  ADD COLUMN IF NOT EXISTS headquarters VARCHAR(120),             -- "Praha", "Olomouc"
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(160),           -- "Specializace na řecké oleje"
  ADD COLUMN IF NOT EXISTS logo_url TEXT,                         -- URL na logo (Supabase Storage)
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2),                   -- Heureka rating (1-5)
  ADD COLUMN IF NOT EXISTS rating_count INTEGER,                  -- počet recenzí
  ADD COLUMN IF NOT EXISTS rating_source VARCHAR(50);             -- "heureka" / "google"

COMMENT ON COLUMN retailers.tagline IS '1-řádek hook pro produktovou stránku, např. "Specialisté na řecké oleje od roku 2018"';
COMMENT ON COLUMN retailers.story IS 'Delší příběh eshopu — kdo to je, čím se zabývají, proč doporučujeme';
COMMENT ON COLUMN retailers.founders IS 'Lidská jména zakladatelů, např. "Zdeněk a Marcelka"';
COMMENT ON COLUMN retailers.specialization IS 'Co je specifické na tomto eshopu (italské EVOO, BIO produkty, gourmet)';
