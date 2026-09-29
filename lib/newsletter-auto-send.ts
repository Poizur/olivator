import { supabaseAdmin } from './supabase'
import { getSetting } from './settings'
import { sendDraft } from './newsletter-sender'

export interface AutoSendResult {
  sent: boolean
  reason: string
  draftId?: string
  totalSent?: number
  totalFailed?: number
}

/**
 * Čtvrteční auto-send týdenního newsletteru. Běží uvnitř welcome-dispatcher cronu
 * (žádná samostatná Railway služba). Odešle nejnovější weekly draft z posledních 3 dnů,
 * pokud ho AI reviewer nezablokoval a tento týden už nic neodešlo.
 * Veto: draft archivovat v adminu nebo vypnout newsletter_auto_send.
 */
export async function autoSendWeeklyNewsletter(): Promise<AutoSendResult> {
  const autoSend = await getSetting<boolean>('newsletter_auto_send').catch(() => false)
  if (!autoSend) return { sent: false, reason: 'newsletter_auto_send = false' }
  const paused = process.env.EMAILS_PAUSED === 'true' || await getSetting<boolean>('emails_paused').catch(() => false)
  if (paused) return { sent: false, reason: 'emails_paused' }

  const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString()

  const { count: recentSent } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_type', 'weekly')
    .in('status', ['sent', 'sending'])
    .gte('generated_at', since(5))
  if (recentSent) return { sent: false, reason: 'tento týden už odesláno' }

  const { data: draft } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, status, reviewer_severity')
    .eq('campaign_type', 'weekly')
    .in('status', ['draft', 'approved'])
    .gte('generated_at', since(3))
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!draft) return { sent: false, reason: 'žádný čerstvý draft' }

  // 'warn' = opakování produktů/předmětu, posílá se; null/'error' = reviewer neproběhl → čeká na ruční kontrolu
  if (draft.reviewer_severity !== 'ok' && draft.reviewer_severity !== 'warn') {
    return { sent: false, reason: `reviewer_severity=${draft.reviewer_severity ?? 'null'}`, draftId: draft.id }
  }

  if (draft.status === 'draft') {
    await supabaseAdmin
      .from('newsletter_drafts')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: 'auto-send' })
      .eq('id', draft.id)
      .eq('status', 'draft')
  }

  const result = await sendDraft(draft.id)
  return {
    sent: result.ok,
    reason: result.ok ? 'odesláno' : result.errors.join('; '),
    draftId: draft.id,
    totalSent: result.totalSent,
    totalFailed: result.totalFailed,
  }
}
