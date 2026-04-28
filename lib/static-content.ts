// Static editorial content — articles, rankings
// Until Content Agent is wired up, these live in code

import type { Article, Ranking } from './types'

export const ARTICLES: Article[] = [
  { slug: 'jak-vybrat-olivovy-olej', title: 'Jak vybrat olivový olej: na co opravdu záleží', category: 'pruvodce', excerpt: 'Kyselost, polyfenoly, certifikace — vysvětlujeme, co znamenají čísla na etiketě a proč na nich záleží.', readTime: '8 min čtení', emoji: '📖' },
  { slug: 'nejlepsi-olivovy-olej-2025', title: 'Nejlepší olivový olej 2025: testujeme 28 produktů', category: 'zebricek', excerpt: 'Nezávislý test 28 olejů dostupných v ČR. Hodnotíme kyselost, polyfenoly, certifikace a cenu za 100 ml.', readTime: '15 min čtení', emoji: '🏆' },
  { slug: 'recky-vs-italsky', title: 'Řecký vs italský olivový olej — který vybrat?', category: 'srovnani', excerpt: 'Dva největší hráči na trhu olivových olejů. Srovnáváme chuťové profily, certifikace a ceny.', readTime: '6 min čtení', emoji: '🇬🇷' },
  { slug: 'polyfenoly-proc-na-nich-zalezi', title: 'Polyfenoly v olivovém oleji: proč na nich záleží', category: 'vzdelavani', excerpt: 'Polyfenoly jsou klíčem ke zdravotním benefitům olivového oleje. Kolik jich potřebujete a kde je najdete?', readTime: '5 min čtení', emoji: '⚗️' },
  { slug: 'bruschetta-s-rajcaty', title: 'Bruschetta s rajčaty a bazalkou', category: 'recept', excerpt: 'Klasika italské kuchyně, kde kvalita olivového oleje dělá rozdíl. S doporučením konkrétního oleje.', readTime: '3 min čtení', emoji: '🍅' },
  { slug: 'domaci-pesto', title: 'Domácí pesto alla genovese', category: 'recept', excerpt: 'Autentické pesto vyžaduje kvalitní EVOO. Ukážeme recept a doporučíme olej, který mu sedne nejlíp.', readTime: '4 min čtení', emoji: '🌿' },
]

// Rankings reference products by slug (stable identifier)
export const RANKINGS: Ranking[] = [
  {
    slug: 'nejlepsi-olivovy-olej-2025',
    title: 'Nejlepší olivový olej 2025',
    description: 'Top 8 olejů dle Olivator Score',
    productIds: [
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l',
      'evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-3-l',
      'intini-coratina-alberobello',
      'iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml',
      'intini-extra-alberobello',
    ],
    emoji: '🏆',
  },
  {
    slug: 'nejlepsi-recky-olej',
    title: 'Nejlepší řecký olivový olej',
    description: 'Top řecké oleje — Kréta, Peloponés, Korfu. Většinou s DOP certifikací.',
    productIds: [
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l',
      'evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-3-l',
      'iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml',
    ],
    emoji: '🇬🇷',
  },
  {
    slug: 'nejlepsi-bio-olej',
    title: 'Nejlepší bio olivový olej',
    description: 'BIO certifikované oleje seřazené dle Score',
    productIds: [
      'evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml',
      'corinto-aryballos-bio-extra-panensky-olivovy-olej-manaki-0-3-300-ml',
      'corinto-pelopones-bio-extra-panensky-olivovy-olej-manaki-0-4-500-ml',
    ],
    emoji: '🌿',
  },
  {
    slug: 'nejlepsi-italsky-olej',
    title: 'Nejlepší italský olivový olej',
    description: 'Top italské oleje — Apulie, Toskánsko. Charakteristická chuť, vysoké polyfenoly.',
    productIds: [
      'intini-coratina-alberobello',
      'intini-extra-alberobello',
    ],
    emoji: '🇮🇹',
  },
  {
    slug: 'nejlepsi-vysokopolyfenolovy-olej',
    title: 'Nejlepší vysokopolyfenolové oleje',
    description: 'Oleje s obsahem polyfenolů nad 500 mg/kg — funkční elixíry s nejvyšším antioxidačním potenciálem.',
    productIds: [
      'evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml',
      'intini-extra-alberobello',
      'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l',
      'intini-coratina-alberobello',
      'corinto-pelopones-600-polyfenolu-extra-panensky-olivovy-olej-0-3-500-ml',
    ],
    emoji: '⚗️',
  },
]

export function getArticles(category?: string): Article[] {
  if (category) return ARTICLES.filter(a => a.category === category)
  return ARTICLES
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find(a => a.slug === slug)
}

export function getRankings(): Ranking[] {
  return RANKINGS
}

export function getRankingBySlug(slug: string): Ranking | undefined {
  return RANKINGS.find(r => r.slug === slug)
}
