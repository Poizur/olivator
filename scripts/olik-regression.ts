/**
 * Regresní test Olíka nad anonymní sadou skutečných dotazů (scripts/olik-test-questions.json).
 * Každou odpověď kontroluje deterministický validátor (oleje, ceny, obchody) a nezávislý posuzovatel (Sonnet:
 * jazyk, zdravotní tvrzení, vymyšlená fakta).
 *
 *   env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/olik-regression.ts [výstup.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { answerOlik, buildOlikContext, validateOlikReply, catalogLine, type OlikMessage } from '@/lib/olik'
import { callClaude, extractText } from '@/lib/anthropic'

const { rozhovory } = JSON.parse(readFileSync('scripts/olik-test-questions.json', 'utf8')) as { rozhovory: string[][] }
const outPath = process.argv[2] ?? '/tmp/olik-regression.json'
const only = process.argv[3]?.toLowerCase()

async function judge(q: string, a: string, catalog: string): Promise<Record<string, string[]>> {
  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Posuď odpověď chatbota Olík webu Olivátor (olivator.cz, srovnávač olivových olejů). Vrať POUZE JSON {"jazyk":[],"zdravi":[],"vymysleno":[]}.
- jazyk: chyby češtiny v odpovědi (cizí/slovenská slova, zkomolené tvary). Ignoruj vlastní jména (oleje, značky, odrůdy, obchody) a slova převzatá z dotazu uživatele.
- zdravi: tvrzení o účincích na zdraví. NEPOČÍTEJ: „olivový olej není lék“, obsah polyfenolů v mg/kg, obecné tvrzení EU 432/2012 o ochraně lipidů v krvi s podmínkou hydroxytyrosolu.
- vymysleno: oleje, obchody, ceny, parametry nebo důvody, které nejsou v katalogu níže. Značky, které zmínil sám uživatel, smí chatbot jmenovat, když říká, že je nemáme. Odkazy /srovnavac, /zebricek/…, /metodika, /pruvodce, /porovnani jsou stránky webu; info@makyoutdoors.com je skutečný kontakt.
Prázdná pole = v pořádku.

KATALOG, který chatbot měl:
${catalog}

DOTAZ: ${q}
ODPOVĚĎ:
${a}`,
    }],
  })
  const t = extractText(res)
  try {
    return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
  } catch {
    return { chyba_parsovani: [t.slice(0, 200)] }
  }
}

;(async () => {
  const out: Array<Record<string, unknown>> = []
  for (const questions of rozhovory.filter((r) => !only || r.some((q) => q.toLowerCase().includes(only)))) {
    const history: OlikMessage[] = []
    for (const q of questions) {
      history.push({ role: 'user', content: q })
      const res = await answerOlik(history)
      history.push({ role: 'assistant', content: res.text })
      const ctx = await buildOlikContext(q)
      const catalog = ctx.products.map(catalogLine).join('\n') + '\nObchody: ' + ctx.activeRetailers.map((r) => r.name).join(', ')
      out.push({
        q,
        a: res.text,
        attempts: res.attempts,
        fallback: res.fallback,
        issues: res.issues,
        recheck: validateOlikReply(res.text, ctx, q),
        judge: await judge(q, res.text, catalog),
      })
      process.stdout.write('.')
    }
  }
  writeFileSync(outPath, JSON.stringify(out, null, 1))
  const count = (k: string) => out.filter((x) => ((x.judge as Record<string, string[]>)[k] ?? []).length > 0).length
  console.log(`\nodpovědí ${out.length} | přegenerováno ${out.filter((x) => (x.attempts as number) > 1).length} | bezpečná odpověď ${out.filter((x) => x.fallback).length}`)
  console.log(`validátor ${out.filter((x) => (x.recheck as string[]).length > 0).length} | vymyšleno ${count('vymysleno')} | zdraví ${count('zdravi')} | jazyk ${count('jazyk')}`)
})()
