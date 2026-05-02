// POST — odešle approved draft všem subscriberům s odpovídající preferencí.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendDraft } from '@/lib/newsletter-sender'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Auto-approve pokud je draft v 'draft' state — admin klikl "Odeslat"
  // = implicit schválení.
  await supabaseAdmin
    .from('newsletter_drafts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: 'admin-send',
    })
    .eq('id', id)
    .eq('status', 'draft')

  const result = await sendDraft(id)
  return NextResponse.json(result)
}
