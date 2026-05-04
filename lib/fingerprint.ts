// Breaking news deduplication fingerprint — TypeScript port z Python
// tools/fingerprint.py (only5l-agent / AIkompass).
//
// Normalizuje titulek + popis na 12-char hash — semanticky identické eventy
// mají stejný fingerprint bez ohledu na formulaci (CZ/EN, slovosled).
//
// Příklady shodných fingerprint:
//   "Harvest 2025: rekordní produkce Kalamata"
//   "Kalamata: rekordní sklizeň v roce 2025"
//   "Record Kalamata harvest 2025"
// → stejný fingerprint (entities: kalamata, harvest verb, year omitted)

import { createHash } from 'node:crypto'

const STOPWORDS = new Set<string>([
  // CZ
  'je', 'se', 'si', 'v', 'na', 'do', 'o', 'z', 'ze', 'od', 'po', 'při',
  'pro', 'a', 'i', 's', 'u', 'k', 'ke', 'že', 'aby', 'nebo', 'ale',
  'by', 'bude', 'budou', 'byl', 'byla', 'byly', 'jsou', 'jsem', 'jsi',
  'to', 'ten', 'ta', 'ty', 'tu', 'má', 'mají', 'měl', 'měla', 'rok',
  'roce', 'roku', 'dne', 'minulý', 'letošní', 'nový', 'nová', 'nové',
  'získal', 'získala', 'zajistil', 'zajistila', 'spustil', 'spustila',
  'oznámil', 'oznámila', 'přidává', 'přidala', 'představil',
  'series', 'seed', 'ipo', 'bridge', 'million', 'billion', 'thousand',
  'funding', 'round', 'investment', 'capital',
  // EN
  'the', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'for', 'of', 'in', 'on', 'at', 'to', 'with', 'by', 'from', 'into',
  'and', 'or', 'but', 'as', 'that', 'this', 'these', 'those', 'has',
  'have', 'had', 'will', 'would', 'can', 'could', 'should', 'may',
  'raises', 'raised', 'launches', 'launched', 'announces', 'announced',
  'acquires', 'acquired', 'releases', 'released', 'secures', 'secured',
  'bans', 'banned', 'today', 'yesterday', 'new',
  'news', 'update', 'report', 'story', 'breaking', 'just', 'now',
  // Generic words v CZ/EN co kazí entity extract
  'platforma', 'platformu', 'nástroj', 'nástroje', 'firma', 'firmy',
  'tool', 'tools', 'company', 'service',
])

const RX_MONEY_DOLLAR = /\$\s?(\d+(?:[.,]\d+)?)\s?([MBK])?/gi
const RX_MONEY_UNIT = /\b(\d+(?:[.,]\d+)?)\s*(milion[ůuy]?|mil\.?|mld\.?|miliard[ůuy]?|tisíc|million[s]?|billion[s]?|thousand[s]?)\b/gi
const RX_MONEY_TAIL = /\b(\d+(?:[.,]\d+)?)\s?([MBK])?\s*(USD|EUR|Kč|dolar[ůu]?|koru[nyu]?)\b/gi
const RX_PERCENT = /(\d+(?:[.,]\d+)?)\s*%/g
const RX_FUNDING_ROUND = /\b(series\s*[A-D]|seed|pre[-\s]?seed|IPO|bridge)\b/gi

// Pro olivový olej — produktové linie / brandy / certifikace jako "version" entity
const RX_VERSION = /\b(EVOO|DOP|PGP|IGP|BIO|Organic|NYIOOC|Kalamata|Koroneiki|Picual|Arbequina|Frantoio|Hojiblanca)\s*(?:v\.?\s*)?(\d+(?:\.\d+)?(?:\.\d+)?)?/gi

const ACTION_VERBS: Array<{ rx: RegExp; cat: string }> = [
  { rx: /\b(harvest|sklize[ňn]|úroda|production|produkce|yield)\b/gi, cat: 'harvest' },
  { rx: /\b(price|cena|ceník|zdražuje|snižuje|cost[s]?\s+more)\b/gi, cat: 'pricing' },
  { rx: /\b(award|oceněn[íi]|gold|silver|winner|nyiooc|laureate)\b/gi, cat: 'award' },
  { rx: /\b(study|research|polyphenol|health|zdrav[íi]|finding[s]?)\b/gi, cat: 'science' },
  { rx: /\b(certification|certifikace|dop|pgp|fraud|recall|stažen[íi])\b/gi, cat: 'quality' },
  { rx: /\b(launch(?:es|ed)?|release(?:s|d)?|spouští|vydal[oa]?|uvádí|debutuj[ie])\b/gi, cat: 'launch' },
  { rx: /\b(acqui(?:res|red|sition)|buy[s]?|bought|koupil[aoy]?|fúze|merger)\b/gi, cat: 'acquisition' },
  { rx: /\b(shut\s*down|ban[s]?|banned|ukončuje|zakázal[aoy]?|regulace|regulation)\b/gi, cat: 'shutdown' },
  { rx: /\b(partner(?:ship)?|partnerství|spolupráce|joins)\b/gi, cat: 'partnership' },
]

