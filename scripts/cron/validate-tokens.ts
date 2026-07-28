// Cron: denně 07:00 UTC — kontroluje {{product:slug}} tokeny ve všech
// aktivních článcích proti aktuálnímu stavu products.
// REPORT-ONLY: broken tokeny hlásí e-mailem, NEOPRAVUJE je (L-034, 2026-07-25).
// Náhrady tokenů provádí výhradně člověk nebo člověkem schválený návrh.
//
// L-039: hlásí ZMĚNY, ne opakující se stav. Karanténní retaileři = týdenní souhrn.
//
// Regex tokenu musí sedět s lib/template-vars.ts:resolveProductTokens().
import { supabaseAdmin } from '@/lib/supabase'
import { sendBrokenTokensAlert, type BrokenTokenReport, type HealedTokenReport } from '@/lib/email'

const MAX_RUNTIME_MS = 10 * 60 * 1000
const TOKEN_RE = /\{\{product:([\w-]+)\}\}/g

// Kategorie článků kde auto-heal zakázán (zdravotní/kosmetický obsah)
// Domény a výrazy zakázané ve výstupu — ochrana po právním úklidu 2026-07-24
const BANNED_PHRASES = ['olivum', 'lab testy', 'lab test', 'lab data', 'lab report', 'laboratorní data', 'info@olivator.cz', 'přímé dohody']

// Právní stránky musí existovat — kontrola 1× denně
const REQUIRED_LEGAL_PAGES = [
  '/ochrana-osobnich-udaju',
  '/podminky-uziti',
  '/cookies',
]

