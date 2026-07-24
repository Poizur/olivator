const HEALTH_KEYWORDS = [
  'zdrav', 'srdce', 'cholesterol', 'plet', 'deti', 'děti', 'tehotenstv', 'těhotenst',
  'nemoc', 'lecb', 'léčb', 'hubnut', 'antioxid', 'polyfenol', 'zánět', 'zanet',
  'imunit', 'diabet', 'krevn', 'omega', 'vitamin', 'vitamín',
]

/** Vrátí true pokud článek splňuje zdravotní klíčová slova. Recepty vždy false. */
export function isHealthArticle(slug: string, title: string, category: string): boolean {
  if (category === 'recept') return false
  const text = (slug + ' ' + title).toLowerCase()
  return HEALTH_KEYWORDS.some((kw) => text.includes(kw))
}

export function HealthDisclaimer() {
  return (
    <div className="mt-10 flex gap-3 p-4 bg-off/60 border border-off2 rounded-xl">
      <span className="shrink-0 text-[18px] mt-0.5" aria-hidden>⚕️</span>
      <p className="text-[13px] text-text3 leading-relaxed m-0">
        <strong className="text-text2 font-medium">Zdravotní upozornění:</strong>{' '}
        Informace v tomto článku mají vzdělávací charakter a nenahrazují lékařskou radu.
        Máte-li zdravotní potíže, poraďte se s lékařem.
      </p>
    </div>
  )
}
