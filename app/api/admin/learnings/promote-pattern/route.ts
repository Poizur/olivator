import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { patternId } = (await req.json()) as { patternId?: string }
  if (!patternId) return NextResponse.json({ error: 'patternId required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('patterns_observed')
    .update({ status: 'converted' })
    .eq('id', patternId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
