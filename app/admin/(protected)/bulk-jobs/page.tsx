import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface BulkJobRow {
  id: string
  type: string
  status: string
  total: number
  processed: number
  succeeded: number
  failed: number
  current_item: string | null
  errors: Array<{ id: string; reason: string }>
  started_at: string
  completed_at: string | null
}

const TYPE_LABELS: Record<string, string> = {
  discovery_bulk_approve: 'Hromadné schvalování',
  discovery_bulk_reject: 'Hromadné zamítnutí',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Čeká', color: 'bg-off border-off2 text-text2' },
  running: { label: 'Běží', color: 'bg-amber-50 border-terra/30 text-amber-700' },
  completed: { label: 'Hotovo', color: 'bg-olive-bg border-olive-border text-olive-dark' },
  failed: { label: 'Selhalo', color: 'bg-red-50 border-red-200 text-red-700' },
  cancelled: { label: 'Zrušeno', color: 'bg-off border-off2 text-text3' },
}

async function getJobs(): Promise<BulkJobRow[]> {
  const { data, error } = await supabaseAdmin
    .from('bulk_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []) as BulkJobRow[]
}

function formatDuration(start: string, end: string | null): string {
  const startMs = new Date(start).getTime()
  const endMs = end ? new Date(end).getTime() : Date.now()
  const sec = Math.round((endMs - startMs) / 1000)
  if (sec < 60) return `${sec} s`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  return `${min} min ${remSec} s`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function BulkJobsPage() {
  const jobs = await getJobs()

  return (
    <div>
      <div className="mb-6">
        <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Discovery</div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1">
          Historie běhů
        </h1>
        <p className="text-[13px] text-text2 max-w-[640px]">
          Záznam všech hromadných operací (schvalování, zamítání). Užitečné pro debug —
          vidíš co kdy běželo a co selhalo.
        </p>
      </div>

      {jobs.length === 0 && (
        <div className="bg-white border border-off2 rounded-lg p-8 text-center text-sm text-text3">
          Zatím žádná hromadná úloha. První přibyde když schválíš víc návrhů najednou v{' '}
          <Link href="/admin/discovery" className="text-olive">Návrzích</Link>.
        </div>
      )}

      <div className="space-y-2">
        {jobs.map(j => {
          const status = STATUS_LABELS[j.status] ?? STATUS_LABELS.pending
          const pct = j.total > 0 ? Math.round((j.processed / j.total) * 100) : 0
          return (
            <div key={j.id} className="bg-white border border-off2 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-[14px] font-medium text-text">
                    {TYPE_LABELS[j.type] ?? j.type}
                  </span>
                  <span className="text-[11px] text-text3">
                    {formatTime(j.started_at)}
                  </span>
                </div>
                <div className="text-[11px] text-text3">
                  {formatDuration(j.started_at, j.completed_at)}
                </div>
              </div>

              <div className="text-[12px] text-text2 mb-2">
                {j.processed}/{j.total} zpracováno
                {j.succeeded > 0 && <> · ✅ <strong>{j.succeeded}</strong> úspěšně</>}
                {j.failed > 0 && <> · ❌ <strong>{j.failed}</strong> selhalo</>}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-off rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 transition-all ${j.status === 'failed' ? 'bg-red-400' : 'bg-olive'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {j.current_item && j.status === 'running' && (
                <div className="text-[11px] text-text3 mt-2 italic">
                  Aktuálně: {j.current_item}
                </div>
              )}

              {j.errors && j.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-amber-700">
                    {j.errors.length} chyb
                  </summary>
                  <ul className="mt-1 text-[11px] text-text3 space-y-0.5 ml-4">
                    {j.errors.slice(0, 10).map((e, i) => (
                      <li key={i} className="truncate">• {e.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
