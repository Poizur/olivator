// Article Reviewer — Claude Haiku kontroluje draft před uložením do DB.
// Vrátí severity: 'ok' | 'warn' | 'block' + verdict + issues.
// 'block' = draft se NESMÍ uložit do article_drafts (cron zaloguje + exit 1).

import { callClaude, extractText } from '@/lib/anthropic'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 600

export interface ReviewResult {
  severity: 'ok' | 'warn' | 'block'
  verdict: string
  issues: string
}

export async function reviewDraft(
  title: string,
  slug: string,
  bodyMarkdown: string,
): Promise<ReviewResult> {
  const wordCount = bodyMarkdown.split(/\s+/).filter(Boolean).length

  const prompt = `Jsi AI reviewer článků pro Olivator.cz. Kontroluješ draft PŘED uložením.

ČLÁNEK:
Titulek: ${title}
Slug: ${slug}
Počet slov: ${wordCount}

TĚLO ČLÁNKU:
${bodyMarkdown.slice(0, 3000)}${bodyMarkdown.length > 3000 ? '\n[...zkráceno...]' : ''}

KONTROLNÍ SEZNAM:
1. Obsahuje vymyšlené produkty? (jména bez {{product:slug}} tokenu = červená vlajka)
2. Obsahuje vymyšlené studie nebo konkrétní čísla bez zdroje?
3. Pro zdravotní tvrzení: jsou kauzální výroky hedgované (naznačují, může přispívat)? EFSA schválené: "přispívá k ochraně LDL cholesterolu" (při ≥250 mg/kg). Zakázáno: "léčí", "chrání před rakovinou/cukrovkou/infarktem", "zaručeně pomáhá"
4. Je minimálně 300 slov?
5. Jsou affiliate CTA přirozené (ne "KLIKNI ZDE!")?
6. Existují {{product:slug}} tokeny (alespoň 1)?
7. Jmenuje karanténní/neaktivní retailery jako místo k nákupu? (Olivum, Gaea.cz, Olivovyolej.cz, GreekMarket, Jamonárna, Milujeme Krétu, Nestonej, Ellada, Olivarna, Lozano Červenka, Zdrave-oleje, Zdravoslav, Aktin, Cerfis, Delishop, Topdelikatesy, Vinotéka Praha)
8. Obsahuje tvrzení o fyzickém testování? ("testovali jsme", "degustovali jsme", "laboratorně ověřeno", "náš tým ochutnal") — Olivator neprovádí fyzické testy

ODPOVĚZ VÝHRADNĚ V TOMTO FORMÁTU (žádný jiný text):
SEVERITY: ok|warn|block
VERDICT: jednověté shrnutí co je OK nebo co konkrétně vadí
ISSUES: seznam problémů oddělen středníky, nebo "Žádné"

PRAVIDLA:
- block: vymyšlené produkty/studie; zdravotní slib mimo EFSA znění (léčí/chrání před/zaručeně + nemoc); jmenuje karanténní retailer jako nákupní místo; tvrdí fyzické testování/degustaci; < 150 slov
- warn: chybí {{product:}} token; slabé hedgování zdravotních tvrzení; < 500 slov
- ok: splňuje vše výše`

  const response = await callClaude({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = extractText(response).trim()

  const severityMatch = text.match(/SEVERITY:\s*(ok|warn|block)/i)
  const verdictMatch = text.match(/VERDICT:\s*(.+?)(?:\n|$)/i)
  const issuesMatch = text.match(/ISSUES:\s*([\s\S]+?)(?:\n\n|$)/i)

  if (!severityMatch) {
    console.warn('[article-reviewer] Neplatný formát odpovědi, fallback warn:', text.slice(0, 200))
    return {
      severity: 'warn',
      verdict: 'Reviewer vrátil neplatný formát odpovědi — manuální kontrola nutná',
      issues: text.slice(0, 300),
    }
  }

  return {
    severity: severityMatch[1].toLowerCase() as 'ok' | 'warn' | 'block',
    verdict: verdictMatch?.[1]?.trim() ?? '',
    issues: issuesMatch?.[1]?.trim() ?? 'Žádné',
  }
}
