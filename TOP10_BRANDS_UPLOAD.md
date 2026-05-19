# 🏆 TOP 10 ZNAČEK — UPLOAD LOG

Tyto brandy jsou **featured na homepage** v sekci "Top značky olivového oleje".
Logo se zobrazí místo barevného placeholderu — prioritní upload!

Generováno: 2026-05-19  
Kritérium: reckonasbavi.cz produkty ×2 + italyshop.cz produkty ×2 + total produkty  
Provize: reckonasbavi 10 % · italyshop 7,5 %

---

## Status log

| # | Značka | Země | Produktů | Reckonasbavi | Italyshop | Score | Logo? | Akce |
|---|--------|------|----------|:---:|:---:|:---:|:---:|------|
| 1 | **Bartolini** | 🇮🇹 | 18 | — | 18 ✅ | 54 | ❌ chybí | [oliobartolini.com](https://www.oliobartolini.com) |
| 2 | **Intini** | 🇮🇹 | 10 | 10 ✅ | — | 30 | ✅ má | — nic |
| 3 | **Lozano Červenka** | 🇪🇸 | 29 | — | — | 29 | ❌ chybí | [Hledat logo](https://www.google.com/search?q=Lozano+Cervenka+olivovy+olej+logo&tbm=isch) |
| 4 | **Corinto** | 🇬🇷 | 10 | 9 ✅ | — | 27 | ❌ chybí | [corinto.cz](https://www.corinto.cz) |
| 5 | **Evoilino** | 🇬🇷 | 6 | 6 ✅ | — | 18 | ✅ má (5 fotek) | — nic |
| 6 | **Vafis** | 🇬🇷 | 17 | — | — | 17 | ✅ má | — nic |
| 7 | **Orino** | 🇬🇷 | 5 | 5 ✅ | — | 15 | ❌ chybí | [orino.gr](https://www.orino.gr) |
| 8 | **Sitia Kréta** | 🇬🇷 | 5 | 5 ✅ | — | 15 | ❌ chybí | [sitiagold.gr](https://www.sitiagold.gr) |
| 9 | **Antica Sicilia** | 🇮🇹 | 5 | — | 5 ✅ | 15 | ❌ chybí | [anticasicilia.it](https://anticasicilia.it) |
| 10 | **Chiavalon** | 🇭🇷 | 12 | — | — | 12 | ❌ chybí | [chiavalon.com](https://chiavalon.com) |

**Shrnutí:** 3/10 má logo ✅ · 7/10 chybí ❌

---

## Jak nahrát logo (3 minuty/brand)

1. Navštiv web výrobce nebo klikni na odkaz výše
2. Najdi transparentní PNG nebo SVG logo (min 300×300 px)
3. **Admin → Značky → [název značky] → Fotky → Přidat URL**
4. `image_role` nastav na **logo** (ne gallery ani hero)
5. `is_primary` = ✓ zapnout
6. Uložit → logo se okamžitě zobrazí na homepage

> 💡 Tip: většina výrobců má logo v sekci "O nás" nebo v patičce webu.
> Klikni pravým na logo → "Kopírovat odkaz obrázku" → vlož do Adminu.

---

## Rychlé linky na Google Image Search

- [Bartolini logo](https://www.google.com/search?q=Olio+Bartolini+logo+png&tbm=isch)
- [Lozano Červenka logo](https://www.google.com/search?q=Lozano+Cervenka+olive+oil+logo&tbm=isch)
- [Corinto logo](https://www.google.com/search?q=Corinto+olivovy+olej+logo&tbm=isch)
- [Orino logo](https://www.google.com/search?q=Orino+olive+oil+Greece+logo&tbm=isch)
- [Sitia Kréta / Sitia Gold logo](https://www.google.com/search?q=Sitia+Gold+olive+oil+logo+png&tbm=isch)
- [Antica Sicilia logo](https://www.google.com/search?q=Antica+Sicilia+olive+oil+logo+png&tbm=isch)
- [Chiavalon logo](https://www.google.com/search?q=Chiavalon+olive+oil+logo+png&tbm=isch)

---

## Změnit pořadí nebo složení Top 10

```sql
-- Přesunout na jinou pozici
UPDATE brands SET featured_order = 1 WHERE slug = 'bartolini';

-- Vyřadit z top 10
UPDATE brands SET is_featured = false, featured_order = NULL WHERE slug = 'chiavalon';

-- Přidat novou značku
UPDATE brands SET is_featured = true, featured_order = 10 WHERE slug = 'motakis';
```
