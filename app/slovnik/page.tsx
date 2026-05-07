// Slovník olivového oleje — SEO-cílené landing pages pro long-tail keywords.
// Schema.org DefinedTermSet jako celek + DefinedTerm per term.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getActiveTerms } from '@/lib/glossary-db'

export const metadata: Metadata = {
  title: 'Slovník olivového oleje',
  description:
    'Co znamenají termíny na etiketě olivového oleje. Kyselost, polyfenoly, DOP, BIO, NYIOOC, oleocanthal — vše vysvětleno.',
  alternates: { canonical: 'https://olivator.cz/slovnik' },
}

export const revalidate = 3600

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Obecné',
  chemistry: 'Chemie',
  certification: 'Certifikace',
  process: 'Zpracování',
  cultivar: 'Odrůdy',
  region: 'Regiony',
}

export default async function SlovnikPage() {
  const terms = await getActiveTerms()

  // Group by category
  const byCategory = new Map<string, typeof terms>()
  for (const t of terms) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, [])
    byCategory.get(t.category)!.push(t)
  }

  // Schema.org DefinedTermSet pro celý slovník
  const definedTermSet = terms.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Slovník olivového oleje',
    description: 'Termíny olivového oleje vysvětlené pro spotřebitele',
    url: 'https://olivator.cz/slovnik',
    inLanguage: 'cs-CZ',
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definitionShort,
      url: `https://olivator.cz/slovnik/${t.slug}`,
      termCode: t.slug,
    })),
  } : null

  return (
    <div className="max-w-[900px] mx-auto px-6 md:px-10 py-12">
      {definedTermSet && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSet) }}
        />
      )}

      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <span>Slovník</span>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        Slovník olivového oleje
      </h1>
      <p className="text-[16px] text-text2 font-light mb-10 max-w-[600px]">
        Co znamenají termíny na etiketě a v článcích. Stručné definice, link na detail
        kde dává smysl.
      </p>

      {terms.length === 0 ? (
        <div className="bg-off/40 border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">📖</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Slovník se právě připravuje</h2>
          <p className="text-[13px] text-text3 max-w-[400px] mx-auto">
            Brzy zde najdeš definice klíčových termínů — kyselost, polyfenoly, DOP, BIO,
            oleocanthal a další. Mezitím zkus{' '}
            <Link href="/pruvodce" className="text-olive">průvodce</Link>.
          </p>
        </div>
      ) : (
        <>
          {/* Quick alphabetical jump */}
          <div className="bg-white border border-off2 rounded-xl p-4 mb-8 flex flex-wrap gap-2">
            {Array.from(byCategory.keys()).sort().map((cat) => (
              <a
                key={cat}
                href={`#${cat}`}
                className="text-[12px] bg-off rounded-full px-3 py-1.5 text-text2 hover:bg-olive-bg hover:text-olive-dark transition-colors"
              >
                {CATEGORY_LABEL[cat] ?? cat} ({byCategory.get(cat)!.length})
              </a>
            ))}
          </div>

          <div className="space-y-10">
            {Array.from(byCategory.keys()).sort().map((cat) => (
              <section key={cat} id={cat}>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
                  {CATEGORY_LABEL[cat] ?? cat}
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {byCategory.get(cat)!.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/slovnik/${t.slug}`}
                      className="bg-white border border-off2 rounded-lg p-4 hover:border-olive-light hover:shadow-sm transition-all"
                    >
                      <div className="text-[15px] font-medium text-text mb-1">
                        {t.term}
                      </div>
                      {t.termAlt && (
                        <div className="text-[10px] text-text3 mb-1.5 italic">
                          {t.termAlt}
                        </div>
                      )}
                      <p className="text-[12px] text-text2 leading-relaxed line-clamp-3">
                        {t.definitionShort}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
