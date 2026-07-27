/**
 * Faktický audit článků — Phase 1+2
 * Extrahuje verifikovatelná tvrzení z každého článku a ověřuje je
 * proti EU/IOC normám a vědecké literatuře.
 *
 * Spuštění: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/article-fact-audit.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── EU/IOC reference (Reg. 2568/91, 432/2012, IOC standard 2022) ─────────────
const EU_IOC_REFERENCE = `
NORMY PRO OLIVOVÝ OLEJ (referenční hodnoty pro ověření):

[Reg. EHS 2568/91 + novelizace — kategorie a limity]
- Extra panenský olivový olej (EVOO): kyselost ≤ 0,8%, peroxidy ≤ 20 meq O2/kg
- Panenský olivový olej: kyselost ≤ 2,0%, peroxidy ≤ 20 meq O2/kg
- Olivový olej (rafinovaný + panenský): kyselost ≤ 1,0%
- Olivový olej z pokrutin (rafinovaný): kyselost ≤ 1,0%

[EU Reg. 432/2012 — health claims]
- POVOLENÉ TVRZENÍ: "Olivový olej přispívá k ochraně krevních lipidů před oxidačním stresem."
- PODMÍNKA: ≥ 5 mg hydroxytyrosolu a jeho derivátů na 20 g oleje = ≥ 250 mg/kg
- ZAKÁZÁNO: Přímé tvrzení o prevenci nemocí (rakovina, Alzheimer, cukrovka)

[IOC Trade Standard 2022]
- Polyfenoly: žádný povinný minimální limit pro kategorizaci (pouze pro EU health claim 250 mg/kg)
- "High phenolic" není regulovaný výraz podle IOC/EU (jde o marketingový termín)

[Bod zakouření — vědecký konsenzus]
- EVOO: cca 190–210°C (záleží na kyselosti a polyfenolech; nižší kyselost = vyšší bod)
- Rafinovaný olivový olej: ~240°C
- Slunečnicový olej: ~225°C
- Přijatelná tvrzení: "kolem 190°C", "nad 180°C", "190–210°C"
- PROBLEMATICKÉ: "207°C přesně" bez zdroje; "vysoko nad 200°C" bez kontextu

[PREDIMED studie — POZOR]
- Původní 2013 NEJM: N Engl J Med 2013;368:1279-1290 (Estruch et al.)
- Stažena a opravena 2018 (randomizace problém), republished 2018 (NEJM 2018;378:e34)
- Výsledek platí: PRED-MED strava snižuje KV riziko o ~30%
- Správná citace: "PREDIMED studie (2013/2018)"
- CHYBNÉ: "studie z 2013" bez zmínky opravy; přesná čísla bez zdroje

[Produkční statistiky — přijatelné rozsahy]
- Řecko: Koroneiki tvoří ~50-65% produkce (ne přesně "60%")
- Itálie: ~400-600 uznaných odrůd (ne přesně "538"; Moretti 2014 uvádí 538, ale sporné)
- Španělsko: největší producent na světě (~40% světové produkce), Picual dominantní
- Světová produkce: ~3,5-4 mil. tun/rok (dle IOC, variabilní)
- EU produkce: ~75-80% světové produkce

[Zdravotní tvrzení — správná formulace]
- PŘIJATELNÉ: "studie naznačují", "výzkum spojuje", "může přispívat"
- PŘIJATELNÉ: "polyfenoly mají antioxidační vlastnosti"
- PŘIJATELNÉ: "středomořská strava je spojena s nižším KV rizikem"
- PROBLEMATICKÉ: "léčí", "zabraňuje rakovině", "SPF faktor X" bez ověřeného zdroje
- PROBLEMATICKÉ: "zvyšuje testosteron", "léčí Alzheimer" — nepodložené
`

interface Claim {
  text: string           // přesný výrok z článku (citace)
  category: 'eu_norm' | 'science' | 'market' | 'internal' | 'general'
  has_source: boolean    // má v textu uvedený zdroj/citaci?
  verdict: 'ok' | 'flag_soft' | 'flag_hard' | 'delete'
  note: string           // vysvětlení verdiktu
  suggested_fix?: string // navrhovaný opravený text
}

interface ArticleAudit {
  slug: string
  category: string
  is_ymyl: boolean       // zdraví/finance/právní = YMYL
  claims: Claim[]
  czech_issues: string[] // gramatické/jazykové chyby (Phase 4)
  needs_source_block: boolean
}

// Kategorie YMYL (Your Money or Your Life)
const YMYL_CATEGORIES = ['vzdelavani', 'pruvodce']
const YMYL_SLUGS = [
  'je-olivovy-olej-zdravy', 'olivovy-olej-na-plet-a-vlasy',
  'olivovy-olej-pro-deti', 'stredomorska-strava-olivovy-olej',
  'polyfenoly-kolik-je-dost', 'polyfenoly-proc-na-nich-zalezi',
  'olivovy-olej-na-smazeni-bod-zakoureni', 'olivovy-olej-vs-slunecnicovy',
  'falesny-olivovy-olej-jak-rozeznat',
]

async function extractAndVerifyClaims(slug: string, body: string, articleCategory: string): Promise<ArticleAudit> {
  const isYmyl = YMYL_SLUGS.includes(slug) || articleCategory === 'vzdelavani'

  const systemPrompt = `Jsi odborný fact-checker pro web o olivových olejích.
Tvým úkolem je vytáhnout VŠECHNA verifikovatelná faktická tvrzení z článku a ohodnotit je.

${EU_IOC_REFERENCE}

KATEGORIE TVRZENÍ:
- eu_norm: čísla z EU/IOC norem (kyselost, peroxidy, health claim limity)
- science: vědecké studie, zdravotní účinky, fyziologické efekty
- market: statistiky produkce, odrůdy, trh, ceny
- internal: interní čísla webu (počty produktů, score čísla — tyto přeskakuj)
- general: ostatní obecná tvrzení o chuti, vůni, kvalitě

VERDIKTY:
- ok: tvrzení je správné a přesné
- flag_soft: tvrzení je přibližně pravdivé, ale chybí zdroj nebo formulace je nepřesná → navrhni opravu
- flag_hard: tvrzení je sporné/nepodložené → vyžaduje rozhodnutí editora
- delete: tvrzení je prokazatelně chybné nebo nebezpečné → smazat

Odpověz POUZE validním JSON objektem (žádný markdown, žádný text okolo):
{
  "claims": [
    {
      "text": "přesný citát z textu (max 150 znaků)",
      "category": "eu_norm|science|market|internal|general",
      "has_source": false,
      "verdict": "ok|flag_soft|flag_hard|delete",
      "note": "stručné vysvětlení (max 100 znaků)",
      "suggested_fix": "opravený text nebo null"
    }
  ],
  "czech_issues": ["seznam konkrétních gramatických chyb max 5 nejvážnějších"],
  "needs_source_block": true
}

Ignoruj {{product:slug}} tokeny, interní statistiky webu (255 olejů apod.) a obecné marketingové výrazy.
Zaměř se ZEJMÉNA na: konkrétní čísla (%, mg/kg, °C), zmínky studií, zdravotní tvrzení, produkční statistiky.`

  const truncatedBody = body.length > 8000 ? body.slice(0, 8000) + '\n...[zkráceno]' : body

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Článek: ${slug}\n\n---\n${truncatedBody}` }],
  })

  const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '{}'

  let parsed: { claims: Claim[]; czech_issues: string[]; needs_source_block: boolean }
  try {
    // Extract JSON if wrapped in markdown code block
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? jsonMatch[1] : rawText
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error(`  JSON parse error for ${slug}: ${rawText.slice(0, 200)}`)
    parsed = { claims: [], czech_issues: [], needs_source_block: isYmyl }
  }

  return {
    slug,
    category: articleCategory,
    is_ymyl: isYmyl,
    claims: parsed.claims ?? [],
    czech_issues: parsed.czech_issues ?? [],
    needs_source_block: isYmyl && (parsed.needs_source_block ?? true),
  }
}

function renderReport(audits: ArticleAudit[]): void {
  const divider = '═'.repeat(80)

  console.log(`\n${divider}`)
  console.log('FAKTICKÝ AUDIT ČLÁNKŮ — SOUHRNNÁ TABULKA')
  console.log(divider)

  // Summary table
  console.log(`\n${'Slug'.padEnd(45)} | OK  | SOFT | HARD | DEL | YMYL | SRC`)
  console.log('-'.repeat(80))

  let totalOk = 0, totalSoft = 0, totalHard = 0, totalDel = 0

  for (const a of audits) {
    const ok   = a.claims.filter(c => c.verdict === 'ok').length
    const soft = a.claims.filter(c => c.verdict === 'flag_soft').length
    const hard = a.claims.filter(c => c.verdict === 'flag_hard').length
    const del  = a.claims.filter(c => c.verdict === 'delete').length
    totalOk += ok; totalSoft += soft; totalHard += hard; totalDel += del

    const ymyl = a.is_ymyl ? 'YMYL' : '    '
    const src  = a.needs_source_block ? 'NED' : ' ok'
    const slug = a.slug.length > 43 ? a.slug.slice(0, 43) + '…' : a.slug
    console.log(`${slug.padEnd(45)} | ${String(ok).padStart(3)} | ${String(soft).padStart(4)} | ${String(hard).padStart(4)} | ${String(del).padStart(3)} | ${ymyl} | ${src}`)
  }

  console.log('-'.repeat(80))
  console.log(`${'CELKEM'.padEnd(45)} | ${String(totalOk).padStart(3)} | ${String(totalSoft).padStart(4)} | ${String(totalHard).padStart(4)} | ${String(totalDel).padStart(3)}`)

  // YMYL articles needing source blocks
  const ymylNoSrc = audits.filter(a => a.is_ymyl && a.needs_source_block)
  if (ymylNoSrc.length > 0) {
    console.log(`\n${divider}`)
    console.log('YMYL ČLÁNKY BEZ ZDROJOVÉHO BLOKU (vyžadují doplnění)')
    console.log(divider)
    ymylNoSrc.forEach(a => console.log(`  → ${a.slug}`))
  }

  // Hard flags (editor decision needed)
  const hardFlags = audits.flatMap(a =>
    a.claims.filter(c => c.verdict === 'flag_hard' || c.verdict === 'delete')
      .map(c => ({ slug: a.slug, ...c }))
  )

  if (hardFlags.length > 0) {
    console.log(`\n${divider}`)
    console.log('FLAG_HARD + DELETE — VYŽADUJÍ ROZHODNUTÍ MAJITELE')
    console.log(divider)
    for (const f of hardFlags) {
      const marker = f.verdict === 'delete' ? '🔴 DELETE' : '🟡 HARD'
      console.log(`\n${marker} | ${f.slug}`)
      console.log(`  Tvrzení: "${f.text}"`)
      console.log(`  Důvod:   ${f.note}`)
      if (f.suggested_fix) console.log(`  Návrh:   "${f.suggested_fix}"`)
    }
  }

  // Soft flags (auto-fixable with suggested wording)
  const softFlags = audits.flatMap(a =>
    a.claims.filter(c => c.verdict === 'flag_soft' && c.suggested_fix)
      .map(c => ({ slug: a.slug, ...c }))
  )

  if (softFlags.length > 0) {
    console.log(`\n${divider}`)
    console.log('FLAG_SOFT — NAVRHOVANÉ OPRAVY (ke schválení)')
    console.log(divider)
    for (const f of softFlags) {
      console.log(`\n🟠 ${f.slug}`)
      console.log(`  Původní: "${f.text}"`)
      console.log(`  Oprava:  "${f.suggested_fix}"`)
      console.log(`  Důvod:   ${f.note}`)
    }
  }

  // Czech issues
  const czechIssues = audits.flatMap(a =>
    (a.czech_issues ?? []).map(issue => ({ slug: a.slug, issue }))
  )

  if (czechIssues.length > 0) {
    console.log(`\n${divider}`)
    console.log('JAZYKOVÉ OPRAVY (Phase 4 — gramatika, překlepy, anglicismy)')
    console.log(divider)
    for (const { slug, issue } of czechIssues) {
      console.log(`  [${slug}] ${issue}`)
    }
  }

  console.log(`\n${divider}`)
  console.log('AUDIT DOKONČEN')
  console.log(divider)
}

async function main() {
  // Fetch all active articles
  const { data: articles, error } = await supabase
    .from('articles')
    .select('slug, category, body_markdown')
    .eq('status', 'active')
    .order('category, slug')

  if (error || !articles) {
    console.error('DB error:', error)
    process.exit(1)
  }

  console.log(`Načteno ${articles.length} aktivních článků. Spouštím audit...\n`)

  const audits: ArticleAudit[] = []
  const BATCH_SIZE = 5

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(articles.length / BATCH_SIZE)

    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.map(a => a.slug).join(', ')}) ---`)

    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (article) => {
        process.stdout.write(`  Zpracovávám: ${article.slug}...`)
        const result = await extractAndVerifyClaims(article.slug, article.body_markdown ?? '', article.category)
        const counts = {
          ok: result.claims.filter(c => c.verdict === 'ok').length,
          soft: result.claims.filter(c => c.verdict === 'flag_soft').length,
          hard: result.claims.filter(c => c.verdict === 'flag_hard').length,
          del: result.claims.filter(c => c.verdict === 'delete').length,
        }
        console.log(` OK:${counts.ok} SOFT:${counts.soft} HARD:${counts.hard} DEL:${counts.del}`)
        return result
      })
    )

    audits.push(...results)

    // Progress report after each batch of ~10 articles
    if ((i + BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= articles.length) {
      const done = Math.min(i + BATCH_SIZE, articles.length)
      const hardSoFar = audits.flatMap(a => a.claims.filter(c => c.verdict === 'flag_hard' || c.verdict === 'delete')).length
      console.log(`\n>>> Průběžný stav: ${done}/${articles.length} článků, ${hardSoFar} hard flags`)
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  renderReport(audits)
}

main().catch(e => { console.error(e); process.exit(1) })
