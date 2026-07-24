// Cron: denně 07:00 UTC — kontroluje {{product:slug}} tokeny ve všech
// aktivních článcích proti aktuálnímu stavu products. Token na neexistující
// nebo neaktivní produkt = broken token (T-01, project_open_tasks.md backlog).
//
// Auto-heal: pokud broken token splňuje bezpečnostní pravidla (A–D), nahradí
// ho automaticky nejlepším kandidátem (score DESC). Jinak pošle MANUAL alert.
//
// Regex tokenu musí sedět s lib/template-vars.ts:resolveProductTokens().
import { supabaseAdmin } from '@/lib/supabase'
import { sendBrokenTokensAlert, type BrokenTokenReport, type HealedTokenReport } from '@/lib/email'

const MAX_RUNTIME_MS = 10 * 60 * 1000
const TOKEN_RE = /\{\{product:([\w-]+)\}\}/g

// Kategorie článků kde auto-heal zakázán (zdravotní/kosmetický obsah)
const YMYL_CATEGORIES = new Set(['zdravi', 'kosmetika'])

// Domény a výrazy zakázané ve výstupu — ochrana po právním úklidu 2026-07-24
const BANNED_PHRASES = ['olivum', 'lab testy', 'lab test', 'info@olivator.cz', 'přímé dohody']

// Právní stránky musí existovat — kontrola 1× denně
const REQUIRED_LEGAL_PAGES = [
  '/ochrana-osobnich-udaju',
  '/podminky-uziti',
  '/cookies',
]

// Kontext safety patternys (150 znaků před/za tokenem)
const SPECIFIC_NUMBER_RE = /\d+\s*(mg\/kg|%)/i
const SUPERLATIVE_RE = /\b(rekord|nejvyšší|unikátní|nejlepší|nejdražší|nejlevnější)\b/i

interface AutoHealResult {
  healed: boolean
  newSlug?: string
  reason: string
}

