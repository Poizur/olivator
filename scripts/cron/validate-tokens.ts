// Cron: denně 07:00 UTC — kontroluje {{product:slug}} tokeny ve všech
// aktivních článcích proti aktuálnímu stavu products. Token na neexistující
// nebo neaktivní produkt = broken token (T-01, project_open_tasks.md backlog).
//
// Regex tokenu musí sedět s lib/template-vars.ts:resolveProductTokens().
import { supabaseAdmin } from '@/lib/supabase'
import { sendBrokenTokensAlert, type BrokenTokenReport } from '@/lib/email'

const MAX_RUNTIME_MS = 10 * 60 * 1000
const TOKEN_RE = /\{\{product:([\w-]+)\}\}/g

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
      .select('slug, body_markdown')
      .eq('status', 'active')
    if (error) throw error

    if (!articles || articles.length === 0) {
      console.log('[validate-tokens] žádné aktivní články')
      clearTimeout(killTimer)
      process.exit(0)
    }

    // Sesbírej tokeny per článek + unikátní sadu slugů napříč všemi články
    const articleTokens = new Map<string, Set<string>>()
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
      if (slugs.size > 0) articleTokens.set(a.slug as string, slugs)
    }

    if (allSlugs.size === 0) {
      console.log('[validate-tokens] žádné {{product:}} tokeny v aktivních článcích')
      clearTimeout(killTimer)
      process.exit(0)
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

    const reports: BrokenTokenReport[] = []
    for (const [articleSlug, slugs] of articleTokens) {
      const broken: string[] = []
      let hasMissing = false
      for (const slug of slugs) {
        const status = statusBySlug.get(slug)
        if (!status) {
          broken.push(slug)
          hasMissing = true
        } else if (status !== 'active') {
          broken.push(`${slug} (${status})`)
        }
      }
      if (broken.length > 0) {
        reports.push({ articleSlug, brokenTokens: broken, severity: hasMissing ? 'critical' : 'warning' })
      }
    }

    console.log(
      `[validate-tokens] zkontrolováno ${articles.length} článků, ${allSlugs.size} unikátních tokenů, ${reports.length} článků s broken tokeny`
    )

    for (const r of reports) {
      console.log(`  [${r.severity}] ${r.articleSlug}: ${r.brokenTokens.join(', ')}`)
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

    if (reports.length > 0) {
      try {
        await sendBrokenTokensAlert(reports)
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
