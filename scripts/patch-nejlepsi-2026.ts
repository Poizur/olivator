import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: article, error: fetchErr } = await supabase
    .from('articles')
    .select('title, meta_title, body_markdown')
    .eq('slug', 'nejlepsi-olivovy-olej-2026')
    .single()

  if (fetchErr || !article) {
    console.error('Fetch error:', fetchErr?.message)
    process.exit(1)
  }

  let body = article.body_markdown as string

  // 1. Metodologické opravy — žádné fyzické testování
  body = body.replace(
    'V roce 2026 jsme provedli největší nezávislou analýzu olivových olejů v České republice.',
    'V roce 2026 jsme sestavili nejrozsáhlejší datový přehled olivových olejů dostupných v České republice.'
  )

  body = body.replace(
    'naměřené kyselosti (údaj z etiket nebo certifikátů)',
    'deklarované kyselosti (údaj z etiket nebo certifikátů)'
  )

  // 2. Sekce — žádné pevné číslo
  body = body.replace(
    '## Top 10 extra panenských olivových olejů 2026',
    '## Nejlepší oleje aktuálního katalogu'
  )

  body = body.replace(
    'Podle Olivator Score vítězí jednoodrůdové oleje z odrůdy Picual z jižního Španělska a prémiové kupáže s verifikovanými laboratorními testy. Zde je top desítka:',
    'Olivator Score aktuálně řadí na vrchol prémiové oleje s DOP certifikací a deklarovanou nízkou kyselostí. Výběr z aktivního katalogu:'
  )

  // 3. Token replacements #1-7 + smazání #8 (liophos)
  const OLD_TOKEN_BLOCK = `{{product:picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box}}
{{product:olivovy-olej-extra-panensky-callejas-coupage-5l}}
{{product:bio-extra-panensky-olivovy-olej-elixir-500-ml}}
{{product:picual-2-l-extra-panensky-olivovy-olej}}
{{product:extra-panensky-olivovy-olej-sitia-pdo-0-2-critida-4-l-design}}
{{product:picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej}}
{{product:arbequina-5-l-extra-panensky-olej-olivovy-olej-bag-in-box}}
{{product:intini-coratina-alberobello}}
{{product:picual-5-l-extra-panensky-olivovy-olej}}
{{product:liophos-bio-extra-panensky-olivovy-olej-5l-stamatakos}}`

  const NEW_TOKEN_BLOCK = `{{product:sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l}}
{{product:sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-3-l}}
{{product:evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml}}
{{product:sitia-premium-gold-sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l-plech}}
{{product:extra-panensky-olivovy-olej-sitia-pdo-0-2-critida-4-l-design}}
{{product:intini-extra-alberobello}}
{{product:styliana-amazona-bio-extra-panensky-olivovy-olej-arbequina-0-2-5-l-plech}}
{{product:intini-coratina-alberobello}}
{{product:corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-5-l}}`

  if (!body.includes(OLD_TOKEN_BLOCK)) {
    console.error('TOKEN BLOCK NOT FOUND — možná bílé znaky nebo jiné tokeny. Abort.')
    console.log('Searching for first token:', body.includes('{{product:picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box}}'))
    process.exit(1)
  }
  body = body.replace(OLD_TOKEN_BLOCK, NEW_TOKEN_BLOCK)

  // 4. Inline karanténní linky v "do 200 Kč" sekci
  body = body.replace(
    '[Picual 5 l Extra panenský nefiltrovaný (Bag-In-Box)](/olej/picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box) za 1499 Kč = 30 Kč/100 ml. Bag-in-box chrání olej před oxidací lépe než láhev, protože vak kolabuje a vzduch se nedostává dovnitř.',
    '[Sitia Kréta PREMIUM GOLD 5 l](/olej/sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l). Bag-in-box chrání olej před oxidací lépe než láhev, protože vak kolabuje a vzduch se nedostává dovnitř.'
  )

  body = body.replace(
    '**Tip:** [Picual 500 ml Extra panenský nefiltrovaný](/olej/picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej) za 199 Kč je perfektní starter pro poznávání intenzivních španělských olejů.',
    '**Tip:** Aktuální oleje do 200 Kč seřazené podle Olivator Score najdeš v [srovnávači](/srovnavac).'
  )

  // 5. Inline karanténní link v prémiové sekci
  body = body.replace(
    '**[Olivový olej Extra panenský Callejas coupage 5L](/olej/olivovy-olej-extra-panensky-callejas-coupage-5l)** — Prémiová volba ve velkém balení za 1499 Kč s kyselostí 0,2 % a DOP certifikací. Perfektní investice pro domácnosti, které vaří každý den s kvalitním olejem.',
    '**[Sitia Kréta PREMIUM GOLD 5 l](/olej/sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l)** — Prémiová volba ve velkém balení s kyselostí 0,2 % a DOP certifikací. Perfektní pro domácnosti, které vaří každý den s kvalitním olejem.'
  )

  // Sanity check — žádné karanténní tokeny nezůstaly
  const karantena = ['picual', 'callejas', 'elixir', 'arbequina-5-l-extra-panensky-olej', 'liophos']
  const remainingTokens = (body.match(/\{\{product:[^}]+\}\}/g) || []).filter(t =>
    karantena.some(k => t.includes(k))
  )
  if (remainingTokens.length > 0) {
    console.error('STÁLE KARANTÉNNÍ TOKENY:', remainingTokens)
    process.exit(1)
  }

  const newTitle = article.title.replace('testujeme top oleje', 'žebříček podle dat')
  const newMetaTitle = article.meta_title.replace('testujeme top oleje v ČR', 'žebříček podle dat v ČR')

  const { error } = await supabase
    .from('articles')
    .update({
      title: newTitle,
      meta_title: newMetaTitle,
      body_markdown: body,
    })
    .eq('slug', 'nejlepsi-olivovy-olej-2026')

  if (error) {
    console.error('UPDATE error:', error.message)
    process.exit(1)
  }

  console.log('OK — title:', newTitle)
  console.log('OK — meta_title:', newMetaTitle)
  console.log('OK — body patched')
  console.log('Tokens now:', (body.match(/\{\{product:[^}]+\}\}/g) || []).join('\n  '))
}

main()
