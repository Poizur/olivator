'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/seo-activity'

type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped'

const STATUS_TO_ACTION: Record<TaskStatus, 'task_done' | 'task_pending' | 'task_skipped'> = {
  done: 'task_done',
  pending: 'task_pending',
  in_progress: 'task_pending',  // logged jako pending — in_progress je tranzitní
  skipped: 'task_skipped',
}

export async function setTaskStatus(taskKey: string, status: TaskStatus) {
  // Načti current task pro log entry (title + previous status)
  const { data: prev } = await supabaseAdmin
    .from('seo_tasks')
    .select('title, status, phase')
    .eq('task_key', taskKey)
    .maybeSingle()

  const patch: Record<string, string | null> = { status }
  patch.completed_at = status === 'done' ? new Date().toISOString() : null

  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update(patch)
    .eq('task_key', taskKey)

  if (error) {
    return { ok: false, error: error.message }
  }

  // Log change (jen pokud se status reálně změnil)
  if (prev && (prev as { status: string }).status !== status) {
    await logActivity({
      action_type: STATUS_TO_ACTION[status],
      title: (prev as { title: string }).title,
      task_key: taskKey,
      description: `Fáze ${(prev as { phase: number }).phase}: ${(prev as { status: string }).status} → ${status}`,
      metadata: { phase: (prev as { phase: number }).phase, prev_status: (prev as { status: string }).status },
      source: 'admin_ui',
    })
  }

  revalidatePath('/admin/seo')
  return { ok: true }
}

export async function setTaskNotes(taskKey: string, notes: string) {
  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update({ notes })
    .eq('task_key', taskKey)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/seo')
  return { ok: true }
}

// ── Notes (Insights tab) ─────────────────────────────────────────────────────

