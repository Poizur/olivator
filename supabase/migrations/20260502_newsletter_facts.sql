-- Educational facts library — 1 fakt = "Věděli jste?" blok v newsletteru.
-- Admin edituje v /admin/newsletter/facts. Composer rotuje (least recently used).

CREATE TABLE IF NOT EXISTS newsletter_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,                  -- "Věděli jste? Polyfenoly v olejích..."
  category VARCHAR(40) DEFAULT 'general',
                                       -- 'health', 'production', 'storage', 'tasting', 'history', 'general'
  source_url TEXT,                     -- volitelný odkaz na zdroj
  active BOOLEAN DEFAULT true,
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facts_active_lru
  ON newsletter_facts (active, last_used_at NULLS FIRST);

-- Seed: 12 starter facts. Admin může přidat / smazat / editovat.
INSERT INTO newsletter_facts (body, category) VALUES
  ('Polyfenoly jsou přírodní antioxidanty z dužiny oliv. Čím vyšší obsah (ideálně 250+ mg/kg), tím protizánětlivější účinek. EU označuje oleje s 250+ mg/kg jako "rich in polyphenols" — health claim podle EFSA.', 'health'),
  ('Hořkost a pálení v olivovém oleji nejsou chyba — jsou to chuťové markery polyfenolů (oleocanthal a oleuropein). Sladký vzhled = oxidovaný nebo nízkokvalitní olej.', 'tasting'),
  ('Extra panenský olivový olej (EVOO) musí mít kyselost ≤ 0,8 %. Nejkvalitnější oleje mají 0,2 % nebo méně. Vyšší kyselost = oleje z přezralých nebo poškozených oliv.', 'production'),
  ('Olivový olej skladuj v tmavé skleněné lahvi, daleko od slunce a tepla. Otevřená lahev má kvalitní olej max 6 měsíců — pak začnou polyfenoly degradovat.', 'storage'),
  ('Studená lisování ("cold pressed") znamená teplotu pod 27 °C. Při vyšší teplotě se vyplaví víc oleje (tedy cena nižší), ale zničí se polyfenoly a aromatické látky.', 'production'),
  ('Sklizeň oliv probíhá od října do prosince. Olej z první sklizně (early harvest, "novello") má nejvyšší obsah polyfenolů — proto je pikantnější a hořčí. Ideální dárek na Vánoce.', 'history'),
  ('Italská odrůda Coratina obsahuje 3-4× víc polyfenolů než španělská Picual. Pokud sleduješ zdraví, vyber Coratinu z Apulie. Pokud chuť, Picual je univerzálnější.', 'tasting'),
  ('Označení DOP/PDO znamená "chráněné označení původu" — olej musí pocházet ze specifického regionu a procházet kontrolou. Žádný marketing, ale skutečný garant původu.', 'production'),
  ('Až 70 % olivového oleje na světě se podle některých studií falšuje (smícháno s levnějšími oleji). Jediná ochrana: kupuj od důvěryhodných importérů s lab reportem nebo certifikací NYIOOC.', 'health'),
  ('Pod 12 °C olivový olej zhoustne a vykrystalizuje — to je dobrý znak (extra panenské oleje to dělají, rafinované ne). Po pokojové teplotě se vrátí. Žádná kvalita se neztrácí.', 'storage'),
  ('Řecká Kalamata (region Messinia) má od EU nejstarší DOP označení pro oliv. Oleje odtud mají charakteristickou středně-pálivou intenzitu a ovocnou chuť — ideál na řecký salát.', 'history'),
  ('Při pečení / vaření olej ztrácí 30-50 % polyfenolů. Pro health benefit: použij ho na konec — na salát, dochucení vařeného jídla, dipping. Smažení = obyčejnější olej stačí.', 'tasting');
