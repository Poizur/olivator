-- Přidání typu 'flavored' pro aromatizované oleje (s lanýžem, bazalkou, česnekem,
-- citronem, chilli atd.). Tyto oleje nemají standardní EVOO chemii (přidaná aromata
-- diluují parametry), takže nemůžou být hodnoceny stejnou metrikou. UI místo
-- Olivator Score zobrazí štítek "Aromatizovaný".
--
-- Pravidla:
-- - flavored produkty: olivator_score = NULL, score_breakdown = {}
-- - listing/comparator stále zobrazí (ale bez score)
-- - žebříčky filtrují type != 'flavored'

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_type_check;

ALTER TABLE products
  ADD CONSTRAINT products_type_check
    CHECK (type IN ('evoo','virgin','refined','olive_oil','pomace','flavored'));

COMMENT ON COLUMN products.type IS 'Typ oleje. flavored = aromatizovaný (s bylinkami/lanýžem/citronem) — nedostává Olivator Score, hodnotí se jiná metrika.';
