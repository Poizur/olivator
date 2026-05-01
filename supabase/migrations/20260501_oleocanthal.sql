-- Oleocanthal (oleokantal) — fenolická sloučenina zodpovědná za pálivý vjem v hrdle.
-- Silné protizánětlivé účinky, rostoucí zájem spotřebitelů.
-- Jednotka: mg/kg (typicky 0–700 pro kvalitní EVOO).

ALTER TABLE products ADD COLUMN IF NOT EXISTS oleocanthal INTEGER;

COMMENT ON COLUMN products.oleocanthal IS 'Obsah oleokantalu v mg/kg. Extrahováno z laboratorního protokolu nebo etikety. NULL = neznámo.';
