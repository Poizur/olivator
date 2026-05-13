import Link from 'next/link'
import { getKeywords, getKeywordStats } from '@/lib/content-strategy-db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Keyword Mapping | Admin' }

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  unmapped:    { cls: 'bg-amber-50 text-amber-700',  label: 'Nemapováno' },
  in_progress: { cls: 'bg-blue-50 text-blue-700',    label: 'Probíhá' },
  mapped:      { cls: 'bg-green-50 text-green-700',  label: 'Namapováno' },
  deferred:    { cls: 'bg-off text-text3',            label: 'Odloženo' },
}

const INTENT_CONFIG: Record<string, { cls: string; label: string }> = {
  informational:   { cls: 'text-blue-600',   label: 'Info' },
  commercial:      { cls: 'text-olive',      label: 'Komerční' },
  navigational:    { cls: 'text-text2',      label: 'Navigace' },
  transactional:   { cls: 'text-terra',      label: 'Transakce' },
}

export default async function KeywordMappingPage() {
  const [keywords, stats] = await Promise.all([
    getKeywords({ limit: 300 }),
    getKeywordStats(),
  ])

  const clusters = new Map<string, typeof keywords>()
  for (const kw of keywords) {
    const key = kw.clusterGroup ?? 'Ostatní'
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(kw)
  }
  const sortedClusters = Array.from(clusters.entries()).sort((a, b) => {
    const volA = a[1].reduce((s, k) => s + (k.searchVolume ?? 0), 0)
    const volB = b[1].reduce((s, k) => s + (k.searchVolume ?? 0), 0)
    return volB - volA
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-text">Keyword Mapping</h1>
          <p className="text-[13px] text-text2 mt-0.5">{stats.total} keywords · {stats.mapped} namapováno</p>
        </div>
        <Link href="/admin/content-strategy" className="text-[13px] text-text2 hover:text-text">
          ← Strategie
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Celkem',           value: stats.total,                cls: 'text-text' },
          { label: 'Namapováno',       value: stats.mapped,               cls: 'text-green-600' },
          { label: 'Nemapováno',       value: stats.unmapped,             cls: 'text-amber-600' },
          { label: 'High-pri nemapov', value: stats.highPriorityUnmapped, cls: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
            <div className={`text-[22px] font-semibold ${s.cls}`}>{s.value}</div>
            <div className="text-[12px] text-text2 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {keywords.length === 0 ? (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-10 text-center text-[14px] text-text3">
          Žádná keywords — importuj keywords.txt přes seed script.
        </div>
      ) : (
        sortedClusters.map(([cluster, kws]) => {
          const totalVol = kws.reduce((s, k) => s + (k.searchVolume ?? 0), 0)
          const mappedCount = kws.filter((k) => k.status === 'mapped').length
          return (
            <div key={cluster} className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-off2 flex items-center justify-between bg-off/40">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-text">{cluster}</span>
                  <span className="text-[11px] text-text3">{kws.length} keywords · {totalVol.toLocaleString('cs-CZ')}/měs</span>
                </div>
                <span className="text-[11px] text-text3">{mappedCount}/{kws.length} namapováno</span>
              </div>
              <div className="divide-y divide-off">
                {kws.map((kw) => {
                  const sc = STATUS_CONFIG[kw.status] ?? STATUS_CONFIG.unmapped
                  const ic = INTENT_CONFIG[kw.intent ?? '']
                  return (
                    <div key={kw.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] text-text">{kw.keyword}</span>
                        {kw.targetUrl && (
                          <span className="text-[11px] text-text3 ml-2">→ {kw.targetUrl}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {kw.searchVolume != null && (
                          <span className="text-[11px] text-text3 w-14 text-right">
                            {kw.searchVolume.toLocaleString('cs-CZ')}
                          </span>
                        )}
                        {ic && <span className={`text-[10px] font-semibold ${ic.cls}`}>{ic.label}</span>}
                        <span className="text-[10px] font-semibold">{'★'.repeat(kw.priority)}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