async function main() {
  const startedAt = Date.now()
  console.log('[validate-tokens] start', new Date().toISOString())

  const killTimer = setTimeout(() => {
    console.error('[validate-tokens] TIMEOUT — exceeded 10 min, forcing exit')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  try {
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('slug, body_markdown, category')
      .eq('status', 'active')
    if (error) throw error

    if (!articles || articles.length === 0) {
      console.log('[validate-tokens] žádné aktivní články')
      clearTimeout(killTimer)
      process.exit(0)
    }

    // Sesbírej tokeny per článek + unikátní sadu slugů napříč všemi články
    const articleTokens = new Map<string, { slugs: Set<string>; body: string; category: string | null }>()
    const allSlugs = new Set<string>()
    const duplicateTokenReports: Array<{ articleSlug: string; slug: string; count: number }> = []
    for (const a of articles) {
      const body = (a.body_markdown as string) ?? ''
      if (!body.includes('{{product:')) continue
      const slugs = new Set<string>()
      const slugCounts = new Map<string, number>()
      const re = new RegExp(TOKEN_RE)
      let m: RegExpExecArray | null
      while ((m = re.exec(body)) !== null) {
        slugs.add(m[1])
        allSlugs.add(m[1])
        slugCounts.set(m[1], (slugCounts.get(m[1]) ?? 0) + 1)
      }
      // Hlásit duplikáty (stejný produkt >2× v jednom článku)
      for (const [slug, count] of slugCounts) {
        if (count > 2) {
          duplicateTokenReports.push({ articleSlug: a.slug as string, slug, count })
          console.warn(`[validate-tokens] DUPLIKÁT: ${a.slug} má ${slug} ${count}× — zkontroluj a dedup manuálně`)
        }
      }
      if (slugs.size > 0) {
        articleTokens.set(a.slug as string, { slugs, body, category: (a.category as string | null) ?? null })
      }
    }
    if (duplicateTokenReports.length > 0) {
      try {
        await supabaseAdmin.from('agent_decisions').insert({
          agent_name: 'token-validator',
          decision_type: 'duplicate_tokens_found',
          payload: { duplicates: duplicateTokenReports },
        })
      } catch { /* non-fatal */ }
    }

    if (allSlugs.size === 0) {
      console.log('[validate-tokens] žádné {{product:}} tokeny v aktivních článcích')
      clearTimeout(killTimer)
      process.exit(0)
    }

    // Kontrola zakázaných frází v aktivních článcích
    const bannedFound: Array<{ article: string; phrase: string }> = []
    for (const a of articles) {
      const body = (a.body_markdown as string) ?? ''
      for (const phrase of BANNED_PHRASES) {
        if (body.toLowerCase().includes(phrase.toLowerCase())) {
          bannedFound.push({ article: a.slug as string, phrase })
          console.warn(`[validate-tokens] BANNED PHRASE "${phrase}" v článku: ${a.slug}`)
        }
      }
    }
    if (bannedFound.length > 0) {
      try {
        await supabaseAdmin.from('agent_decisions').insert({
          agent_name: 'token-validator',
          decision_type: 'banned_phrase_found',
          payload: { violations: bannedFound },
        })
      } catch { /* non-fatal */ }
    }

    // Ověř že právní stránky existují (HTTP 200)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://olivator.cz'
    const missingLegalPages: string[] = []
    for (const path of REQUIRED_LEGAL_PAGES) {
      try {
        const res = await fetch(`${baseUrl}${path}`, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
        if (res.status !== 200) {
          missingLegalPages.push(`${path} (HTTP ${res.status})`)
          console.warn(`[validate-tokens] LEGAL PAGE MISSING: ${path} → HTTP ${res.status}`)
        }
      } catch (err) {
        missingLegalPages.push(`${path} (fetch error)`)
        console.warn(`[validate-tokens] LEGAL PAGE CHECK FAILED: ${path}`, err)
      }
    }
    if (missingLegalPages.length > 0) {
      try {
        await supabaseAdmin.from('agent_decisions').insert({
          agent_name: 'token-validator',
          decision_type: 'legal_page_missing',
          payload: { missing: missingLegalPages },
        })
      } catch { /* non-fatal */ }
    }

    // Jeden dotaz pro stav všech referencovaných produktů + jejich retaileři
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('slug, status')
      .in('slug', [...allSlugs])

    const statusBySlug = new Map<string, string>()
    for (const p of products ?? []) {
      statusBySlug.set(p.slug as string, p.status as string)
    }

    // Zjisti které produkty jsou inactive kvůli karanténnímu retailerovi
    // Karanténní produkt: status='inactive' + aspoň 1 offer z retailera s retailer_status='quarantine'
    const inactiveSlugs = [...allSlugs].filter(s => statusBySlug.get(s) === 'inactive')
    const quarantineProductSlugs = new Set<string>()
    if (inactiveSlugs.length > 0) {
      const { data: quarantineOffers, error: qErr } = await supabaseAdmin
        .from('product_offers')
        .select('product_id, products!inner(slug), retailers!inner(retailer_status)')
        .in('products.slug', inactiveSlugs)
        .eq('retailers.retailer_status', 'quarantine')
      if (qErr) {
        console.warn('[validate-tokens] quarantine lookup failed:', qErr.message)
      }
      for (const row of quarantineOffers ?? []) {
        const p = row.products as { slug: string } | null
        if (p?.slug) quarantineProductSlugs.add(p.slug)
      }
    }
    console.log(`[validate-tokens] karanténní produkty: ${quarantineProductSlugs.size} slugů`)

    // Načti stav z předchozího runu (diff)
    const { data: lastRun, error: loadErr } = await supabaseAdmin
      .from('agent_decisions')
      .select('payload, created_at')
      .eq('agent_name', 'token-validator')
      .eq('decision_type', 'broken_tokens_snapshot')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loadErr) {
      console.warn('[validate-tokens] snapshot load failed:', loadErr.message)
    } else {
      console.log(`[validate-tokens] snapshot z ${lastRun?.created_at ?? 'N/A'} (${Object.keys((lastRun?.payload as { tokens?: Record<string, string[]> })?.tokens ?? {}).length} článků)`)
    }

    const prevSnapshot: Record<string, string[]> = (lastRun?.payload as { tokens?: Record<string, string[]> })?.tokens ?? {}
    // prevSnapshot: { articleSlug → [productSlug, ...] }

    // AUTO-HEAL ZAKÁZÁN (L-034, 2026-07-25): cron je REPORT-ONLY.
    const manualReports: BrokenTokenReport[] = []
    const healedReports: HealedTokenReport[] = []

    // Aktuální snapshot broken tokenů (pro uložení do DB)
    const currentSnapshot: Record<string, string[]> = {}

    // Karanténní přehled (bez detailů)
    let quarantineTokenCount = 0
    const quarantineArticles = new Set<string>()
    const newlyBrokenArticles: Array<{ articleSlug: string; tokens: string[] }> = []

    for (const [articleSlug, { slugs }] of articleTokens) {
      const brokenSlugs: string[] = []
      const quarantineSlugs: string[] = []
      const realProblemSlugs: string[] = []

      for (const slug of slugs) {
        const status = statusBySlug.get(slug)
        if (!status || status !== 'active') {
          brokenSlugs.push(slug)
          if (quarantineProductSlugs.has(slug)) {
            quarantineSlugs.push(slug)
          } else {
            realProblemSlugs.push(slug)
          }
        }
      }

      if (brokenSlugs.length === 0) continue

      // Uložit do snapshotu
      currentSnapshot[articleSlug] = brokenSlugs

      // Karanténní tokeny — jen počítej, nereportuj detailně
      if (quarantineSlugs.length > 0) {
        quarantineTokenCount += quarantineSlugs.length
        quarantineArticles.add(articleSlug)
      }

      // Skutečné problémy — vždy reportovat
      if (realProblemSlugs.length > 0) {
        const hasMissing = realProblemSlugs.some(s => !statusBySlug.has(s))
        const formatted = realProblemSlugs.map(s => {
          const st = statusBySlug.get(s)
          return st ? `${s} (${st})` : s
        })
        manualReports.push({
          articleSlug,
          brokenTokens: formatted,
          severity: hasMissing ? 'critical' : 'warning',
        })
        console.log(`  [broken:real] ${articleSlug}: ${formatted.join(', ')}`)
      }

      // Nové karanténní tokeny (nebyly v předchozím snapshotu)
      const prevBroken = prevSnapshot[articleSlug] ?? []
      const newlySeen = brokenSlugs.filter(s => !prevBroken.includes(s))
      if (newlySeen.length > 0) {
        newlyBrokenArticles.push({ articleSlug, tokens: newlySeen })
        console.log(`  [broken:new] ${articleSlug}: ${newlySeen.join(', ')}`)
      }
    }

    // Ulož aktuální snapshot do agent_decisions (pro příští diff)
    // POZOR: Supabase JS v2 nevyhazuje výjimku na API chybách — musíme checkovat { error }
    const { error: snapErr } = await supabaseAdmin.from('agent_decisions').insert({
      agent_name: 'token-validator',
      decision_type: 'broken_tokens_snapshot',
      payload: { tokens: currentSnapshot, quarantine_count: quarantineTokenCount },
    })
    if (snapErr) {
      console.warn('[validate-tokens] snapshot save FAILED (diff bude nefunkční příští run):', snapErr.message, snapErr.code)
    } else {
      console.log(`[validate-tokens] snapshot saved: ${Object.keys(currentSnapshot).length} entries`)
    }

    console.log(
      `[validate-tokens] zkontrolováno ${articles.length} článků, ${allSlugs.size} unikátních tokenů | ` +
      `karanténa: ${quarantineTokenCount} tokenů v ${quarantineArticles.size} článcích | ` +
      `skutečné problémy: ${manualReports.length} | nové od včerejška: ${newlyBrokenArticles.length}`
    )

    // Email logika (L-039: hlásíme ZMĚNY, ne opakující se stav)
    const isMonday = new Date().getDay() === 1
    const hasRealProblems = manualReports.length > 0 || healedReports.length > 0
    const hasNewIssues = newlyBrokenArticles.length > 0
    const shouldSendEmail = hasRealProblems || hasNewIssues || (isMonday && quarantineTokenCount > 0)

    if (shouldSendEmail) {
      try {
        await sendBrokenTokensAlert(manualReports, healedReports, {
          quarantineTokenCount,
          quarantineArticleCount: quarantineArticles.size,
          newlyBroken: newlyBrokenArticles,
          isWeeklySummary: isMonday && !hasRealProblems && !hasNewIssues,
        })
        console.log('[validate-tokens] alert email sent')
      } catch (err) {
        console.warn('[validate-tokens] email failed:', err)
      }
    } else {
      console.log('[validate-tokens] žádné nové problémy, email neposlán (ticho = vše OK)')
    }

    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[validate-tokens] done in ${elapsedSec}s`)
    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    clearTimeout(killTimer)
    console.error('[validate-tokens] FATAL:', err)
    process.exit(1)
  }
}

main()
