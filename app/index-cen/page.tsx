import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Index cen olivového oleje v ČR | Olivátor',
  description: 'Měsíční mediánová cena extra panenského olivového oleje (EVOO) v ČR v Kč/litr. Zdroj dat pro média, novináře a AI systémy. Olivátor.cz.',
  alternates: { canonical: 'https://olivator.cz/index-cen' },
  openGraph: {
    type: 'website',
    url: 'https://olivator.cz/index-cen',
    title: 'Index cen olivového oleje v ČR — Olivátor',
    description: 'Měsíční mediánová cena EVOO v ČR. Nezávislá data z 19 prodejců, 400+ produktů.',
  },
}

interface SnapshotRow {
  month: string
  segment: string
  median_czk_l: number
  avg_czk_l: number
  product_count: number
  retailer_count: number
  computed_at: string
  notes: string | null
}

async function fetchSnapshots(): Promise<SnapshotRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('price_index_snapshots')
      .select('month, segment, median_czk_l, avg_czk_l, product_count, retailer_count, computed_at, notes')
      .order('month', { ascending: false })
      .limit(70)
    return (data ?? []) as SnapshotRow[]
  } catch {
    return []
  }
}

const MONTHS_LONG = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const MONTHS_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince']
const ORIGIN_NAMES: Record<string, string> = { 'origin:GR': 'Řecko', 'origin:IT': 'Itálie', 'origin:ES': 'Španělsko' }

function formatMonthLong(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  return `${MONTHS_LONG[parseInt(month) - 1]} ${year}`
}
function formatMonthGen(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  return `${MONTHS_GEN[parseInt(month) - 1]} ${year}`
}
function formatMonthShort(yyyymm: string): string {
  const [, month] = yyyymm.split('-')
  return `${MONTHS_GEN[parseInt(month) - 1].slice(0, 3)}.`
}

function computeInsights(byKey: Record<string, SnapshotRow>): string[] {
  const insights: string[] = []
  const it = byKey['origin:IT'], gr = byKey['origin:GR']
  if (it && gr && gr.median_czk_l > 0) {
    const ratio = (it.median_czk_l / gr.median_czk_l).toFixed(1)
    insights.push(`Italský olej je v ČR ${ratio}× dražší než řecký (${Math.round(it.median_czk_l)} vs ${Math.round(gr.median_czk_l)} Kč/l mediánem).`)
  }
  const prem = byKey['premium'], eco = byKey['economy']
  if (prem && eco && eco.median_czk_l > 0) {
    const ratio = (prem.median_czk_l / eco.median_czk_l).toFixed(1)
    insights.push(`Prémiový segment je ${ratio}× dražší než ekonomický (${Math.round(prem.median_czk_l)} vs ${Math.round(eco.median_czk_l)} Kč/l).`)
  }
  const all = byKey['all']
  if (all && all.median_czk_l > 0) {
    const gapPct = Math.round(((all.avg_czk_l - all.median_czk_l) / all.median_czk_l) * 100)
    if (gapPct > 15) {
      insights.push(`Průměr (${Math.round(all.avg_czk_l)} Kč/l) je o ${gapPct} % vyšší než medián — trh táhnou nahoru drahé prémiové oleje.`)
    }
  }
  const origins = ['origin:GR', 'origin:IT', 'origin:ES']
    .map(k => byKey[k]).filter(Boolean).sort((a, b) => a.median_czk_l - b.median_czk_l)
  if (origins.length >= 3) {
    const cheapest = origins[0]
    insights.push(`Nejdostupnější EVOO pochází z ${ORIGIN_NAMES[cheapest.segment] ?? cheapest.segment} — medián ${Math.round(cheapest.median_czk_l)} Kč/l.`)
  }
  return insights
}

