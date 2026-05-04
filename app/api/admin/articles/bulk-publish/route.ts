import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// Hromadná publikace draftů — flipne status='draft' → 'active' jen u
// článků které mají vyplněný body_markdown. Drafty bez obsahu zůstávají
// (admin musí ještě napsat). Vrací počet publikovaných.
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('status', 'draft')
      .not('body_markdown', 'is', null)
      .neq('body_markdown', '')
      .select('slug')
    if (error) throw error
    return NextResponse.json({
      ok: true,
      published: data?.length ?? 0,
      slugs: (data ?? []).map((a) => a.slug as string),
    })
  } catch (err) {
    console.error('[articles/bulk-publish]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