function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
}

function normalizeMoney(num: string, unit: string | null = null): string {
  let n = num.replace(/,/g, '.').trim()
  if (n.includes('.')) {
    const f = parseFloat(n)
    if (!isNaN(f)) n = f === Math.floor(f) ? String(Math.floor(f)) : f.toString()
  }
  let u = (unit ?? '').toLowerCase().replace(/\.+$/, '')
  if (['mil', 'milion', 'milionu', 'millionu', 'milionů', 'million', 'millions'].includes(u)) u = 'm'
  else if (['mld', 'miliard', 'miliardu', 'miliardů', 'billion', 'billions'].includes(u)) u = 'b'
  else if (['tisíc', 'thousand', 'thousands'].includes(u)) u = 'k'
  else if (!['m', 'b', 'k'].includes(u)) u = ''
  return `${n}${u}`
}

const MONTHS_TO_SKIP = new Set([
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec',
  'srpen', 'září', 'říjen', 'listopad', 'prosinec',
])

function extractEntities(title: string, content = ''): string[] {
  const blob = `${title}  ${content}`.trim()
  if (!blob) return []
  const ents = new Set<string>()

  let m: RegExpExecArray | null
  RX_MONEY_DOLLAR.lastIndex = 0
  while ((m = RX_MONEY_DOLLAR.exec(blob)) !== null) {
    ents.add('$' + normalizeMoney(m[1], m[2] ?? null))
  }
  RX_MONEY_UNIT.lastIndex = 0
  while ((m = RX_MONEY_UNIT.exec(blob)) !== null) {
    ents.add('$' + normalizeMoney(m[1], m[2] ?? null))
  }
  RX_MONEY_TAIL.lastIndex = 0
  while ((m = RX_MONEY_TAIL.exec(blob)) !== null) {
    ents.add('$' + normalizeMoney(m[1], m[2] ?? null))
  }
  RX_VERSION.lastIndex = 0
  while ((m = RX_VERSION.exec(blob)) !== null) {
    const tool = m[1].toLowerCase().replace(/\s/g, '-')
    const ver = m[2] ?? ''
    ents.add(`v:${tool}${ver ? '-' + ver : ''}`)
  }
  RX_FUNDING_ROUND.lastIndex = 0
  while ((m = RX_FUNDING_ROUND.exec(blob)) !== null) {
    ents.add(`r:${m[1].toLowerCase().replace(/\s|_/g, '-')}`)
  }
  RX_PERCENT.lastIndex = 0
  while ((m = RX_PERCENT.exec(blob)) !== null) {
    ents.add(`%:${m[1].replace(',', '.')}`)
  }

  // Action verbs — pouze první match (dominantní akce)
  for (const { rx, cat } of ACTION_VERBS) {
    if (rx.test(blob)) {
      ents.add(`a:${cat}`)
      break
    }
  }

  // Capitalized brand entities — z titulu jen
  const titleWords = title.match(/\b([A-Z][a-zA-Z0-9]{2,})\b/g) ?? []
  for (const word of titleWords) {
    const lw = word.toLowerCase()
    if (STOPWORDS.has(lw)) continue
    if (MONTHS_TO_SKIP.has(lw)) continue
    if (/^\d+$/.test(lw)) continue
    ents.add(`e:${stripDiacritics(lw)}`)
  }

  return Array.from(ents).sort()
}

/** Vrátí 12-char sha256 hash normalizovaných entit. Nikdy neraiseuje. */
export function makeFingerprint(title: string, content = ''): string {
  try {
    const entities = extractEntities(title || '', content || '')
    if (entities.length === 0) {
      const key = stripDiacritics((title || '').toLowerCase()).trim()
      if (!key) return 'empty'
      return createHash('sha256').update(key).digest('hex').slice(0, 12)
    }
    return createHash('sha256').update(entities.join('|')).digest('hex').slice(0, 12)
  } catch {
    return 'error'
  }
}

/** Normalizovaná word-set podobnost (0-1). Pro Haiku gate near-duplicates. */
export function jaccard(a: string, b: string): number {
  const tokens = (s: string): Set<string> => {
    const ns = stripDiacritics((s || '').toLowerCase())
    const words = ns.match(/\w+/g) ?? []
    return new Set(words.filter((w) => !STOPWORDS.has(w) && w.length > 2))
  }
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const x of ta) if (tb.has(x)) inter++
  const union = ta.size + tb.size - inter
  return union > 0 ? inter / union : 0
}
