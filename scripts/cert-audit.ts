/**
 * T-27: Systémový audit certifikací — všechny aktivní produkty.
 *
 * Pro každý produkt:
 *   1. Načteme certifications[] z DB
 *   2. Zkontrolujeme zda každá cert je zmíněna v description_short + description_long
 *   3. Zaznamenáme do tabulky: slug × cert × verified(boolean)
 *
 * Scoring certs: dop, pdo, pgp, pgi, igp, bio, organic, nyiooc, demeter
 * (ty ostatní neovlivňují score — agrocert, iso22000 atd.)
 */
import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const SCORING_CERTS = new Set([
  'dop', 'pdo', 'pgp', 'pgi', 'igp', 'bio', 'organic', 'nyiooc', 'demeter',
])

// Klíčová slova pro každou certifikaci, hledáme v popisu (CS/EN)
// POZOR: \w nematchuje češtinu; \b nefunguje okolo teček v P.D.O.
// Proto používáme jednoduché testy bez \b a bez \w pro češtinu.
const CERT_KEYWORDS: Record<string, RegExp> = {
  dop:     /(dop|chop|p\.d\.o\.|d\.o\.p\.|pdo|protected designation of origin|chran[eě][dn][oý][mu]? ozna[cč][eě]n)/i,
  pdo:     /(pdo|p\.d\.o\.|d\.o\.p\.|dop|chop)/i,
  pgp:     /(pgp|chzop|p\.g\.i\.|i\.g\.p\.|pgi|igp|protected geographical|chran[eě][dn][oý][mu]? zem[eě]pisn)/i,
  pgi:     /(pgi|p\.g\.i\.|i\.g\.p\.|pgp|chzop|igp|indicazione geografica)/i,
  igp:     /(igp|i\.g\.p\.|p\.g\.i\.|pgi|pgp)/i,
  bio:     /(bio|organic|ekologick|biologico|biologic|certifikat.*bio|bio.*certif|eko certif)/i,
  organic: /(organic|bio\b|ekologick|organick|biologico)/i,
  nyiooc:  /(nyiooc|new york international olive|new york.*competition)/i,
  demeter: /(demeter|biodynamick)/i,
}

interface AuditRow {
  slug: string
  name: string
  cert: string
  isScoring: boolean
  verifiedInDesc: boolean
  description_has_text: boolean
}

async function main() {
  const { data: products, error } = await s
    .from('products')
    .select('id, slug, name, certifications, description_short, description_long')
    .eq('status', 'active')
    .not('certifications', 'eq', '{}')
    .order('name')

  if (error) { console.error(error); process.exit(1) }

  const rows: AuditRow[] = []
  const unverified: { slug: string; name: string; cert: string }[] = []

  for (const p of products!) {
    const certs = (p.certifications as string[]) ?? []
    const fullText = [p.name, p.description_short, p.description_long].filter(Boolean).join(' ')

    for (const cert of certs) {
      const isScoring = SCORING_CERTS.has(cert.toLowerCase())
      const kw = CERT_KEYWORDS[cert.toLowerCase()]
      const verifiedInDesc = kw ? kw.test(fullText) : false
      const description_has_text = fullText.length > 10

      rows.push({ slug: p.slug, name: p.name, cert, isScoring, verifiedInDesc, description_has_text })

      if (isScoring && !verifiedInDesc) {
        unverified.push({ slug: p.slug, name: p.name, cert })
      }
    }
  }

  // Report
  console.log('═══ CERTIFIKACE AUDIT — VÝSLEDKY ═══\n')
  console.log(`Produktů s alespoň jednou certifikací: ${products!.length}`)
  console.log(`Celkem certifikací: ${rows.length}`)
  console.log(`Scoring certifikací: ${rows.filter(r => r.isScoring).length}`)
  console.log(`  z toho ověřeno v popisu: ${rows.filter(r => r.isScoring && r.verifiedInDesc).length}`)
  console.log(`  NEOVĚŘENO: ${unverified.length}\n`)

  if (unverified.length > 0) {
    console.log('═══ NEOVĚŘENÉ SCORING CERTIFIKACE (k ručnímu review) ═══')
    for (const u of unverified) {
      console.log(`  ${u.cert.toUpperCase().padEnd(10)} ${u.slug}`)
    }
    console.log()
  }

  // Tabulka: certifikace × počet produktů
  const certCounts: Record<string, { total: number; verified: number; unverified: number }> = {}
  for (const r of rows.filter(r => r.isScoring)) {
    const c = r.cert.toLowerCase()
    if (!certCounts[c]) certCounts[c] = { total: 0, verified: 0, unverified: 0 }
    certCounts[c].total++
    if (r.verifiedInDesc) certCounts[c].verified++
    else certCounts[c].unverified++
  }

  console.log('═══ SCORING CERIFIKACE — PŘEHLED ═══')
  console.log('CERT       CELKEM  OVĚŘENO  NEOVĚŘENO')
  for (const [c, v] of Object.entries(certCounts).sort((a, b) => b[1].total - a[1].total)) {
    const flag = v.unverified > 0 ? ' ⚠️' : ''
    console.log(`${c.toUpperCase().padEnd(10)} ${String(v.total).padStart(6)}  ${String(v.verified).padStart(7)}  ${String(v.unverified).padStart(9)}${flag}`)
  }

  console.log('\nHotovo.')
}

main().catch(console.error)
