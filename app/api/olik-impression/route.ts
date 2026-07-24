import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { type, page, session_id } = (await req.json()) as {
      type: 'hero' | 'floater' | 'peek_shown' | 'peek_clicked'
      page?: string
      session_id?: string
    }

    const VALID_TYPES = ['hero', 'floater', 'peek_shown', 'peek_clicked']
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    supabaseAdmin
      .from('agent_decisions')
      .insert({
        agent_name: 'olik',
        decision_type: `impression_${type}`,
        payload: {
          page: page?.slice(0, 200) ?? null,
          session_id: session_id ?? null,
        },
      })
      .then(({ error }) => {
        if (error) console.error('[olik-impression] log failed:', error.message)
      })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
