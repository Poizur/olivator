-- 4 retaileři bez affiliate / XML — placeholder záznamy aby admin viděl
-- prioritní seznam k oslovení. is_active=false = neukázat na webu (chybí
-- affiliate, žádný klik nepřinese provizi). Až admin domluví affiliate
-- nebo eHUB program, doplní base_tracking_url + is_active=true.
--
-- Plus přidáme `default_commission_pct = NULL` — neznámá komise. Sloupec
-- ale dnes je `DECIMAL(4,2)` bez NULL → musíme dát 0 jako placeholder.

INSERT INTO retailers (
  name, slug, domain, affiliate_network,
  default_commission_pct, market, is_active,
  story
) VALUES
  (
    'Olivum.cz',
    'olivum',
    'olivum.cz',
    'direct',
    0,
    'CZ',
    false,
    '❌ Nemají affiliate program. Akce: oslovit přímo na info@olivum.cz.'
  ),
  (
    'GreekMarket.cz',
    'greekmarket',
    'greekmarket.cz',
    'direct',
    0,
    'CZ',
    false,
    '❓ Affiliate program neověřen. Akce: ověřit a oslovit.'
  ),
  (
    'Jamonárna.cz',
    'jamonarna',
    'jamonarna.cz',
    'direct',
    0,
    'CZ',
    false,
    '❓ Specialista na španělský sortiment (šunka, oleje). Affiliate neověřen — ověřit a oslovit.'
  ),
  (
    'Lozano Červenka',
    'lozanocervenka',
    'lozanocervenka.cz',
    'direct',
    0,
    'CZ',
    false,
    '❓ Španělský olej přímo od producenta. Affiliate program neověřen — ověřit a oslovit.'
  )
ON CONFLICT (slug) DO NOTHING;
