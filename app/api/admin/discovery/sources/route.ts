import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { testCrawlerForDomain } from '@/lib/shop-crawlers'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

/** Normalize domain — strip protocol, www., trailing slash, lowercase */
function normalizeDomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\?.*$/, '')
    .replace(/#.*$/, '')
    .trim()
}

function slugFromDomain(domain: string): string {
  // Strip subdomains and TLD: shop.reckonasbavi.cz → reckonasbavi
  return domain
    .replace(/^(shop\.|m\.|www\.|store\.|eshop\.)/i, '')
    .split('.')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** GET — list all sources (with filter by status) */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const status = request.nextUrl.searchParams.get('status')
    let q = supabaseAdmin.from('discovery_sources').select('*').order('found_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return NextResponse.json({ ok: true, sources: [] })
      throw error
    }
    return NextResponse.json({ ok: true, sources: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

/** POST — add new source (or notify if duplicate) */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const rawDomain = body?.domain as string
    if (!rawDomain) {
      return NextResponse.json({ error: 'Doména je povinná' }, { status: 400 })
    }
    const domain = normalizeDomain(rawDomain)
    const slug = body?.slug ? String(body.slug).toLowerCase() : slugFromDomain(domain)

    // Duplicate check (case-insensitive on domain OR slug)
    const { data: existing } = await supabaseAdmin
      .from('discovery_sources')
      .select('id, name, status, slug, domain')
      .or(`slug.eq.${slug},domain.eq.${domain}`)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          duplicate: true,
          existing: existing,
          message: `Shop "${existing.domain}" už máš v registru se slugem "${existing.slug}" (status: ${existing.status})`,
        },
        { status: 409 }
      )
    }

    // Insert
    const payload = {
      domain,
      slug,
      name: (body?.name as string) ?? null,
      crawler_type: (body?.crawler_type as string) ?? 'shoptet_sitemap',
      category_url: (body?.category_url as string) ?? null,
      status: (body?.status as string) ?? 'suggested',
      source: (body?.source as string) ?? 'manual',
      reasoning: (body?.reasoning as string) ?? null,
    }
    const { data: created, error } = await supabaseAdmin
      .from('discovery_sources')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, source: created })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

/** PUT — test crawler for a given domain (without persisting). Returns URL count. */
export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const rawDomain = body?.domain as string
    if (!rawDomain) {
      return NextResponse.json({ error: 'Doména je povinná' }, { status: 400 })
    }
    const domain = normalizeDomain(rawDomain)
    const result = await testCrawlerForDomain(domain, {
      type: body?.crawler_type ?? 'shoptet_sitemap',
      categoryUrl: body?.category_url,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
