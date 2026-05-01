import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { SourcesAdmin } from './sources-admin'

export const dynamic = 'force-dynamic'

interface Source {
  id: string
  domain: string
  slug: string
  name: string | null
  crawler_type: string
  category_url: string | null
  status: string
  source: string | null
  reasoning: string | null
  found_at: string
  last_scanned_at: string | null
  last_scan_url_count: number | null
  last_scan_error: string | null
  total_products_imported: number
}

async function getSources(): Promise<{ active: Source[]; failedCount: number }> {
  const { data, error } = await supabaseAdmin
    .from('discovery_sources')
    .select('*')
    .order('status', { ascending: true })
    .order('found_at', { ascending: false })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return { active: [], failedCount: 0 }
    throw error
  }
  const all = (data ?? []) as Source[]
  // Drafts = prospector kandidáti co prošli testem neúspěšně.
  // Zobrazujeme je jako pouhý počet — nejsou actionable a jen šumí.
  // Automaticky zamítnuté prospectorem (crawler test selhal) — nezobrazujeme jako návrhy.
  // Manuálně zamítnuté adminem (source !== 'prospector_curated') zobrazujeme normálně.
  const autoRejected = all.filter((s) => s.status === 'rejected' && s.source === 'prospector_curated' && (s.last_scan_url_count ?? 0) === 0)
  const autoRejectedDomains = new Set(autoRejected.map((s) => s.id))
  const active = all.filter((s) => !autoRejectedDomains.has(s.id))
  const failedCount = autoRejected.length
  return { active, failedCount }
}

export default async function SourcesPage() {
  const { active: sources, failedCount } = await getSources()
  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/discovery" className="text-[12px] text-text3 hover:text-olive">
          ← Zpět na Discovery
        </Link>
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1">
        Zdroje (e-shopy)
      </h1>
      <p className="text-sm text-text3 mb-2 max-w-[640px]">
        Registr všech e-shopů které sledujeme. Discovery agent prochází jen ty co mají
        status <strong>enabled</strong>. Můžeš ručně přidávat nové, testovat crawler
        bez import, a spouštět bulk import per shop.
      </p>
      {failedCount > 0 && (
        <p className="text-xs text-text3 mb-6">
          {failedCount} {failedCount === 1 ? 'kandidát byl' : failedCount < 5 ? 'kandidáti byli' : 'kandidátů bylo'} automaticky prospectorem otestováno a zamítnuto (sitemap nenalezena) — nejsou zobrazeni.
        </p>
      )}
      {failedCount === 0 && <div className="mb-6" />}
      <SourcesAdmin initialSources={sources} />
    </div>
  )
}
