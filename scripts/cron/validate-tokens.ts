// Cron: denně 07:00 UTC — kontroluje {{product:slug}} tokeny ve všech
// aktivních článcích proti aktuálnímu stavu products.
// REPORT-ONLY: broken tokeny hlásí e-mailem, NEOPRAVUJE je (L-034, 2026-07-25).
// Náhrady tokenů provádí výhradně člověk nebo člověkem schválený návrh.
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

    // Jeden dotaz pro stav všech referencovaných produktů
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('slug, status')
      .in('slug', [...allSlugs])

    const statusBySlug = new Map<string, string>()
    for (const p of products ?? []) {
      statusBySlug.set(p.slug as string, p.status as string)
    }

    // AUTO-HEAL ZAKÁZÁN (L-034, 2026-07-25): cron je REPORT-ONLY.
    // Náhrady tokenů provádí výhradně člověk nebo člověkem schválený návrh.
    // Viz: incidents/2026-07-25-auto-heal-callejas.md

    // Zpracuj broken tokeny — pouze REPORT
    const manualReports: BrokenTokenReport[] = []
    const healedReports: HealedTokenReport[] = []

    for (const [articleSlug, { slugs, body: _body, category: _category }] of articleTokens) {
      const brokenSlugs: string[] = []
      let hasMissing = false

      for (const slug of slugs) {
        const status = statusBySlug.get(slug)
        if (!status || status !== 'active') {
          brokenSlugs.push(slug)
          if (!status) hasMissing = true
        }
      }

      if (brokenSlugs.length === 0) continue

      const manualTokens: string[] = []

      for (const brokenSlug of brokenSlugs) {
        const statusSuffix = statusBySlug.get(brokenSlug)
        manualTokens.push(statusSuffix ? `${brokenSlug} (${statusSuffix})` : brokenSlug)
        console.log(`  [broken] ${articleSlug}: ${brokenSlug}`)
      }

      if (manualTokens.length > 0) {
        manualReports.push({
          articleSlug,
          brokenTokens: manualTokens,
          severity: hasMissing ? 'critical' : 'warning',
        })
      }
    }

    console.log(
      `[validate-tokens] zkontrolováno ${articles.length} článků, ${allSlugs.size} unikátních tokenů, ` +
      `0 auto-healed (zakázáno), ${manualReports.length} vyžaduje ruční zásah`
    )

    // Loguj broken tokeny (manual) do agent_decisions
    for (const r of manualReports) {
      try {
        await supabaseAdmin.from('agent_decisions').insert({
          agent_name: 'token-validator',
          decision_type: 'broken_tokens_found',
          payload: {
            article_slug: r.articleSlug,
            broken_tokens: r.brokenTokens,
            severity: r.severity,
          },
        })
      } catch (err) {
        console.warn('[validate-tokens] log do agent_decisions selhal:', err)
      }
    }

    // Email — pouze pokud něco rozbité nebo healed
    if (manualReports.length > 0 || healedReports.length > 0) {
      try {
        await sendBrokenTokensAlert(manualReports, healedReports)
        console.log('[validate-tokens] alert email sent')
      } catch (err) {
        console.warn('[validate-tokens] email failed:', err)
      }
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