async function tryAutoHeal(
  articleSlug: string,
  articleCategory: string | null,
  articleBody: string,
  brokenSlug: string,
): Promise<AutoHealResult> {
  // Pravidlo C: YMYL check
  if (YMYL_CATEGORIES.has(articleCategory ?? '')) {
    return { healed: false, reason: 'YMYL kategorie — auto-heal zakázán' }
  }

  // Fetch broken product data
  const { data: brokenProduct } = await supabaseAdmin
    .from('products')
    .select('id, type, name, brand_slug, product_offers(price, in_stock)')
    .eq('slug', brokenSlug)
    .maybeSingle()

  if (!brokenProduct) {
    return { healed: false, reason: 'broken produkt nenalezen v DB' }
  }

  const brokenType = (brokenProduct.type as string | null)
  if (!brokenType) {
    return { healed: false, reason: 'broken produkt nemá typ' }
  }

  const offers = (brokenProduct.product_offers ?? []) as Array<{ price: number; in_stock: boolean }>
  const brokenPrice = offers.find(o => o.price > 0)?.price ?? null

  // Pravidlo B: Kontext check
  const tokenStr = `{{product:${brokenSlug}}}`
  const idx = articleBody.indexOf(tokenStr)
  if (idx < 0) return { healed: false, reason: 'token nenalezen v body' }

  const ctxBefore = articleBody.slice(Math.max(0, idx - 150), idx)
  const ctxAfter = articleBody.slice(idx + tokenStr.length, Math.min(articleBody.length, idx + tokenStr.length + 150))
  const fullCtx = ctxBefore + ctxAfter

  if (SPECIFIC_NUMBER_RE.test(fullCtx)) {
    return { healed: false, reason: 'kontext obsahuje specifická čísla (mg/kg, %)' }
  }
  if (SUPERLATIVE_RE.test(fullCtx)) {
    return { healed: false, reason: 'kontext obsahuje superlativy' }
  }

  // Brand/product name v kontextu
  const brandSlug = (brokenProduct.brand_slug as string | null) ?? ''
  const brandName = brandSlug.replace(/-/g, ' ')
  const nameWords = (brokenProduct.name as string)
    .split(/\s+/)
    .filter(w => w.length > 4 && !/^(extra|panenský|olivový|olej|z|v|na|do|ze)$/i.test(w))

  if (brandName && new RegExp(brandName, 'i').test(fullCtx)) {
    return { healed: false, reason: `kontext obsahuje brand "${brandName}"` }
  }
  for (const word of nameWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(fullCtx)) {
      return { healed: false, reason: `kontext obsahuje slovo z názvu produktu "${word}"` }
    }
  }

  // Pravidlo A: Fetch kandidátů
  const { data: rawCandidates } = await supabaseAdmin
    .from('products')
    .select('slug, name, olivator_score, product_offers(price, in_stock)')
    .eq('type', brokenType)
    .eq('status', 'active')
    .gte('olivator_score', 60)
    .neq('slug', brokenSlug)
    .order('olivator_score', { ascending: false })
    .limit(10)

  if (!rawCandidates || rawCandidates.length === 0) {
    return { healed: false, reason: `žádní kandidáti (${brokenType}, score≥60)` }
  }

  // Price filter ±30 %
  let candidates = rawCandidates
  if (brokenPrice) {
    const minPrice = brokenPrice * 0.7
    const maxPrice = brokenPrice * 1.3
    candidates = rawCandidates.filter(c => {
      const cOffers = (c.product_offers ?? []) as Array<{ price: number }>
      const price = cOffers.find(o => o.price > 0)?.price
      return !price || (price >= minPrice && price <= maxPrice)
    })
  }

  // Pravidlo D: min 2 kandidáti
  if (candidates.length < 2) {
    return { healed: false, reason: `nedostatek kandidátů (${candidates.length}/2 potřeba)` }
  }

  const best = candidates[0]
  return {
    healed: true,
    newSlug: best.slug as string,
    reason: `nahrazeno kandidátem ${best.slug} (score ${best.olivator_score ?? '?'}, ${candidates.length} kandidátů)`,
  }
}

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
    for (const a of articles) {
      const body = (a.body_markdown as string) ?? ''
      if (!body.includes('{{product:')) continue
      const slugs = new Set<string>()
      const re = new RegExp(TOKEN_RE)
      let m: RegExpExecArray | null
      while ((m = re.exec(body)) !== null) {
        slugs.add(m[1])
        allSlugs.add(m[1])
      }
      if (slugs.size > 0) {
        articleTokens.set(a.slug as string, { slugs, body, category: (a.category as string | null) ?? null })
      }
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

    // Zpracuj broken tokeny — rozlišení auto-heal vs manual
    const manualReports: BrokenTokenReport[] = []
    const healedReports: HealedTokenReport[] = []
    const articleBodyPatches = new Map<string, string>()  // slug → new body

    for (const [articleSlug, { slugs, body, category }] of articleTokens) {
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

      let currentBody = articleBodyPatches.get(articleSlug) ?? body
      const healedTokens: Array<{ oldToken: string; newToken: string }> = []
      const manualTokens: string[] = []
      let articleHasMissing = hasMissing

      for (const brokenSlug of brokenSlugs) {
        const result = await tryAutoHeal(articleSlug, category, currentBody, brokenSlug)

        if (result.healed && result.newSlug) {
          const oldToken = `{{product:${brokenSlug}}}`
          const newToken = `{{product:${result.newSlug}}}`
          currentBody = currentBody.replace(oldToken, newToken)
          healedTokens.push({ oldToken: brokenSlug, newToken: result.newSlug })
          console.log(`  [auto-heal] ${articleSlug}: ${brokenSlug} → ${result.newSlug}`)

          try {
            await supabaseAdmin.from('agent_decisions').insert({
              agent_name: 'token-validator-autoheal',
              decision_type: 'token_replaced',
              payload: {
                article_slug: articleSlug,
                old_token: brokenSlug,
                new_token: result.newSlug,
                reason: result.reason,
              },
            })
          } catch (err) {
            console.warn('[validate-tokens] agent_decisions log selhal:', err)
          }
        } else {
          const statusSuffix = statusBySlug.get(brokenSlug)
          manualTokens.push(statusSuffix ? `${brokenSlug} (${statusSuffix})` : brokenSlug)
          console.log(`  [manual] ${articleSlug}: ${brokenSlug} — ${result.reason}`)
        }
      }

      if (healedTokens.length > 0) {
        articleBodyPatches.set(articleSlug, currentBody)
        healedReports.push({ articleSlug, replacements: healedTokens })
      }

      if (manualTokens.length > 0) {
        manualReports.push({
          articleSlug,
          brokenTokens: manualTokens,
          severity: articleHasMissing ? 'critical' : 'warning',
        })
      }
    }

    // PATCH všechny auto-healed articles
    for (const [slug, newBody] of articleBodyPatches) {
      const { error: patchErr } = await supabaseAdmin
        .from('articles')
        .update({ body_markdown: newBody })
        .eq('slug', slug)
      if (patchErr) {
        console.error(`[validate-tokens] PATCH selhal pro ${slug}:`, patchErr)
      } else {
        console.log(`[validate-tokens] PATCH OK: ${slug}`)
      }
    }

    console.log(
      `[validate-tokens] zkontrolováno ${articles.length} článků, ${allSlugs.size} unikátních tokenů, ` +
      `${healedReports.length} auto-healed, ${manualReports.length} vyžaduje ruční zásah`
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
