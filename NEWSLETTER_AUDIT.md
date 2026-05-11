# Newsletter Audit — Olivator.cz
_Datum: 2026-05-11_

---

## Co máme

### Služba
**Resend.com** — API-first email provider. Integrace přes REST API (`https://api.resend.com/emails`).
- Odesílání transakcí i hromadných emailů
- Audience sync (volitelné, přes `NEWSLETTER_AUDIENCE_ID`)
- Webhooky pro tracking (delivered, opened, clicked, bounced, complained)

---

### Subscribers v DB

| Metrika | Hodnota |
|---|---|
| Tabulka | `newsletter_signups` |
| Celkový počet | _nelze zjistit bez admin přístupu_ |
| Potvrzených (`confirmed=true AND unsubscribed=false`) | _nelze zjistit bez admin přístupu_ |
| Cenové alerty (`price_alerts`, status='active') | _nelze zjistit bez admin přístupu_ |

> **Poznámka:** Počty jsou dostupné v admin UI na `/admin/newsletter`. Systém používá **single opt-in** — po vyplnění formuláře je uživatel okamžitě `confirmed=true`, bez potvrzovacího emailu. (Potvrzovací email = welcome email, ten se odesílá ale neblokuje signup.)

---

### Signup formulář — kde na webu

| Umístění | Komponenta | Varianta |
|---|---|---|
| **Footer** (všechny stránky) | `components/newsletter-signup.tsx` | `inline` — kompaktní, jen email |
| **Homepage** | `components/newsletter-signup.tsx` | `dark` — plný s výběrem preferencí |

**Preference subscriber:** `weekly` (týdenní digest), `deals` (slevy), `harvest` (sklizeň/novinky), `alerts` (cenové alerty).
Default při footeru: `{weekly: true, deals: true}`.

---

### Automatické emaily — co se posílá a kdy

| Email | Trigger | Šablona | Stav |
|---|---|---|---|
| **Welcome** | Hned po signup | `emails/welcome.tsx` | ✅ funkční |
| **Týdenní newsletter** | Středa 18:00 UTC generace, čtvrtek 8:00 UTC odeslání | `emails/weekly.tsx` | ✅ funkční, admin musí schválit |
| **Price alert — potvrzení** | Hned po nastavení alertu na produktové stránce | `emails/price-alert-confirm.tsx` | ✅ funkční |
| **Price alert — trigger** | Denně (cron), když cena klesne pod limit | `emails/price-alert.tsx` | ✅ funkční, cron musí být nastaven v Railway |

**Týdenní newsletter workflow:**
```
Středa 18:00 → /api/cron/newsletter-generate
  → AI vybere: olej týdne, slevy, nový příchod, recept, fakt
  → Claude Haiku vygeneruje subject + preheader
  → Draft uložen (status='draft')
  ↓
Admin zkontroluje na /admin/newsletter/drafts → klikne "Schválit"
  ↓
Čtvrtek 8:00 → /api/cron/newsletter-send
  → Odešle všem subscribers s odpovídajícími preferencemi
  → Resend loguje události → webhook → newsletter_events
```

---

### Email šablony

| Soubor | Účel |
|---|---|
| `emails/welcome.tsx` | Uvítací email po přihlášení k newsletteru |
| `emails/weekly.tsx` | Týdenní digest (olej týdne, slevy, recept, fakt) |
| `emails/price-alert.tsx` | Upozornění na pokles ceny (trigger email) |
| `emails/price-alert-confirm.tsx` | Potvrzení nastavení cenového alertu |
| `emails/_layout.tsx` | Sdílený layout (hlavička, patička, unsub link) |
| `emails/_components.tsx` | Sdílené komponenty (OilCard, SectionHeader, …) |

---

### Tracking

- **Resend webhooky:** `POST /api/webhooks/resend` — loguje `delivered`, `opened`, `clicked`, `bounced`, `complained`
- **DB tabulky:** `newsletter_sends` (1 řádek = 1 odeslaný email), `newsletter_events` (granulární kliknutí)
- **Odhlášení:** Token-based, `GET /api/newsletter/unsubscribe?token=xxx` → soft delete (`unsubscribed=true`)

---

## Co chybí

### Kritické
1. **`NEWSLETTER_AUDIENCE_ID` není v .env.local** — kód ho používá pro sync odhlášených do Resend Audiences. Bez něj funguje odhlášení jen v naší DB, ne v Resend — riziko, že Resend pošle email i odhlášenému (pokud bys někdy posílal přes Resend dashboard přímo).

2. **Railway cron pro price-alerts není potvrzen** — endpoint `/api/cron/price-alerts` existuje, ale je potřeba ověřit, že Railway cron job skutečně běží každý den.

3. **Resend webhook URL není registrována v Resend dashboardu** — endpoint `POST /api/webhooks/resend` existuje v kódu, ale musí být zaregistrován na `resend.com/webhooks`. Bez toho se tracking (opened, clicked, bounced) nezapisuje.

### Funkční mezery
4. **Double opt-in není** — přihlášení je okamžité. Welcome email se odesílá, ale bez potvrzovacího kliknutí. (Pro CZ/SK trh GDPR-ok, ale je to soft závazek.)

5. **Preference centrum pro uživatele** — subscriber nemůže změnit preference přes web (jen odhlásit). Chybí stránka `/nastaveni-newsletteru`.

6. **`newsletter_weekly_enabled` a `newsletter_enabled` settings** — musí být zapnuto v DB přes admin UI (`/admin/newsletter/settings`). Bez toho cron vygeneruje draft ale nepošle.

---

## Env variables (pouze názvy)

### Nastaveno v .env.local
```
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_NEWSLETTER_FROM
RESEND_WEBHOOK_SECRET
```

### Chybí v .env.local (kód je používá)
```
NEWSLETTER_AUDIENCE_ID       ← sync odhlášených do Resend Audiences
```

### Nesouvisí s emailem ale v .env.local jsou
```
ADMIN_SECRET_KEY
ANTHROPIC_API_KEY
CRON_SECRET
GITHUB_REPO
GITHUB_TOKEN
NEXT_PUBLIC_GA4_ID
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NODE_ENV
RAILWAY_TOKEN
SUPABASE_SERVICE_KEY
UNSPLASH_ACCESS_KEY
```

---

## Souhrn — stav k 2026-05-11

✅ Infrastruktura kompletní (DB, šablony, API routes, tracking)
✅ Welcome email odesílán po signup
✅ Price alert potvrzovací email odesílán
✅ Týdenní newsletter pipeline funkční
⚠️ Chybí `NEWSLETTER_AUDIENCE_ID` v env
⚠️ Ověřit Resend webhook URL registraci
⚠️ Ověřit Railway cron pro price-alerts
⚠️ Settings `newsletter_enabled` a `newsletter_alerts_enabled` musí být zapnuty v admin UI
