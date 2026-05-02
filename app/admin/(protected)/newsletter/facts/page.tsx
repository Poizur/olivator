// Facts library — knihovna „Věděli jste?" mikroclánků pro newsletter.
// CRUD přes /api/admin/newsletter/facts/[id]

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { FactsEditor } from './facts-editor'

export const dynamic = 'force-dynamic'

interface FactRow {
  id: string
  body: string
  category: string
  source_url: string | null
  active: boolean
  used_count: number
  last_used_at: string | null
  created_at: string
}

async function getFacts(): Promise<FactRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('newsletter_facts')
      .select('*')
      .order('last_used_at', { ascending: true, nullsFirst: true })
    return (data ?? []) as FactRow[]
  } catch {
    return []
  }
}

export default async function FactsPage() {
  const facts = await getFacts()
  const active = facts.filter((f) => f.active).length

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}Knihovna faktů
      </div>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          Educational facts
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          {active} aktivních faktů · rotují v sekci „Věděli jste?" v každém týdenním newsletteru.
          Composer vybírá vždy nejméně použitý.
        </p>
      </div>

      <FactsEditor initialFacts={facts} />
    </div>
  )
}
