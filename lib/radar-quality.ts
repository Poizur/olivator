// Brána pro auto-publikaci radar zpráv. Pořadí: zdroj → plný text → typ zprávy →
// jazyk → zakázané fráze → AI reviewer (fakta vs. originál, zdravotní tvrzení).
// Cokoli nejistého = draft do admin fronty, nikdy publikace.

import { runReview } from './ai-reviewer'
import { findBannedPhrase } from './content-validator'
import { isGoogleNewsUrl } from './google-news-url'

export type RadarDecision = 'publish' | 'draft' | 'drop'

export interface RadarQualityInput {
  sourceUrl: string | null
  fullText: string | null
  originalTitle?: string | null
  badge: string
  czechTitle: string
  czechSummary: string
  czechArticle: string
  czContext?: string | null
}

export interface RadarQualityResult {
  decision: RadarDecision
  reasons: string[]
}

const MIN_FULLTEXT_CHARS = 200
// Zdravotní studie (YMYL) vždy jen ručně — i když reviewer nic nenajde.
const NEVER_AUTO_BADGES = new Set(['science'])
const ENGLISH_STOPWORDS = /\b(the|and|with|from|that|this|which|were|have)\b/gi

export function checkCzechLanguage(text: string): string | null {
  if (/[Ѐ-ӿ]/.test(text)) return 'obsahuje cyrilici'
  if (/[Ͱ-Ͽ]/.test(text)) return 'obsahuje řecké písmo'
  const words = text.split(/\s+/).filter(Boolean).length
  const english = text.match(ENGLISH_STOPWORDS)?.length ?? 0
  if (words > 0 && english / words > 0.03) return 'část textu není přeložená (anglická slova)'
  if (!/[ěščřžýůú]/i.test(text)) return 'chybí česká diakritika — text asi není česky'
  return null
}

// Zdravotní zprávy (YMYL) se ani nepřekládají — rozhoduje se z originálního titulku a popisu.
const HEALTH_SIGNALS = /\b(health\w*|stud(y|ies)|research\w*|diet\w*|heart|cardio\w*|cancer|brain|alzheimer\w*|dementia|diabet\w*|cholesterol|blood pressure|obes\w*|weight loss|longevity|live longer|disease\w*|patients?|acne|gut|inflammat\w*|zdrav\w*|studie|výzkum\w*|diet[ay]\w*|nemoc\w*|rakovin\w*|srdc\w*)\b/i

export function looksLikeHealthStory(title: string, description = ''): boolean {
  return HEALTH_SIGNALS.test(`${title} ${description}`)
}

// Stahovač někdy vrátí jen navigaci webu — článek pak v textu vůbec není.
export function fullTextMatchesTitle(fullText: string, title: string): boolean {
  // Google News přidává " - Vydavatel" — jméno média v textu článku nebývá
  const words = title.replace(/\s+-\s+[^-]+$/, '').toLowerCase().match(/[\p{L}\d]{5,}/gu) ?? []
  const significant = [...new Set(words)]
  if (significant.length < 2) return true
  const text = fullText.toLowerCase()
  const found = significant.filter((w) => text.includes(w)).length
  return found / significant.length >= 0.5
}

export async function evaluateRadarItem(input: RadarQualityInput): Promise<RadarQualityResult> {
  if (!input.sourceUrl || isGoogleNewsUrl(input.sourceUrl)) {
    return { decision: 'drop', reasons: ['nedohledaná skutečná URL článku'] }
  }
  if (!input.fullText || input.fullText.length < MIN_FULLTEXT_CHARS) {
    return { decision: 'drop', reasons: ['nepodařilo se stáhnout text originálu'] }
  }
  if (input.originalTitle && !fullTextMatchesTitle(input.fullText, input.originalTitle)) {
    return { decision: 'drop', reasons: ['stažený text neodpovídá článku (asi jen navigace webu)'] }
  }

  const reasons: string[] = []
  if (NEVER_AUTO_BADGES.has(input.badge)) reasons.push('zdravotní studie — vždy ruční schválení')

  const czech = [input.czechTitle, input.czechSummary, input.czechArticle, input.czContext ?? ''].join('\n\n')
  const lang = checkCzechLanguage(czech)
  if (lang) reasons.push(`jazyk: ${lang}`)
  const banned = findBannedPhrase(czech)
  if (banned) reasons.push(`zakázaná fráze: ${banned}`)
  if (reasons.length > 0) return { decision: 'draft', reasons }

  const review = await runReview({
    agentName: 'radar-reviewer',
    prompt: `Jsi fact-checker a korektor české redakce srovnávače olivových olejů. Porovnej český článek s originálem.
Dnešní datum: ${new Date().toISOString().slice(0, 10)} (podle něj posuzuj „letos“, „loni“ apod.).

ORIGINÁL (zdroj: ${input.sourceUrl}, může být zkrácený na 4000 znaků):
${input.fullText}

ČESKÝ ČLÁNEK:
Titulek: ${input.czechTitle}
Perex: ${input.czechSummary}
${input.czechArticle}
Kontext pro Česko: ${input.czContext || '(není)'}

PRAVIDLA (porušení = severity "block"):
1. fakta: každé číslo, jméno, místo a tvrzení musí být v originálu; nic navíc, nic překrouceného
2. zdraví: žádná zdravotní tvrzení (léčí, chrání, snižuje riziko, prodlužuje život…)
3. jazyk: správná čeština, žádné zbytky angličtiny
4. tón: věcný, bez marketingu a superlativů, které nejsou v originálu
Pokud tvrzení nejde v (zkráceném) originálu ověřit, je to "warn".
Uveď nejvýš 4 nejzávažnější issues, každý detail do 120 znaků.

Vrať POUZE JSON: {"verdict":"ok"|"warn"|"block","issues":[{"rule":"fakta|zdravi|jazyk|ton","severity":"info"|"warn"|"block","detail":"..."}],"summary":"..."}`,
  })
  if (review.verdict !== 'ok') {
    const detail = review.issues.filter((i) => i.severity !== 'info').map((i) => `${i.rule}: ${i.detail}`)
    return { decision: 'draft', reasons: [`reviewer ${review.verdict}`, ...detail].slice(0, 4) }
  }
  return { decision: 'publish', reasons: [] }
}
