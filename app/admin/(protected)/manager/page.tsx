import { supabaseAdmin } from '@/lib/supabase'
import { ManagerActions } from './manager-actions'
import { ReportCard } from './report-card'

export const dynamic = 'force-dynamic'

interface ReportRow {
  id: string
  generated_at: string
  period_start: string
  period_end: string
  metrics: unknown
  ai_analysis: string
  suggested_actions: unknown
  status: string
}

async function getRecentReports(): Promise<ReportRow[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('manager_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(8)
    if (error) {
      // Table doesn't exist yet — return empty + we'll show migration hint
      if (error.code === '42P01' || error.code === 'PGRST205') return []
      throw error
    }
    return (data ?? []) as ReportRow[]
  } catch {
    return []
  }
}

export default async function ManagerPage() {
  const reports = await getRecentReports()

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-2">
            📊 Týdenní reporty
          </h1>
          <p className="text-sm text-text3 max-w-[640px]">
            Manager agent týdně sbírá data napříč zdroji (affiliate kliky, kvalita, discovery,
            completeness), Claude analyzuje a posílá strategický report s konkrétními akcemi.
            Cron pondělí 5:00 UTC po discovery + prospect.
          </p>
        </div>
        <ManagerActions />
      </div>

      {reports.length === 0 && (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-8 text-center">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm font-medium text-text mb-1">Zatím žádný report</div>
          <div className="text-xs text-text3 mb-4">
            Klikni „Spustit Manager teď" pro první analýzu, nebo počkej na pondělí 5:00 UTC.
          </div>
          <div className="text-[11px] text-text3 italic mt-4 bg-off rounded-lg px-3 py-2 inline-block">
            Pokud vidíš tuto zprávu i po spuštění → tabulka <code className="bg-white px-1 rounded">manager_reports</code> možná neexistuje.
            Aplikuj migraci <code className="bg-white px-1 rounded">supabase/migrations/20260428_manager_reports.sql</code>.
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  )
}
