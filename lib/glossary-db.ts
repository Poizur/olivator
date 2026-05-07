// Glossary terms — slovník olivového oleje terminologie pro /slovnik.
// Tichá fail pokud tabulka glossary_terms ještě neexistuje (pre-migration).

import { supabaseAdmin } from './supabase'

export interface GlossaryTerm {
  slug: string
  term: string
  termAlt: string | null
  definitionShort: string
  definitionLong: string | null
  category: string
  metaTitle: string | null
  metaDescription: string | null
}

interface Row {
  slug: string
  term: string
  term_alt: string | null
  definition_short: string
  definition_long: string | null
  category: string
  meta_title: string | null
  meta_description: string | null
  status: string
}

function map(r: Row): GlossaryTerm {
  return {
    slug: r.slug,
    term: r.term,
    termAlt: r.term_alt,
    definitionShort: r.definition_short,
    definitionLong: r.definition_long,
    category: r.category,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
  }
}

export async function getActiveTerms(): Promise<GlossaryTerm[]> {
  const { data, error } = await supabaseAdmin
    .from('glossary_terms')
    .select('slug, term, term_alt, definition_short, definition_long, category, meta_title, meta_description, status')
    .eq('status', 'active')
    .order('term', { ascending: true })

  if (error) {
    // Tabulka ještě neexistuje (pre-migration)
    if (error.message.includes('Could not find the table') || error.code === '42P01') return []
    console.error('[glossary-db] getActiveTerms failed:', error.message)
    return []
  }
  return ((data ?? []) as Row[]).map(map)
}

export async function getTermBySlug(slug: string): Promise<GlossaryTerm | null> {
  const { data, error } = await supabaseAdmin
    .from('glossary_terms')
    .select('slug, term, term_alt, definition_short, definition_long, category, meta_title, meta_description, status')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return map(data as Row)
}
