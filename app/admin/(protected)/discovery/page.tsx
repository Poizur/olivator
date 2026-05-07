import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { CandidateRow } from './candidate-row'
import { DiscoveryQueue } from './discovery-queue'
import { DiscoveryRunner } from './discovery-runner'

export const dynamic = 'force-dynamic'

interface DiscoveryRow {
  id: string
  source_url: string
  source_domain: string
  scraped_at: string
  matched_product_id: string | null
  match_type: string | null
  match_confidence: number | null
  candidate_data: Record<string, unknown>
  status: string
  reasoning: string | null
  resulting_product_id: string | null
  resulting_offer_id: string | null
  reviewed_at: string | null
  created_at: string
}

// Načítáme dvě oddělené sady:
// 1) needs_review — VŠECHNY (limit 500) protože tyhle admin reviewuje
// 2) ostatní statusy — posledních 100 napříč pro stats, ne pro action
async function getCandidates(): Promise<{ all: DiscoveryRow[]; counts: Record<string, number> }> {
  const { data: needsReview, error: e1 } = await supabaseAdmin
    .from('discovery_candidates')
    .select('*')
    .in('status', ['needs_review', 'pending'])
    .order('created_at', { ascending: false })
    .limit(500)
  if (e1) {
    if (e1.code === '42P01' || e1.code === 'PGRST205') return { all: [], counts: {} }
    throw e1
  }

  const { data: recent } = await supabaseAdmin
    .from('discovery_candidates')
    .select('*')
    .not('status', 'in', '(needs_review,pending)')
    .order('created_at', { ascending: false })
    .limit(100)

  // Real counts per status (head:true count)
  const statuses = ['needs_review', 'pending', 'auto_published', 'auto_added_offer', 'rejected', 'approved', 'failed']
  const counts: Record<string, number> = {}
  for (const s of statuses) {
    const { count } = await supabaseAdmin
      .from('discovery_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('status', s)
    counts[s] = count ?? 0
  }

  return {
    all: [...((needsReview ?? []) as DiscoveryRow[]), ...((recent ?? []) as DiscoveryRow[])],
    counts,
  }
}

export default async function DiscoveryPage() {
  const { all, counts } = await getCandidates()
  const needsReview = all.filter(c => c.status === 'needs_review' || c.status === 'pending')
  const autoPublished = all.filter(c => c.status === 'auto_published')
  const autoAdded = all.filter(c => c.status === 'auto_added_offer')
  const rejected = all.filter(c => c.status === 'rejected')
  const approved = all.filter(c => c.status === 'approved')
  const failed = all.filter(c => c.status === 'failed')
  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">— Discovery</div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1">
            Návrhy nových olejů
          </h1>
          <p className="text-[13px] text-text2 max-w-[720px]">
            Fronta olejů které agent našel na e-shopech a čekají na tvé schválení.
            Spravuješ je v{' '}
            <Link href="/admin/discovery/sources" className="text-olive hover:underline">
              Zdrojích
            </Link>
            .
          </p>
        </div>
        <DiscoveryRunner />
      </div>

      {/* Stats summary — exact DB counts (ne in-memory filter z limited fetch) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Stat label="Celkem" value={totalAll} color="text" />
        <Stat label="Ke schválení" value={(counts.needs_review ?? 0) + (counts.pending ?? 0)} color="terra" />
        <Stat label="Automaticky publikované" value={counts.auto_published ?? 0} color="olive" />
        <Stat label="Schválené" value={counts.approved ?? 0} color="olive" />
        <Stat label="Selhalo" value={counts.failed ?? 0} color="red" />
        <Stat label="Zamítnuté" value={counts.rejected ?? 0} color="text3" />
      </div>

      {needsReview.length > 0 && (
        <DiscoveryQueue needsReview={needsReview as never} />
      )}

      {autoPublished.length > 0 && (
        <Section title={`✅ Automaticky publikováno (${autoPublished.length})`} subtle>
          <div className="space-y-2">
            {autoPublished.slice(0, 20).map(c => <CandidateRow key={c.id} candidate={c as never} />)}
          </div>
        </Section>
      )}

      {autoAdded.length > 0 && (
        <Section title={`🔗 Nové ceny u existujících olejů (${autoAdded.length})`} subtle>
          <div className="space-y-2">
            {autoAdded.slice(0, 20).map(c => <CandidateRow key={c.id} candidate={c as never} />)}
          </div>
        </Section>
      )}

      {failed.length > 0 && (
        <Section title={`⚠️ Selhalo — vyžaduje pozornost (${failed.length})`}>
          <div className="space-y-2">
            {failed.slice(0, 30).map(c => <CandidateRow key={c.id} candidate={c as never} />)}
          </div>
        </Section>
      )}

      {rejected.length > 0 && (
        <Section title={`🗑 Zamítnuté — historie (${rejected.length})`} subtle>
          <details className="bg-white border border-off2 rounded-lg p-4">
            <summary className="cursor-pointer text-sm text-text2">
              Zobrazit zamítnuté (jen pro audit, bez akce)
            </summary>
            <div className="mt-3 space-y-2">
              {rejected.slice(0, 30).map(c => <CandidateRow key={c.id} candidate={c as never} />)}
            </div>
          </details>
        </Section>
      )}

      {all.length === 0 && (
        <div className="bg-white border border-off2 rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">🤖</div>
          <div className="text-sm text-text2 mb-4">Agent ještě nehledal nové oleje.</div>
          <p className="text-xs text-text3">
            Klikni nahoře na <strong>🚀 Najít nové oleje</strong> nebo nastav týdenní automatické
            spouštění v Nastavení.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    text: 'text-text',
    olive: 'text-olive-dark',
    terra: 'text-amber-700',
    text3: 'text-text3',
    red: 'text-red-700',
  }
  return (
    <div className="bg-white border border-off2 rounded-lg p-3">
      <div className={`text-2xl font-semibold ${colorClasses[color] ?? ''}`}>{value}</div>
      <div className="text-[11px] text-text3 mt-0.5">{label}</div>
    </div>
  )
}

function Section({
  title,
  subtle,
  children,
}: {
  title: string
  subtle?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <h2
        className={`text-sm font-semibold mb-3 ${
          subtle ? 'text-text2' : 'text-text'
        }`}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}
