import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { element } = await req.json()
    if (!element || typeof element !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    // Non-blocking — fire & forget (caller doesn't await this)
    await supabaseAdmin.from('agent_decisions').insert({
      agent_name: 'homepage',
      decision_type: 'chip_click',
      payload: {
        source_type: 'homepage_chip',
        element: element.slice(0, 100),
      },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // never fail the click
  }
}
