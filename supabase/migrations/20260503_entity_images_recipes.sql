-- Recepty potřebují multi-image galerii (food shots z různých úhlů, prep
-- sekvence). Existing entity_images tabulka to umí, ale CHECK constraint
-- omezoval entity_type na region/brand/cultivar.
--
-- Rozšiřujeme o 'recipe' (a 'article' do budoucna — průvodce by taky mohly
-- mít vlastní hero shoty z editoriálu).

ALTER TABLE entity_images
  DROP CONSTRAINT IF EXISTS entity_images_entity_type_check;

ALTER TABLE entity_images
  ADD CONSTRAINT entity_images_entity_type_check
  CHECK (entity_type IN ('region', 'brand', 'cultivar', 'recipe', 'article'));

-- Stejné rozšíření pro entity_faqs — pro konzistenci, recipes a articles
-- mohou v budoucnu mít FAQ sekci pro SEO (schema.org/FAQPage).
ALTER TABLE entity_faqs
  DROP CONSTRAINT IF EXISTS entity_faqs_entity_type_check;

ALTER TABLE entity_faqs
  ADD CONSTRAINT entity_faqs_entity_type_check
  CHECK (entity_type IN ('region', 'brand', 'cultivar', 'recipe', 'article'));
