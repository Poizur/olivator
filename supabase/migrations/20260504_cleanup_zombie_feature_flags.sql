-- Cleanup: feature flags v DB které kód NIKDE nečte (zombie flagy).
--
-- Zjištěno auditem: ai_sommelier, user_profiles, visual_search byly
-- zaseedovány v initial_schema.sql jako Fáze 2/3 plán, ale kód je nikde
-- nezná (žádný getSetting / getFeatureFlag check). Smazat aby admin
-- věděl co je reálně k dispozici.
--
-- Ponecháváme aktivní flagy (ai_search, comparator, quiz) + vypnuté co
-- jsou plánované/používané (wishlist, price_alerts).

DELETE FROM feature_flags
WHERE key IN ('ai_sommelier', 'user_profiles', 'visual_search');
