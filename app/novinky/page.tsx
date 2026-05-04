// Public stránka Novinky — feed novinek o olivovém oleji ze světového tisku.
// Cron 1× za 2 hodiny aktualizuje radar_items (interní název tabulky).
// Layout: 2-column s sticky sidebar pro cenový widget.

import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { MarketPricesWidget } from '@/components/market-prices-widget'

export const metadata: Metadata = {
  title: 'Novinky ze světa olivového oleje | Olivátor',
  description:
    'Sklizně, ceny, ocenění. Aktuální zprávy ze světového tisku o olivovém oleji, přeložené do češtiny. Aktualizováno každé 2 hodiny.',
  alternates: { canonical: 'https://olivator.cz/novinky' },
}

// Cron běží každé 2h, page revalidate 2h = po každé runu se zobrazí nové
export const revalidate = 7200

const BADGE_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  harvest: { emoji: '🫒', label: 'Sklizeň',  bg: 'bg-olive-bg',   text: 'text-olive-dark' },
  price:   { emoji: '💰', label: 'Ceny',     bg: 'bg-amber-50',   text: 'text-amber-800' },
  award:   { emoji: '🏆', label: 'Ocenění',  bg: 'bg-yellow-50',  text: 'text-yellow-800' },
  science: { emoji: '🔬', label: 'Věda',     bg: 'bg-blue-50',    text: 'text-blue-700' },
  quality: { emoji: '✓',  label: 'Kvalita',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
  news:    { emoji: '📡', label: 'Novinky',  bg: 'bg-off',        text: 'text-text2' },
}

const SOURCE_LABEL: Record<string, string> = {
  oliveoiltimes:    'Olive Oil Times',
  ioc:              'International Olive Council',
  evooworld:        'EVOO World',
  certifiedorigins: 'Certified Origins',
  googlenews_olive: 'Google News (EN)',
  googlenews_cz:    'Google News (CZ)',
}

