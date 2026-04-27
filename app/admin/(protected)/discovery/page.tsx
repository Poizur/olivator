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

async function getCandidates(): Promise<DiscoveryRow[]> {
  const { data, error } = await supabaseAdmin
    .from('discovery_candidates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []) as DiscoveryRow[]
}

export default async function DiscoveryPage() {
  const all = await getCandidates()
  const needsReview = all.filter(c => c.status === 'needs_review' || c.status === 'pending')
  const autoPublished = all.filter(c => c.status === 'auto_published')
  const autoAdded = all.filter(c => c.status === 'auto_added_offer')
  const rejected = all.filter(c => c.status === 'rejected')
  const approved = all.filter(c => c.status === 'approved')
  const failed = all.filter(c => c.status === 'failed')

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1">
            Návrhy nových olejů
          </h1>
          <p className="text-sm text-text3 max-w-[720px]">
            Fronta olejů které agent našel na e-shopech a čekají na tvé schválení.
            Spravuješ je v{' '}
            <Link href="/admin/discovery/sources" className="text-olive hover:underline">
              📋 E-shopech
            </Link>
            .
          </p>
        </div>
        <DiscoveryRunner />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Stat label="Celkem" value={all.length} color="text" />
        <Stat label="Ke schválení" value={needsReview.length} color="terra" />
        <Stat label="Automaticky publikované" value={autoPublished.length} color="olive" />
        <Stat label="Nové ceny" value={autoAdded.length} color="olive" />
        <Stat label="Schválené" value={approved.length} color="olive" />
        <Stat label="Zamítnuté" value={rejected.length + failed.length} color="text3" />
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

      {(rejected.length > 0 || failed.length > 0) && (
        <Section title={`❌ Zamítnuté / selhalo (${rejected.length + failed.length})`} subtle>
          <details className="bg-white border border-off2 rounded-lg p-4">
            <summary className="cursor-pointer text-sm text-text2">Zobrazit historii</summary>
            <div className="mt-3 space-y-2">
              {[...rejected, ...failed].slice(0, 30).map(c => <CandidateRow key={c.id} candidate={c as never} />)}
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
    terra: 'text-terra',
    text3: 'text-text3',
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
