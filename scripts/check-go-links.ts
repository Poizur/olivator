/**
 * Prebuild kontrola: žádný next/link <Link> nesmí vést na /go/ (router ho prefetchne při zobrazení stránky →
 * zalogovaný klik + návštěva eHUBu bez kliknutí, nález 2026-11-19). Affiliate odkazy jen přes components/affiliate-link.tsx.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['app', 'components', 'lib']
const EXT = /\.(tsx?|jsx?|mdx?)$/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (EXT.test(name)) out.push(p)
  }
  return out
}

const hits: string[] = []
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8')
    if (!/from\s+['"]next\/link['"]/.test(src)) continue
    const tagRe = /<Link\b[^>]*?>/gs
    let m: RegExpExecArray | null
    while ((m = tagRe.exec(src)) !== null) {
      if (/\/go\//.test(m[0])) hits.push(`${file}:${src.slice(0, m.index).split('\n').length}`)
    }
  }
}

if (hits.length > 0) {
  console.error(`[check-go-links] ✗ next/link vede na /go/ (použij AffiliateLink):\n  ${hits.join('\n  ')}`)
  process.exit(1)
}
console.log('[check-go-links] ✓ žádný <Link> na /go/')