export async function addNote(input: {
  category: 'strategy' | 'obstacle' | 'win' | 'question' | 'idea' | 'retro'
  title: string
  body?: string
  related_phase?: number | null
}) {
  if (!input.title.trim()) {
    return { ok: false, error: 'Title je povinný' }
  }

  const { data, error } = await supabaseAdmin
    .from('seo_notes')
    .insert({
      category: input.category,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      related_phase: input.related_phase ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  // Log do activity feedu — note je viditelný i v Historie
  await logActivity({
    action_type: input.category === 'win' ? 'milestone' : input.category === 'idea' ? 'insight' : 'note',
    title: input.title.trim(),
    description: input.body?.slice(0, 200) ?? null,
    metadata: { category: input.category, note_id: (data as { id: string })?.id, related_phase: input.related_phase },
    source: 'admin_ui',
  })

  revalidatePath('/admin/seo')
  return { ok: true, id: (data as { id: string }).id }
}

export async function setNoteStatus(noteId: string, status: 'open' | 'done' | 'archived') {
  const { error } = await supabaseAdmin
    .from('seo_notes')
    .update({ status })
    .eq('id', noteId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/seo')
  return { ok: true }
}

export async function deleteNote(noteId: string) {
  const { error } = await supabaseAdmin
    .from('seo_notes')
    .delete()
    .eq('id', noteId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/seo')
  return { ok: true }
}

// Manuální snapshot — volaný z UI tlačítka "Vzít snapshot teď"
export async function takeSnapshotNow() {
  const { takeMetricSnapshot } = await import('@/lib/seo-activity')
  const result = await takeMetricSnapshot()
  await logActivity({
    action_type: 'audit',
    title: 'Metric snapshot',
    description: `Manual snapshot — ${result.snapshots} metrik uloženo`,
    source: 'admin_ui',
  })
  revalidatePath('/admin/seo')
  return result
}

// ── Návrhy oprav (proposal-audit) ────────────────────────────────────────────
export async function applyProposal(proposalId: string) {
  const { applyProposalById } = await import('@/lib/audit-applier')
  const result = await applyProposalById(proposalId)
  await logActivity({
    action_type: result.ok ? 'milestone' : 'audit',
    title: result.ok ? 'Návrh aplikován' : 'Návrh selhal',
    description: result.note,
    metadata: { proposal_id: proposalId },
    source: 'admin_ui',
  })
  revalidatePath('/admin/seo')
  return result
}

export async function dismissProposal(proposalId: string) {
  const { dismissProposalById } = await import('@/lib/audit-applier')
  await dismissProposalById(proposalId, 'Admin ignored')
  revalidatePath('/admin/seo')
  return { ok: true }
}

export async function applyAllProposalsByRule(ruleId: string) {
  const { data } = await supabaseAdmin
    .from('seo_proposals')
    .select('id')
    .eq('rule_id', ruleId)
    .eq('status', 'pending')
  const ids = ((data ?? []) as Array<{ id: string }>).map(r => r.id)
  let ok = 0, failed = 0
  const { applyProposalById } = await import('@/lib/audit-applier')
  for (const id of ids) {
    const r = await applyProposalById(id)
    if (r.ok) ok++
    else failed++
  }
  await logActivity({
    action_type: 'milestone',
    title: `Bulk apply ${ruleId}`,
    description: `${ok} ok, ${failed} failed (z ${ids.length})`,
    source: 'admin_ui',
  })
  revalidatePath('/admin/seo')
  return { ok, failed, total: ids.length }
}

export async function runProposalAuditNow() {
  const { runAllAuditRules, persistProposals } = await import('@/lib/audit-rules')
  const startedAt = Date.now()
  const results = await runAllAuditRules()
  let totalDetected = 0
  let totalNew = 0
  for (const r of results) {
    if (r.detected === 0) continue
    const persist = await persistProposals(r.proposals)
    totalDetected += r.detected
    totalNew += persist.inserted
  }
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  await logActivity({
    action_type: 'audit',
    title: 'Proposal audit (manual)',
    description: `${totalDetected} návrhů detekováno (${totalNew} new) za ${elapsed}s`,
    metadata: { results: results.map(r => ({ rule: r.rule, count: r.detected })) },
    source: 'admin_ui',
  })
  revalidatePath('/admin/seo')
  return { ok: true, totalDetected, totalNew, elapsed }
}

// Manuální spuštění master auto-audit z UI. Spustí stejné kroky jako denní cron.
// Vrací počet fixed napříč všemi oblastmi.
export async function runAutoAuditNow() {
  const startedAt = Date.now()

  // Inline import a spuštění klíčových kroků (bez Claude — to je drahé, oddělené)
  let totalFixed = 0
  const detail: Record<string, number> = {}

  // 1. Junk brands — najdi brandy s name jako "Extra"/"Panenský" a re-link
  const SUSPICIOUS = ['extra', 'panensky', 'panenský', 'olivovy', 'oil', 'olive', 'premium', 'bio', 'eko']
  const { data: brands } = await supabaseAdmin.from('brands').select('id, slug, name')
  let junkFixed = 0
  for (const b of (brands ?? []) as Array<{ id: string; slug: string; name: string }>) {
    if (!SUSPICIOUS.includes(b.name.toLowerCase().trim())) continue
    const { data: ps } = await supabaseAdmin.from('products').select('id, name').eq('brand_slug', b.slug)
    const products = (ps ?? []) as Array<{ id: string; name: string }>
    if (products.length === 0) {
      await supabaseAdmin.from('brands').delete().eq('slug', b.slug)
      junkFixed++
      continue
    }
    // Heuristika: nejčastější ne-suspicious slovo z product names
    const candidates = new Map<string, number>()
    for (const p of products) {
      const cleanName = p.name.replace(/\d+\s*(ml|l|g)/gi, '').trim()
      const words = cleanName.split(/\s+/)
      for (let i = words.length - 1; i >= Math.max(0, words.length - 3); i--) {
        const w = words[i].replace(/[^\p{L}]/gu, '')
        if (w.length < 3 || SUSPICIOUS.includes(w.toLowerCase())) continue
        candidates.set(w, (candidates.get(w) ?? 0) + 1)
      }
    }
    const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length === 0 || sorted[0][1] < products.length / 2) {
      await supabaseAdmin.from('products').update({ brand_slug: null }).eq('brand_slug', b.slug)
      await supabaseAdmin.from('brands').delete().eq('slug', b.slug)
      junkFixed++
      continue
    }
    const newName = sorted[0][0]
    const newSlug = newName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', newSlug).maybeSingle()
    if (existing) {
      await supabaseAdmin.from('products').update({ brand_slug: newSlug }).eq('brand_slug', b.slug)
      await supabaseAdmin.from('brands').delete().eq('slug', b.slug)
    } else {
      await supabaseAdmin.from('brands').update({ slug: newSlug, name: newName, updated_at: new Date().toISOString() }).eq('id', b.id)
      await supabaseAdmin.from('products').update({ brand_slug: newSlug }).eq('brand_slug', b.slug)
    }
    junkFixed++
  }
  detail.junkBrands = junkFixed
  totalFixed += junkFixed

  // 2. Quick quality fixes — jen deterministické (bez Claude)
  let quickFixed = 0
  const { data: invIssues } = await supabaseAdmin.from('quality_issues').select('id, product_id').eq('rule_id', 'inactive_with_offers').eq('status', 'open')
  for (const i of (invIssues ?? []) as Array<{ id: string; product_id: string }>) {
    await supabaseAdmin.from('product_offers').update({ in_stock: false, last_checked: new Date().toISOString() }).eq('product_id', i.product_id)
    await supabaseAdmin.from('quality_issues').update({
      status: 'resolved', auto_fix_attempted: true, auto_fix_succeeded: true,
      resolved_at: new Date().toISOString(), resolution_note: 'Auto: offers in_stock=false',
    }).eq('id', i.id)
    quickFixed++
  }
  const { data: noOffer } = await supabaseAdmin.from('quality_issues').select('id, product_id').eq('rule_id', 'no_offers').eq('status', 'open')
  for (const i of (noOffer ?? []) as Array<{ id: string; product_id: string }>) {
    await supabaseAdmin.from('products').update({
      status: 'inactive', status_reason_code: 'no_offers',
      status_reason_note: 'Auto-deaktivováno (žádné nabídky)',
      status_changed_by: 'auto', status_changed_at: new Date().toISOString(),
    }).eq('id', i.product_id)
    await supabaseAdmin.from('quality_issues').update({
      status: 'resolved', auto_fix_attempted: true, auto_fix_succeeded: true,
      resolved_at: new Date().toISOString(), resolution_note: 'Auto: product → inactive',
    }).eq('id', i.id)
    quickFixed++
  }
  detail.qualityFixes = quickFixed
  totalFixed += quickFixed

  // 3. Snapshot
  const { takeMetricSnapshot } = await import('@/lib/seo-activity')
  const snap = await takeMetricSnapshot()
  detail.snapshots = snap.snapshots

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

  await logActivity({
    action_type: 'audit',
    title: 'Auto-audit (manual)',
    description: `Opraveno ${totalFixed} položek (${elapsed}s)`,
    metadata: detail,
    source: 'admin_ui',
  })

  revalidatePath('/admin/seo')
  revalidatePath('/admin')
  return { ok: true, totalFixed, detail, elapsed }
}
