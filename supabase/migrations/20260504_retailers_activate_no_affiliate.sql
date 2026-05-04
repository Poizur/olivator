-- User: 'vše bude online. Normálně proklik na jejich produkty. Já jen že
-- nebudu dostávat zaplaceno, to nevadí. Až bude k nim trafik, pak se zeptáme.'
--
-- Aktivovat 4 retailery i bez affiliate. Klik z /go/[retailer]/[slug]
-- půjde přímo na product_url (bez tracking parametrů — žádná provize),
-- ale je-shop dostane návštěvníka. Až budou kliky, admin osloví retailery
-- s nabídkou affiliate.
--
-- Plus vyčistíme story field — předchozí migrace tam dala admin poznámku
-- ('❌ Nemají affiliate program...') která by se zobrazila na public detail
-- produktu. Story zůstane NULL až do auto-research / ručního vyplnění.

UPDATE retailers
SET
  is_active = true,
  story = NULL,
  tagline = NULL
WHERE slug IN ('olivum', 'greekmarket', 'jamonarna', 'lozanocervenka');
