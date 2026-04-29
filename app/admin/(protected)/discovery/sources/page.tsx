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

async function getAllSources(): Promise<Source[]> {
  const { data, error } = await supabaseAdmin
    .from('discovery_sources')
    .select('*')
    .order('status', { ascending: true })
    .order('found_at', { ascending: false })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []) as Source[]
}

export default async function SourcesPage() {
  const sources = await getAllSources()
  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/discovery" className="text-[12px] text-zinc-500 hover:text-olive">
          ← Zpět na Discovery
        </Link>
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white mb-1">
        Zdroje (e-shopy)
      </h1>
      <p className="text-sm text-zinc-500 mb-6 max-w-[640px]">
        Registr všech e-shopů které sledujeme. Discovery agent prochází jen ty co mají
        status <strong>enabled</strong>. Můžeš ručně přidávat nové, testovat crawler
        bez import, a spouštět bulk import per shop.
      </p>
      <SourcesAdmin initialSources={sources} />
    </div>
  )
}
