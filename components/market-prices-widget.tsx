// Cenový widget — velkoobchodní ceny EVOO ze tří hlavních trhů. Data z IOC
// měsíčního reportu, manuálně aktualizováno adminem 1× týdně.
//
// Variants:
//   - 'card'    — full-width karta s outer wrapper (homepage / standalone)
//   - 'sidebar' — kompaktní bez section, vhodné do /novinky postraního panelu

import { supabaseAdmin } from '@/lib/supabase'

interface MarketPriceRow {
  market: string
  price_eur: number
  change_pct: number | null
  week_of: string
  source: string | null
  source_url: string | null
}

interface Props {
  variant?: 'card' | 'sidebar'
}

function formatEur(n: number): string {
  return `€${n.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })}`
}

function formatChange(pct: number | null): { text: string; color: string; arrow: string } {
  if (pct == null) return { text: '—', color: 'text-text3', arrow: '' }
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  const color = pct > 0 ? 'text-amber-700' : pct < 0 ? 'text-olive-dark' : 'text-text3'
  const sign = pct > 0 ? '+' : ''
  return { text: `${sign}${pct.toFixed(1)} %`, color, arrow }
}

function formatWeek(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function MarketPricesWidget({ variant = 'card' }: Props = {}) {
  const { data: latestRow } = await supabaseAdmin
    .from('market_prices')
    .select('week_of')
    .eq('is_published', true)
    .order('week_of', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRow) return null

  const { data, error } = await supabaseAdmin
    .from('market_prices')
    .select('market, price_eur, change_pct, week_of, source, source_url')
    .eq('is_published', true)
    .eq('week_of', latestRow.week_of as string)
    .order('sort_order', { ascending: true })
    .limit(5)

  if (error || !data || data.length === 0) return null

  const rows = data as MarketPriceRow[]
  const firstSource = rows[0]?.source_url
  const isSidebar = variant === 'sidebar'

  const inner = (
    <div className={`bg-white border border-off2 rounded-[var(--radius-card)] ${isSidebar ? 'p-4' : 'p-5 md:p-7'}`}>
      <div className={`flex items-end justify-between flex-wrap gap-2 ${isSidebar ? 'mb-3' : 'mb-4'}`}>
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1">
            🫒 Velkoobchod
          </div>
          <h2 className={`font-[family-name:var(--font-display)] ${isSidebar ? 'text-base' : 'text-xl md:text-2xl'} text-text leading-tight`}>
            EVOO tento týden
          </h2>
        </div>
        {!isSidebar && (
          <div className="text-[11px] text-text3">
            Zdroj: {rows[0]?.source ?? 'IOC'} · {formatWeek(rows[0].week_of)}
          </div>
        )}
      </div>

      <ul className="divide-y divide-off">
        {rows.map((r) => {
          const change = formatChange(r.change_pct)
          if (isSidebar) {
            return (
              <li key={r.market} className="py-2">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-text font-medium truncate">{r.market}</span>
                  <span className={`tabular-nums whitespace-nowrap font-medium ${change.color} text-[11px]`}>
                    {change.arrow} {change.text}
                  </span>
                </div>
                <div className="text-text2 tabular-nums text-[11px] mt-0.5">
                  {formatEur(r.price_eur)} <span className="text-text3">/ 100 kg</span>
                </div>
              </li>
            )
          }
          return (
            <li
              key={r.market}
              className="grid grid-cols-[1fr_auto_auto] gap-4 py-2.5 items-baseline text-[14px]"
            >
              <span className="text-text font-medium">{r.market}</span>
              <span className="text-text2 tabular-nums whitespace-nowrap">
                {formatEur(r.price_eur)} <span className="text-text3 text-[12px]">/ 100 kg</span>
              </span>
              <span className={`tabular-nums whitespace-nowrap font-medium ${change.color}`}>
                {change.arrow} {change.text}
              </span>
            </li>
          )
        })}
      </ul>

      <div className={`flex items-center justify-between gap-2 flex-wrap border-t border-off ${isSidebar ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
        <span className="text-[10px] text-text3">
          {isSidebar ? `IOC · ${formatWeek(rows[0].week_of)}` : ''}
        </span>
        {firstSource && (
          <a
            href={firstSource}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-text3 hover:text-olive"
          >
            Plná data ↗
          </a>
        )}
      </div>
    </div>
  )

  if (isSidebar) return inner

  return (
    <section className="max-w-[1080px] mx-auto px-6 md:px-10 mt-10 mb-12">
      {inner}
    </section>
  )
}
