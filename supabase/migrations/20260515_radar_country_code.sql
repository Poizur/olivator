-- Přidá country_code do radar_items pro filtrování novinek podle původu.
-- Hodnoty: ISO 3166-1 alpha-2 (GR, IT, ES, HR, PT, TN, TR, US, MA, IL)
-- nebo 'XX' (global/více zemí) nebo NULL (nezjistitelné).
-- AI (Haiku) vyplňuje při překladu — existující záznamy zůstanou NULL.

alter table radar_items add column if not exists country_code text;

create index if not exists idx_radar_country on radar_items(country_code);
