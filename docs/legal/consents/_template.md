---
shop: ""                         # slug prodejce v DB (např. lozanocervenka)
domain: ""                       # doména (lozanocervenka.cz)
date: ""                         # datum záznamu, YYYY-MM-DD
consent_type: ""                 # consented_free | consented_affiliate | declined | no_response
activated_by: "Martin Navrátil"  # kdo souhlas zaznamenal a aktivaci provedl
---

## Citace odpovědi

> [Vlož sem přesný text emailu / zprávy / telefonátu od provozovatele]
> Pokud nebyla odpověď, napiš: "Bez odpovědi k [datum]."

## Poznámky

- Kanál kontaktu: email / telefon / formulář
- Email odeslan: [datum]
- Odpověď přišla: [datum nebo "—"]
- Feed URL dodal: [URL nebo "—"]

## Akce při aktivaci

- [ ] Stav v DB nastaven: legalization_status = `[consented_free|consented_affiliate]`
- [ ] retailer_status přepnut na `active` (tlačítko v adminu / toggle-status API)
- [ ] Feed URL aktualizována (pokud dodali): `xml_feed_url = "..."`
- [ ] Nabídky produktů v DB ověřeny (minimálně 1 aktivní produkt)
- [ ] Prodejce viditelný v srovnávači — manuální ověření na frontendu
- [ ] Tento soubor uložen v `docs/legal/consents/[slug]-[YYYY-MM-DD].md`
- [ ] Pole `legalization_consent_ref` v DB aktualizováno na cestu k tomuto souboru
