'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'olivator_cookie_consent'
type Consent = 'analytics' | 'essential' | null

export default function CookiesPage() {
  const [consent, setConsent] = useState<Consent | 'loading'>('loading')

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as Consent | null
    setConsent(stored)
  }, [])

  function saveConsent(value: Consent) {
    if (value === null) {
      localStorage.removeItem(CONSENT_KEY)
    } else {
      localStorage.setItem(CONSENT_KEY, value)
    }
    setConsent(value)
  }

  const consentLabel =
    consent === 'loading' ? '…' :
    consent === 'analytics' ? 'Přijmout vše' :
    consent === 'essential' ? 'Jen nezbytné' :
    'Nezvoleno'

  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>{' › '}
        <span>Cookies</span>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        Cookies
      </h1>
      <p className="text-[14px] text-text3 mb-10">
        Přehled cookies a správa souhlasu · platné od 24. 7. 2026
      </p>

      {/* ── Aktuální nastavení ── */}
      <section className="mb-10 bg-off rounded-xl px-5 py-5 border border-off2">
        <h2 className="text-[15px] font-semibold text-text mb-3">Vaše aktuální nastavení</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[13px] text-text2">Zvolená volba:</span>
          <span className={`text-[12px] font-medium px-3 py-1 rounded-full ${
            consent === 'analytics'
              ? 'bg-olive/10 text-olive border border-olive/20'
              : consent === 'essential'
              ? 'bg-off2 text-text2 border border-off2'
              : 'bg-off2 text-text3 border border-off2'
          }`}>
            {consentLabel}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => saveConsent('essential')}
            className={`px-4 py-1.5 text-[12px] border rounded-full transition-colors ${
              consent === 'essential'
                ? 'bg-text text-white border-text'
                : 'border-off2 text-text hover:border-olive/40'
            }`}
          >
            Jen nezbytné
          </button>
          <button
            onClick={() => saveConsent('analytics')}
            className={`px-4 py-1.5 text-[12px] rounded-full transition-colors font-medium ${
              consent === 'analytics'
                ? 'bg-olive text-white'
                : 'bg-olive text-white hover:bg-[#1b4332]'
            }`}
          >
            Přijmout vše
          </button>
        </div>
        <p className="text-[12px] text-text3 mt-3">
          Změna se projeví okamžitě — stránku není třeba obnovovat.
          Google Analytics se nenačte, dokud nezvolíte „Přijmout vše".
        </p>
      </section>

      {/* ── Co jsou cookies ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Co jsou cookies
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Cookies jsou malé textové soubory ukládané prohlížečem do vašeho zařízení při návštěvě
          webu. Umožňují webům zapamatovat si vaše preference a anonymně měřit návštěvnost.
          Olivátor používá cookies v minimálním rozsahu nezbytném pro fungování webu.
        </p>
      </section>

      {/* ── Tabulka cookies ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Přehled cookies
        </h2>

        <h3 className="text-[15px] font-semibold text-text mb-2">Nezbytné cookies</h3>
        <p className="text-[13px] text-text3 mb-3">
          Tyto cookies jsou nezbytné pro fungování webu. Nelze je vypnout.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-off border-b border-off2">
                <th className="text-left px-3 py-2 font-semibold text-text">Název</th>
                <th className="text-left px-3 py-2 font-semibold text-text">Účel</th>
                <th className="text-left px-3 py-2 font-semibold text-text">Platnost</th>
                <th className="text-left px-3 py-2 font-semibold text-text">Typ</th>
              </tr>
            </thead>
            <tbody className="text-text2">
              <tr className="border-b border-off2">
                <td className="px-3 py-2 font-mono">olivator_cookie_consent</td>
                <td className="px-3 py-2">Uložení vaší volby v cookie banneru (nezbytné / analytika)</td>
                <td className="px-3 py-2">1 rok</td>
                <td className="px-3 py-2">localStorage</td>
              </tr>
              <tr className="border-b border-off2">
                <td className="px-3 py-2 font-mono">compare_items</td>
                <td className="px-3 py-2">Produkty v comparatoru (stav across stránek)</td>
                <td className="px-3 py-2">Relace</td>
                <td className="px-3 py-2">localStorage</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">wishlist_items</td>
                <td className="px-3 py-2">Oblíbené produkty (nepřihlášený uživatel)</td>
                <td className="px-3 py-2">30 dní</td>
                <td className="px-3 py-2">localStorage</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-[15px] font-semibold text-text mb-2">Analytické cookies (Google Analytics 4)</h3>
        <p className="text-[13px] text-text3 mb-3">
          Tyto cookies se načtou <strong>pouze po udělení souhlasu</strong> v cookie banneru.
          Pomáhají nám pochopit, které stránky jsou populární a jak web zlepšovat.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-off border-b border-off2">
                <th className="text-left px-3 py-2 font-semibold text-text">Název</th>
                <th className="text-left px-3 py-2 font-semibold text-text">Účel</th>
                <th className="text-left px-3 py-2 font-semibold text-text">Platnost</th>
                <th className="text-left px-3 py-2 font-semibold text-text">Vlastník</th>
              </tr>
            </thead>
            <tbody className="text-text2">
              <tr className="border-b border-off2">
                <td className="px-3 py-2 font-mono">_ga</td>
                <td className="px-3 py-2">Rozlišení unikátních návštěvníků (pseudonymizované ID)</td>
                <td className="px-3 py-2">2 roky</td>
                <td className="px-3 py-2">Google LLC</td>
              </tr>
              <tr className="border-b border-off2">
                <td className="px-3 py-2 font-mono">_ga_*</td>
                <td className="px-3 py-2">Udržení stavu relace v GA4</td>
                <td className="px-3 py-2">2 roky</td>
                <td className="px-3 py-2">Google LLC</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">_gid</td>
                <td className="px-3 py-2">Rozlišení návštěvníků po dobu 24 hodin</td>
                <td className="px-3 py-2">24 hodin</td>
                <td className="px-3 py-2">Google LLC</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-text3 mt-3">
          IP adresa je anonymizována před uložením. Data nejsou sdílena pro reklamní účely.
          Více:{' '}
          <a
            href="https://policies.google.com/privacy"
            className="text-olive underline decoration-dotted"
            target="_blank"
            rel="noopener noreferrer"
          >
            Zásady ochrany soukromí Google
          </a>.
        </p>
      </section>

      {/* ── Jak vypnout ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Jak spravovat cookies v prohlížeči
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Souhlas s analytickými cookies změníte výše na této stránce nebo v banneru při
          příští návštěvě (po smazání souhlasu v localStorage).
        </p>
        <p className="text-[14px] text-text2 leading-relaxed">
          Cookies lze také spravovat přímo v prohlížeči — Nastavení &rarr; Soukromí.
          Smazání všech cookies způsobí, že se při příští návštěvě znovu zobrazí cookie banner.
        </p>
      </section>

      <div className="mt-12 pt-6 border-t border-off2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-text3">
        <span>Cookie politika platná od 24. července 2026.</span>
        <Link href="/ochrana-osobnich-udaju" className="text-olive underline decoration-dotted">
          Zásady ochrany osobních údajů →
        </Link>
      </div>
    </div>
  )
}