interface NewsItemRow {
  id: string
  source: string | null
  original_url: string | null
  czech_title: string
  czech_summary: string
  cz_context: string | null
  badge: string | null
  published_at: string | null
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const minutes = Math.round((Date.now() - d.getTime()) / 60000)
  if (minutes < 1) return 'právě teď'
  if (minutes < 60) return `před ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `před ${hours} ${hours === 1 ? 'hodinou' : hours < 5 ? 'hodinami' : 'hodinami'}`
  const days = Math.round(hours / 24)
  if (days < 7) return `před ${days} ${days === 1 ? 'dnem' : days < 5 ? 'dny' : 'dny'}`
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

export default async function NovinkyPage() {
  const { data, error } = await supabaseAdmin
    .from('radar_items')
    .select('id, source, original_url, czech_title, czech_summary, cz_context, badge, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[novinky/page] query failed:', error.message)
  }

  const items = (data ?? []) as NewsItemRow[]

  return (
    <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-12">
      <div className="text-xs text-text3 mb-4">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        Novinky
      </div>

      <div className="mb-10 max-w-[760px]">
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-normal text-text mb-3 leading-tight">
          📡 Novinky ze světa olivového oleje
        </h1>
        <p className="text-[15px] text-text2 leading-relaxed">
          Sklizně, ceny, ocenění a věda. Vybíráme zprávy ze světového tisku co reálně
          hýbou trhem. <strong>Aktualizováno každé 2 hodiny</strong> · zdroje:
          Olive Oil Times, IOC, Google News.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-10 items-start">
        {/* Main column — feed */}
        <div className="min-w-0 max-w-[760px]">
          {items.length === 0 ? (
            <div className="bg-off/40 border border-off2 rounded-xl p-10 text-center">
              <div className="text-3xl mb-3">📡</div>
              <h2 className="text-[16px] font-medium text-text mb-1">Zatím žádné novinky</h2>
              <p className="text-[13px] text-text3">
                Sběr právě začíná. Přijď za pár hodin — pravidelně skenujeme světový tisk.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const badge = BADGE_CONFIG[item.badge ?? 'news'] ?? BADGE_CONFIG.news
                const sourceLabel = SOURCE_LABEL[item.source ?? ''] ?? item.source ?? 'Neznámý zdroj'
                return (
                  <article
                    key={item.id}
                    className="bg-white border border-off2 rounded-xl p-5 md:p-6 hover:border-olive3/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]">
                      <span
                        className={`${badge.bg} ${badge.text} rounded-full px-2.5 py-0.5 font-semibold inline-flex items-center gap-1`}
                      >
                        <span>{badge.emoji}</span>
                        {badge.label}
                      </span>
                      <span className="text-text3">·</span>
                      <span className="text-text3">{sourceLabel}</span>
                      <span className="text-text3">·</span>
                      <span className="text-text3 tabular-nums">{formatRelativeTime(item.published_at)}</span>
                    </div>

                    <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl text-text leading-tight mb-2">
                      {item.czech_title}
                    </h2>
                    <p className="text-[14px] text-text2 leading-relaxed mb-3">
                      {item.czech_summary}
                    </p>
                    {item.cz_context && (
                      <div className="bg-olive-bg/40 border-l-2 border-olive rounded-r px-4 py-2 text-[13px] text-olive-dark mb-3">
                        <strong className="font-medium">Pro Česko:</strong> {item.cz_context}
                      </div>
                    )}
                    {item.original_url && (
                      <a
                        href={item.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-olive hover:text-olive-dark"
                      >
                        Originální článek
                        <span className="text-[11px] opacity-70">↗</span>
                      </a>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-off">
            <p className="text-[12px] text-text3 leading-relaxed">
              Stránka funguje na bázi RSS scanneru — fetchne novinky ze světových odborných
              médií, deduplikuje (fingerprint hash + AI judge), přeloží do češtiny přes
              Claude AI a publikuje. Jen zprávy s konkrétním dopadem (sklizeň, ceny, ocenění,
              regulace) — žádný marketing.
            </p>
          </div>
        </div>

        {/* Sidebar — sticky cenový widget. lg:self-start aby grid-row nestretchl
            sidebar na výšku main column (sticky pak nemá kde klouzat). */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-5">
          <MarketPricesWidget variant="sidebar" />

          {/* Kontext — proč jsou velkoobchodní ceny zajímavé pro běžného čtenáře */}
          <div className="bg-olive-bg/40 border border-olive-border/60 rounded-xl p-4 text-[12px] text-olive-dark leading-relaxed">
            <div className="text-[10px] font-bold tracking-widest uppercase mb-1.5">
              Co tato čísla znamenají
            </div>
            <p className="mb-2">
              <strong>€407 / 100 kg = 4 €/kg ≈ 100 Kč/kg</strong> — to je co
              dostává <em>výrobce</em> ve Španělsku za surovinu.
            </p>
            <p className="mb-2">
              V eshopu vidíš <strong>250–500 Kč/litr</strong>. Rozdíl jde na
              dovoz, balení, marži obchodu a DPH.
            </p>
            <p className="text-text2">
              <strong>↓ pokles velkoobchodu</strong> = za 2–3 měsíce mohou klesnout
              i ceny v eshopu. Reakce v retailu je pomalá — sleduj tady, predikuj tam.
            </p>
          </div>

          {/* Vysvětlení šipky */}
          <div className="bg-off/40 border border-off2 rounded-xl p-4 text-[11px] text-text3 leading-relaxed">
            <div className="text-[10px] font-bold tracking-widest uppercase text-text2 mb-1.5">
              Jak číst trend
            </div>
            <div className="space-y-1.5">
              <div><span className="text-olive-dark font-medium">↓ zelená</span> — cena klesá (dobré za pár měsíců pro spotřebitele)</div>
              <div><span className="text-amber-700 font-medium">↑ amber</span> — cena roste (může se promítnout do retailu)</div>
              <div><span className="text-text3">→ šedá</span> — stabilní</div>
            </div>
            <div className="mt-2 pt-2 border-t border-off2">
              Aktualizace po IOC reportu (cca 1× měsíčně, vždy se zpožděním 2–3 týdnů).
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
