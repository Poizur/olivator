import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchPage } from './fetch-page'
import { brokenImagesRule } from './rules/broken-images'
import { zeroPricesRule } from './rules/zero-prices'
import { duplicateNamesRule } from './rules/duplicate-names'
import { emptySectionsRule } from './rules/empty-sections'
import { repeatedProductsRule } from './rules/repeated-products'
import { missingLogoRule } from './rules/missing-logo'
import { make404Finding } from './rules/http-404'
import type { Finding } from './types'

export type { Finding }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://olivator.cz'
const MAX_URLS = 50
const STATIC_PATHS = ['/', '/srovnavac', '/zebricek', '/pruvodce', '/metodika']

const ALL_RULES = [
  brokenImagesRule,
  zeroPricesRule,
  duplicateNamesRule,
  emptySectionsRule,
  missingLogoRule,
]

async function buildUrlList(): Promise<string[]> {
  const urls = new Set<string>(STATIC_PATHS.map((p) => `${SITE_URL}${p}`))

  // Top 10 products by affiliate clicks
  const { data: topProducts } = await supabaseAdmin
    .from('affiliate_clicks')
    .select('product_id')
    .order('clicked_at', { ascending: false })
    .limit(200)

  if (topProducts) {
    const idCounts = new Map<string, number>()
    for (const r of topProducts) {
      if (r.product_id) idCounts.set(r.product_id, (idCounts.get(r.product_id) ?? 0) + 1)
    }
    const topIds = [...idCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    if (topIds.length > 0) {
      const { data: slugs } = await supabaseAdmin
        .from('products')
        .select('slug')
        .in('id', topIds)
        .eq('status', 'active')
      slugs?.forEach((r) => urls.add(`${SITE_URL}/olej/${r.slug}`))
    }
  }

  // Fallback: 5 newest active products if no click data
  if (urls.size < STATIC_PATHS.length + 3) {
    const { data: newest } = await supabaseAdmin
      .from('products')
      .select('slug')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)
    newest?.forEach((r) => urls.add(`${SITE_URL}/olej/${r.slug}`))
  }

  // Latest 8 active articles — route by category field
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, category')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(8)
  articles?.forEach((r) => {
    const prefix = r.category === 'zebricek' ? 'zebricek' : 'pruvodce'
    urls.add(`${SITE_URL}/${prefix}/${r.slug}`)
  })

  return [...urls].slice(0, MAX_URLS)
}

export interface ScanResult {
  scanRunId: string
  urlsScanned: number
  urlsFailed: number
  findingsTotal: number
  findingsBySeverity: { high: number; medium: number; low: number }
  findings: Finding[]
}

export async function runSiteScanner(opts: { dryRun?: boolean } = {}): Promise<ScanResult> {
  const { dryRun = false } = opts
  const scanRunId = randomUUID()
  const urls = await buildUrlList()

  console.log(`[scanner] Run ${scanRunId} — ${urls.length} URLs, dryRun=${dryRun}`)

  let urlsFailed = 0
  const allFindings: Finding[] = []

  for (const url of urls) {
    const page = await fetchPage(url)
    if (!page) {
      urlsFailed++
      continue
    }

    // 404 detected — log as high-severity finding, skip HTML rules
    if (page.is404) {
      const f = make404Finding(url)
      console.log(`[scanner] ${url} → HTTP 404`)
      allFindings.push(f)
      await new Promise((r) => setTimeout(r, 300))
      continue
    }

    const pageFindings: Finding[] = []
    for (const rule of ALL_RULES) {
      try {
        const found = await rule.run(url, page.html, page.$)
        pageFindings.push(...found)
      } catch (err) {
        console.warn(`[scanner] rule ${rule.name} failed on ${url}:`, (err as Error).message)
      }
    }

    if (pageFindings.length > 0) {
      console.log(`[scanner] ${url} → ${pageFindings.length} nálezy`)
      pageFindings.forEach((f) =>
        console.log(`  [${f.severity}] ${f.findingType}: ${f.detail}`),
      )
    }

    allFindings.push(...pageFindings)

    // Small delay to avoid hammering the server
    await new Promise((r) => setTimeout(r, 500))
  }

  // Persist to DB unless dryRun
  if (!dryRun && allFindings.length > 0) {
    const rows = allFindings.map((f) => ({
      scan_run_id: scanRunId,
      finding_type: f.findingType,
      severity: f.severity,
      url: f.url,
      element: f.element ?? null,
      detail: f.detail,
      evidence: f.evidence ?? null,
      status: 'open',
    }))

    const { error } = await supabaseAdmin.from('site_scan_findings').insert(rows)
    if (error) {
      console.error('[scanner] DB insert failed:', error.message)
    } else {
      console.log(`[scanner] ${rows.length} nálezů uloženo do site_scan_findings`)
    }
  }

  const bySeverity = { high: 0, medium: 0, low: 0 }
  for (const f of allFindings) bySeverity[f.severity]++

  return {
    scanRunId,
    urlsScanned: urls.length - urlsFailed,
    urlsFailed,
    findingsTotal: allFindings.length,
    findingsBySeverity: bySeverity,
    findings: allFindings,
  }
}
