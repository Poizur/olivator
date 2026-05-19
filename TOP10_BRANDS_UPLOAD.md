# 🏆 TOP 10 ZNAČEK — UPLOAD LOG

Tyto brandy jsou **featured na homepage** v sekci "Top značky olivového oleje".
Logo se zobrazí místo barevného placeholderu — prioritní upload!

Generováno: 2026-05-19 | Kritérium: reckonasbavi produkty ×2 + total produkty

---

## Status log

| # | Značka | Země | Produktů | Reckonasbavi | Logo? | Akce |
|---|--------|------|----------|--------------|-------|------|
| 1 | **Intini** | 🇮🇹 | 10 | 10 ✅ | ✅ má | — nic |
| 2 | **Lozano Červenka** | 🇪🇸 | 29 | 0 | ❌ chybí | [Hledat logo](https://www.google.com/search?q=Lozano+Cervenka+olivovy+olej+logo&tbm=isch) |
| 3 | **Corinto** | 🇬🇷 | 10 | 9 ✅ | ❌ chybí | [corinto.cz](https://www.corinto.cz) – vzít logo z webu |
| 4 | **Bartolini** | 🇮🇹 | 18 | 0 | ❌ chybí | [oliobartolini.com](https://www.oliobartolini.com) – vzít logo z webu |
| 5 | **Evoilino** | 🇬🇷 | 6 | 6 ✅ | ✅ má (5 fotek) | — nic |
| 6 | **Vafis** | 🇬🇷 | 17 | 0 | ✅ má | — nic |
| 7 | **Sitia Kréta** | 🇬🇷 | 5 | 5 ✅ | ❌ chybí | [sitiagold.gr](https://www.sitiagold.gr) – vzít logo |
| 8 | **Orino** | 🇬🇷 | 5 | 5 ✅ | ❌ chybí | [orino.gr](https://www.orino.gr) – vzít logo |
| 9 | **Chiavalon** | 🇭🇷 | 12 | 0 | ❌ chybí | [chiavalon.com](https://chiavalon.com) – vzít logo |
| 10 | **Casas de Hualdo** | 🇪🇸 | 12 | 0 | ❌ chybí | [casasdehualdo.com](https://casasdehualdo.com) – vzít logo |

**Shrnutí:** 3/10 má logo ✅ · 7/10 chybí ❌

---

## Jak nahrát logo (3 minuty/brand)

1. Otevři odkaz "Hledat logo" nebo navštiv web výrobce
2. Najdi transparentní PNG nebo SVG logo (minimálně 300×300 px)
3. **Admin → Značky → [název značky] → Fotky → Přidat URL**
4. `image_role` nastav na **logo** (ne gallery ani hero)
5. `is_primary` = ✓ zapnout
6. Uložit → logo se okamžitě zobrazí na homepage

> 💡 Tip: většina výrobců má logo v sekci "O nás" nebo v patičce webu.
> Klikni pravým tlačítkem na logo → "Kopírovat odkaz obrázku" → vlož do Adminu.

---

## Rychlé linky na Google Image Search

Klikni, hledej logo (transparent bg ideálně):

- [Lozano Červenka logo](https://www.google.com/search?q=Lozano+Cervenka+olive+oil+logo&tbm=isch)
- [Bartolini logo](https://www.google.com/search?q=Bartolini+olio+logo+png&tbm=isch)
- [Sitia Kréta / Sitia Gold logo](https://www.google.com/search?q=Sitia+Gold+olive+oil+logo+png&tbm=isch)
- [Orino logo](https://www.google.com/search?q=Orino+olive+oil+Greece+logo&tbm=isch)
- [Chiavalon logo](https://www.google.com/search?q=Chiavalon+olive+oil+logo+png&tbm=isch)
- [Casas de Hualdo logo](https://www.google.com/search?q=Casas+de+Hualdo+logo+png&tbm=isch)
- [Corinto logo](https://www.google.com/search?q=Corinto+olivovy+olej+logo&tbm=isch)

---

## Po uploadu

Logo se **okamžitě** zobrazí na homepage v sekci "Top značky" (bez rebuildu,
data se revalidují každou hodinu).
Sekce je živá na [olivator.cz](https://olivator.cz) — zkontroluj vizuálně.

---

## Změnit pořadí nebo značku v Top 10

V databázi přímo nebo přes SQL:
```sql
UPDATE brands SET featured_order = 2 WHERE slug = 'bartolini';  -- přesun na #2
UPDATE brands SET is_featured = false WHERE slug = 'chiavalon';  -- vyřadit
UPDATE brands SET is_featured = true, featured_order = 10 WHERE slug = 'motakis';  -- přidat
```
