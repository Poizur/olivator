-- Retailery (eshopy) chtějí pod logem ukázat 2-3 atmosférické fotky —
-- sklad, balení, lidé, prodejna. Reuse existing entity_images infrastructure.
--
-- CHECK constraint dosud entity_type ∈ {region, brand, cultivar, recipe, article}.
-- Přidáváme 'retailer'.

ALTER TABLE entity_images
  DROP CONSTRAINT IF EXISTS entity_images_entity_type_check;

ALTER TABLE entity_images
  ADD CONSTRAINT entity_images_entity_type_check
  CHECK (entity_type IN ('region', 'brand', 'cultivar', 'recipe', 'article', 'retailer'));

-- Stejné rozšíření pro entity_faqs (symetrie — retailery v budoucnu mohou mít
-- vlastní FAQ např. „doručení", „reklamace", „BIO certifikace").
ALTER TABLE entity_faqs
  DROP CONSTRAINT IF EXISTS entity_faqs_entity_type_check;

ALTER TABLE entity_faqs
  ADD CONSTRAINT entity_faqs_entity_type_check
  CHECK (entity_type IN ('region', 'brand', 'cultivar', 'recipe', 'article', 'retailer'));
