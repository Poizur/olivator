// Draft detail — preview iframe + edit subject/preheader + send actions.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminBlock } from '@/components/admin-block'
import { getSetting } from '@/lib/settings'
import { DraftActions } from './draft-actions'

export const dynamic = 'force-dynamic'

interface DraftRow {
  id: string
  campaign_type: string
  subject: string
  preheader: string | null
  html_body: string
  text_body: string | null
  blocks: Record<string, unknown>
  status: string
  generated_at: string
  approved_at: string | null
  recipient_count: number | null
}

async function getDraft(id: string): Promise<DraftRow | null> {
  const { data } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as DraftRow | null) ?? null
}

async function getEligibleRecipientCount(campaignType: string): Promise<number> {
  try {
    const { data } = await supabaseAdmin
      .from('newsletter_signups')
      .select('preferences')
      .eq('confirmed', true)
      .eq('unsubscribed', false)
    if (!data) return 0
    return data.filter((s) => {
      const prefs = (s.preferences ?? {}) as Record<string, boolean>
      return prefs[campaignType] === true
    }).length
  } catch {
    return 0
  }
}

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const draft = await getDraft(id)
  if (!draft) notFound()

  const [eligibleRecipients, defaultTestEmail] = await Promise.all([
    getEligibleRecipientCount(draft.campaign_type),
    getSetting<string>('notification_email').catch(() => ''),
  ])

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}
        <Link href="/admin/newsletter/drafts" className="text-olive">Drafty</Link>
        {' › '}
        Detail
      </div>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1">
            {draft.campaign_type === 'weekly' && '📅 Týdenní souhrn'}
            {draft.campaign_type === 'deals' && '📉 Slevy'}
            {draft.campaign_type === 'harvest' && '🇬🇷 Sezónní'}
            {draft.campaign_type === 'alert' && '🔔 Alert'}
            {' · '}
            {draft.status}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-text leading-tight line-clamp-2">
            {draft.subject}
          </h1>
          {draft.preheader && (
            <p className="text-[13px] text-text3 mt-1 line-clamp-2">{draft.preheader}</p>
          )}
        </div>
      </div>

      <DraftActions
        draftId={draft.id}
        status={draft.status}
        currentSubject={draft.subject}
        currentPreheader={draft.preheader ?? ''}
        currentHtmlBody={draft.html_body}
        currentTextBody={draft.text_body ?? ''}
        eligibleRecipients={eligibleRecipients}
        defaultTestEmail={defaultTestEmail}
      />
    </div>
  )
}
