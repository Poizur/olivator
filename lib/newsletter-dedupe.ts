// Pojistka: stejný olej (rodina, napříč baleními) nesmí jít stejnému odběrateli dvakrát do 30 dní.

import { supabaseAdmin } from './supabase'
import { oilFamilyKey } from './oil-family'

export const NEWSLETTER_REPEAT_WINDOW_DAYS = 30

type Blocks = Record<string, unknown> | null | undefined

export function draftProductIds(blocks: Blocks): string[] {
  const b = blocks ?? {}
  const one = (k: string) => (b[k] as { productId?: string } | null)?.productId
  const many = (k: string) => ((b[k] ?? []) as Array<{ productId?: string }>).map((x) => x.productId)
  return [...new Set([one('oilOfWeek'), one('tipProduct'), one('newArrival'), ...many('deals'), ...many('valuePicks')].filter(Boolean) as string[])]
}

export async function familiesOf(productIds: string[]): Promise<Map<string, string>> {
  if (!productIds.length) return new Map()
  const { data } = await supabaseAdmin.from('products').select('id, name').in('id', productIds)
  return new Map((data ?? []).map((p) => [p.id as string, oilFamilyKey(p.name as string)]))
}

/** Rodiny olejů, které už jednotliví odběratelé dostali za posledních 30 dní. */
export async function recentFamiliesBySignup(signupIds: string[]): Promise<Map<string, Set<string>>> {
  const since = new Date(Date.now() - NEWSLETTER_REPEAT_WINDOW_DAYS * 86400000).toISOString()
  const result = new Map<string, Set<string>>()
  if (!signupIds.length) return result
  const { data: sends } = await supabaseAdmin
    .from('newsletter_sends')
    .select('signup_id, draft_id')
    .in('signup_id', signupIds)
    .in('status', ['sent', 'delivered', 'opened', 'clicked'])
    .gte('created_at', since)
  const draftIds = [...new Set((sends ?? []).map((s) => s.draft_id as string))]
  if (!draftIds.length) return result
  const { data: drafts } = await supabaseAdmin.from('newsletter_drafts').select('id, blocks').in('id', draftIds)
  const productsByDraft = new Map((drafts ?? []).map((d) => [d.id as string, draftProductIds(d.blocks as Blocks)]))
  const families = await familiesOf([...new Set([...productsByDraft.values()].flat())])
  for (const s of sends ?? []) {
    const set = result.get(s.signup_id as string) ?? new Set<string>()
    for (const pid of productsByDraft.get(s.draft_id as string) ?? []) {
      const f = families.get(pid)
      if (f) set.add(f)
    }
    result.set(s.signup_id as string, set)
  }
  return result
}

/** Rodiny olejů odeslané komukoli za 30 dní — composer je do nového vydání nevybírá. */
export async function recentlySentFamilies(excludeDraftId?: string): Promise<Set<string>> {
  const since = new Date(Date.now() - NEWSLETTER_REPEAT_WINDOW_DAYS * 86400000).toISOString()
  const { data: drafts } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('blocks')
    .eq('status', 'sent')
    .gte('updated_at', since)
    .neq('id', excludeDraftId ?? '00000000-0000-0000-0000-000000000000')
  const families = await familiesOf([...new Set((drafts ?? []).flatMap((d) => draftProductIds(d.blocks as Blocks)))])
  return new Set(families.values())
}
