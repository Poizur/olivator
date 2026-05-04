import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// Hromadná publikace draftů receptů — stejné jako articles/bulk-publish.
// Drafty bez body_markdown zůstávají, admin musí ještě napsat.
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('recipes')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('status', 'draft')
      .not('body_markdown', 'is', null)
      .neq('body_markdown', '')
      .select('slug')
    if (error) throw error
    return NextResponse.json({
      ok: true,
      published: data?.length ?? 0,
      slugs: (data ?? []).map((r) => r.slug as string),
    })
  } catch (err) {
    console.error('[recipes/bulk-publish]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
