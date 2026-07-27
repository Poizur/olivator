# Reaktivační checklist — karanténní shop obdržel souhlas

Rutina po přijetí souhlasu od prodejce. Celý postup: **5–10 minut**.

---

## 1. Záznam souhlasu (2 min)

1. Zkopíruj `docs/legal/consents/_template.md`
2. Přejmenuj na `[slug]-[YYYY-MM-DD].md` (např. `lozanocervenka-2026-07-28.md`)
3. Vyplň všechna pole — shop, datum, consent_type, citaci odpovědi
4. Ulož soubor, commitni: `git commit -m "legal: souhlas [shop] [datum]"`

---

## 2. Admin UI — legalization_status (1 min)

1. Otevři `/admin/retailers`
2. Najdi shop v sekci **Karanténa**
3. V sloupci **Kampaň** nastav dropdown na `consented_free` nebo `consented_affiliate`
4. Status se uloží automaticky + zapíše datum

---

## 3. Feed URL (pokud shop dodal) (1 min)

- Klikni **Upravit →** u prodejce
- Vyplň `XML Feed URL` a nastav formát (`heureka` nebo `google`)
- Ulož

---

## 4. Reaktivace (přepnutí do active) (30 s)

- V řádku prodejce klikni **→ Aktivovat**
- Potvrď dialog (nabídky se okamžitě stanou viditelnými)

---

## 5. Ověření (2 min)

- Otevři jednu produktovou stránku prodejce v `/srovnavac`
- Ověř že se zobrazuje cena a odkaz `→ Koupit` směřuje správně
- Ověř `/go/[retailer-slug]/[product-slug]` → redirect funguje

---

## 6. Zápis do consent záznamu (30 s)

- Vrať se do souboru `docs/legal/consents/[slug]-[YYYY-MM-DD].md`
- Zaškrtni všechny checkboxy v sekci **Akce při aktivaci**
- Vyplň pole `legalization_consent_ref` v DB: API PATCH nebo přes admin (pole Consent ref)

---

## Schéma typů souhlasu

| Typ | Popis | Výsledek |
|-----|-------|---------|
| `consented_free` | Shop souhlasí se zobrazením zdarma (dáváme mu expozici, on nemusí platit) | Reaktivovat |
| `consented_affiliate` | Shop souhlasí s affiliate provizí a dodal/potvrdil URL | Reaktivovat + ověřit affiliate URL |
| `declined` | Shop explicitně odmítl | Ponechat v karanténě, poznámka do záznamu |
| `no_response` | 2+ týdny bez odpovědi | Ponechat v karanténě, přehodnotit za 30 dní |

---

## Pokud shop odmítl

1. Nastav `legalization_status = declined`
2. V poznámce v záznamu souhlasu zapiš citaci odmítnutí
3. Shop zůstává v karanténě
4. Za 90 dní zkontroluj: pokud stále karanténa + declined → zvaž `removed_legal`

---

## Rychlý přehled stavů (DB)

```
legalization_status = NULL          → nebyl kontaktován (výchozí)
                    = email_sent    → email odeslán, čekáme
                    = consented_free        → souhlas, zdarma
                    = consented_affiliate   → souhlas s affiliate
                    = declined              → odmítl
                    = no_response           → 2+ týdny bez odpovědi
```