function fmt(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

export default async function IndexCenPage() {
  const rows = await fetchSnapshots()

  // Skupiny po měsících; nejnovější měsíc první
  const months = [...new Set(rows.map(r => r.month))].sort().reverse()

  if (rows.length === 0 || months.length === 0) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-24 text-center">
        <p className="text-sm text-[var(--color-text2)] uppercase tracking-widest mb-4">Datový index · Olivátor.cz</p>
        <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-normal mb-6">Index cen olivového oleje v ČR</h1>
        <p className="text-[var(--color-text2)]">Data se připravují. Index bude dostupný od příštího měsíce.</p>
      </div>
    )
  }

  const latestMonth = months[0]
  const latestRows = rows.filter(r => r.month === latestMonth)
  const byKey = Object.fromEntries(latestRows.map(r => [r.segment, r]))
  const all = byKey['all']
  const insights = computeInsights(byKey)
  const trendMonths = months.slice(0, 12)
  const trendData = trendMonths.map(m => rows.find(r => r.month === m && r.segment === 'all')).filter(Boolean) as SnapshotRow[]
  const maxMedian = Math.max(...trendData.map(d => d.median_czk_l))

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Index cen olivového oleje v ČR — Olivátor',
    description: `Měsíční mediánová cena extra panenského olivového oleje (EVOO) v České republice. Počítáno z nejnižší in-stock ceny od ${all?.retailer_count ?? '19'} prodejců, ${all?.product_count ?? '370'}+ produktů.`,
    url: 'https://olivator.cz/index-cen',
    creator: { '@type': 'Organization', name: 'Olivátor.cz', url: 'https://olivator.cz' },
    dateModified: all?.computed_at?.slice(0, 10) ?? latestMonth + '-01',
    measurementTechnique: 'Medián nejnižší in-stock ceny per produkt, normalizováno na Kč/litr. Vylučujeme dárkové sady a cenové odchylky >4× medián segmentu.',
    variableMeasured: 'Cena extra panenského olivového oleje v Kč/litr',
    temporalCoverage: (months[months.length - 1] ?? latestMonth) + '/',
    spatialCoverage: 'CZ',
    license: 'https://olivator.cz/index-cen',
  }

  const SEGS = [
    { key: 'economy', label: 'Ekonomy', sub: '<400 Kč/l' },
    { key: 'standard', label: 'Standard', sub: '400–800 Kč/l' },
    { key: 'premium', label: 'Premium', sub: '800+ Kč/l' },
  ]
  const ORIGINS = [
    { key: 'origin:GR', label: 'Řecko 🇬🇷' },
    { key: 'origin:IT', label: 'Itálie 🇮🇹' },
    { key: 'origin:ES', label: 'Španělsko 🇪🇸' },
  ]

  const citationText = `"Podle Indexu cen Olivátor.cz činila mediánová cena extra panenského olivového oleje v ČR v ${formatMonthGen(latestMonth)} ${all ? Math.round(all.median_czk_l) : '—'} Kč/l (zdroj: olivator.cz/index-cen)"`

  return (
    <div className="max-w-[760px] mx-auto px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />

      {/* Hero */}
      <div className="mb-14">
        <p className="text-xs text-[var(--color-text3,#888)] uppercase tracking-widest mb-5">Datový index · Olivátor.cz</p>
        <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-[2rem] font-normal text-[var(--color-text,#1d1d1f)] mb-6 leading-tight">
          Index cen olivového oleje v ČR
        </h1>
        {all && (
          <>
            <div className="flex items-end gap-4 mb-4">
              <span className="text-[72px] font-bold leading-none tabular-nums" style={{ color: 'var(--color-terra,#c4711a)' }}>
                {Math.round(all.median_czk_l)}
              </span>
              <div className="pb-2">
                <div className="text-xl font-light text-[var(--color-text2,#555)]">Kč/l</div>
                <div className="text-xs text-[var(--color-text3,#888)]">mediánová cena EVOO</div>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text2,#555)]">
              {formatMonthLong(latestMonth)} · {all.product_count} produktů · {all.retailer_count} prodejců
            </p>
          </>
        )}
      </div>

      {/* Segmenty */}
      <section className="mb-12">
        <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-normal mb-5">Segmenty trhu</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-olive-border,#ccc)]">
                <th className="text-left pb-2 font-medium text-[var(--color-text2,#555)]">Segment</th>
                <th className="text-right pb-2 font-medium text-[var(--color-text2,#555)] tabular-nums">Medián Kč/l</th>
                <th className="text-right pb-2 font-medium text-[var(--color-text2,#555)] tabular-nums pr-0 hidden sm:table-cell">Průměr Kč/l</th>
                <th className="text-right pb-2 font-medium text-[var(--color-text2,#555)] tabular-nums hidden sm:table-cell">Produktů</th>
              </tr>
            </thead>
            <tbody>
              {all && (
                <tr className="border-b border-[var(--color-olive-border,#ccc)] font-semibold">
                  <td className="py-3">Celkový index (EVOO)</td>
                  <td className="py-3 text-right tabular-nums" style={{ color: 'var(--color-terra,#c4711a)' }}>{fmt(all.median_czk_l)}</td>
                  <td className="py-3 text-right tabular-nums text-[var(--color-text2,#555)] hidden sm:table-cell">{fmt(all.avg_czk_l)}</td>
                  <td className="py-3 text-right tabular-nums text-[var(--color-text2,#555)] hidden sm:table-cell">{all.product_count}</td>
                </tr>
              )}
              {SEGS.map(({ key, label, sub }) => {
                const s = byKey[key]
                if (!s) return null
                return (
                  <tr key={key} className="border-b border-[var(--color-off2,#eee)]">
                    <td className="py-3">
                      {label}
                      <span className="ml-2 text-xs text-[var(--color-text3,#888)]">{sub}</span>
                    </td>
                    <td className="py-3 text-right tabular-nums font-medium">{fmt(s.median_czk_l)}</td>
                    <td className="py-3 text-right tabular-nums text-[var(--color-text2,#555)] hidden sm:table-cell">{fmt(s.avg_czk_l)}</td>
                    <td className="py-3 text-right tabular-nums text-[var(--color-text2,#555)] hidden sm:table-cell">{s.product_count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Podle původu */}
      {ORIGINS.some(o => byKey[o.key]) && (
        <section className="mb-12">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-normal mb-5">Podle původu</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-olive-border,#ccc)]">
                  <th className="text-left pb-2 font-medium text-[var(--color-text2,#555)]">Původ</th>
                  <th className="text-right pb-2 font-medium text-[var(--color-text2,#555)] tabular-nums">Medián Kč/l</th>
                  <th className="text-right pb-2 font-medium text-[var(--color-text2,#555)] tabular-nums hidden sm:table-cell">Průměr Kč/l</th>
                  <th className="text-right pb-2 font-medium text-[var(--color-text2,#555)] tabular-nums hidden sm:table-cell">Produktů</th>
                </tr>
              </thead>
              <tbody>
                {ORIGINS.map(({ key, label }) => {
                  const s = byKey[key]
                  if (!s) return null
                  return (
                    <tr key={key} className="border-b border-[var(--color-off2,#eee)]">
                      <td className="py-3 font-medium">{label}</td>
                      <td className="py-3 text-right tabular-nums font-medium">{fmt(s.median_czk_l)}</td>
                      <td className="py-3 text-right tabular-nums text-[var(--color-text2,#555)] hidden sm:table-cell">{fmt(s.avg_czk_l)}</td>
                      <td className="py-3 text-right tabular-nums text-[var(--color-text2,#555)] hidden sm:table-cell">{s.product_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Zajímavosti z dat */}
      {insights.length > 0 && (
        <section className="mb-12">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-normal mb-5">Zajímavosti z dat</h2>
          <ul className="space-y-3">
            {insights.map((ins, i) => (
              <li key={i} className="flex gap-3 text-sm text-[var(--color-text2,#555)]">
                <span style={{ color: 'var(--color-olive,#27500A)' }} className="shrink-0 font-medium">→</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Vývoj indexu */}
      {trendData.length > 0 && (
        <section className="mb-12">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-normal mb-5">Vývoj indexu</h2>
          {trendData.length === 1 ? (
            <p className="text-sm text-[var(--color-text3,#888)]">Graf vývoje se zobrazí od druhého měření (příští měsíc).</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-3 h-32 min-w-0" style={{ minWidth: `${trendData.length * 48}px` }}>
                {[...trendData].reverse().map(d => (
                  <div key={d.month} className="flex flex-col items-center justify-end gap-1 flex-1 min-w-[36px] h-full">
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-terra,#c4711a)' }}>
                      {Math.round(d.median_czk_l)}
                    </span>
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${Math.round((d.median_czk_l / maxMedian) * 80)}%`,
                        backgroundColor: 'var(--color-olive,#27500A)',
                        opacity: 0.7,
                      }}
                    />
                    <span className="text-[9px]" style={{ color: 'var(--color-text3,#888)' }}>
                      {formatMonthShort(d.month)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text3,#888)' }}>Medián Kč/l · Olivátor.cz</p>
            </div>
          )}
        </section>
      )}

      {/* Citace */}
      <section className="mb-12 rounded-xl p-6" style={{ background: 'var(--color-olive-bg,#e8f3dc)', border: '1px solid var(--color-olive-border,#c5dea0)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-olive,#27500A)' }}>Data k citaci</p>
        <p className="text-sm leading-relaxed font-mono rounded-lg px-4 py-3 select-all" style={{ background: 'rgba(255,255,255,0.8)', color: 'var(--color-text,#1d1d1f)' }}>
          {citationText}
        </p>
        <p className="text-xs mt-3" style={{ color: 'var(--color-olive,#27500A)' }}>
          Volně citovatelné. Zdroj vždy uveďte jako „Olivátor.cz" s odkazem na olivator.cz/index-cen.
        </p>
      </section>

      {/* Metodika */}
      <section className="mb-12">
        <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-normal mb-5">Metodika</h2>
        <div className="text-sm text-[var(--color-text2,#555)] space-y-3 leading-relaxed">
          <p>
            Index vychází z nejnižší ověřené in-stock ceny každého produktu u jakéhokoliv partnera.
            Publikujeme <strong>medián</strong> (nikoli průměr) — je odolnější vůči extrémně drahým prémiím.
            Průměr uvádíme jako doplněk v tabulce.
          </p>
          <p>
            <strong>Zahrnuté produkty:</strong> Extra panenský olivový olej (EVOO) a panenský olivový olej,
            status „aktivní", s ověřeným objemem balení. Cena nesmí být starší 14 dní.
          </p>
          <p>
            <strong>Dvouvrstvý filtr chyb dat:</strong> (1) Vylučujeme dárkové sady identifikované
            podle názvu produktu (sada, set, dárkový, balíček, kolekce, duo).
            (2) Statistický guard: vyloučíme produkty s cenou Kč/l nad 4× medián svého segmentu
            — typicky jde o chybně zapsaný objem balení v databázi.
          </p>
          <p>
            <strong>Segmenty ceny</strong> jsou definovány hranicemi 400 a 800 Kč/l.
            Segmenty původu zahrnují jen produkty s jednoznačně označenou zemí původu.
          </p>
          <p>
            <strong>Frekvence:</strong> Index se přepočítává 1. dne každého měsíce v 7:00 UTC.
            {all?.computed_at && (
              <> Poslední výpočet: {new Date(all.computed_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}.</>
            )}
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-xs text-[var(--color-text3,#888)] border-t border-[var(--color-off2,#eee)] pt-6">
        Data z {all?.retailer_count ?? '19'} prodejců. Olivátor je nezávislý projekt — Olivator Score ani pořadí nejsou ovlivněny prodejci ani výrobci.
        Affiliate provize jsou standardní sazby bez vlivu na data. ·{' '}
        <a href="/metodika" className="underline hover:no-underline">Olivator Score metodika</a>
      </div>
    </div>
  )
}
