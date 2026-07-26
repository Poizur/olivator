import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'

const HAIKU = 'claude-haiku-4-5-20251001'

const SYSTEM = `Jsi hlavní editor Olivator.cz — srovnávač olivových olejů v ČR.
Piš přirozenou češtinou, aktivním hlasem, přítomným časem.
Tón: chytrý kamarád sommelier (Wirecutter + Wine Folly styl).
ZAKÁZÁNO: "prémiový zážitek", "výjimečná chuť", "KLIKNI ZDE!", pasivní hlas, placeholder text.
Vracíš POUZE Markdown obsah — bez YAML frontmatteru, bez komentářů.`

const PROMPT = `Napiš komplexní srovnávací článek pro Olivator.cz:

TITLE: Řecký, italský nebo španělský olivový olej? Srovnání 2026

STRUKTURA (dodržuj přesně):
## Tři největší producenti — jejich silné stránky

(2 odstavce, max 120 slov celkem — základní kontext: Španělsko = největší producent objemem, Itálie = nejvíce chráněných označení DOP/DOP, Řecko = nejvyšší podíl extra panenského oleje ~80 %)

## Španělský olivový olej: dostupnost a síla

(120–150 slov: hlavní odrůdy Picual a Arbequina, chuťový profil, typická kyselost 0,3–0,5 %, cena, pro koho vhodný)

## Italský olivový olej: rozmanitost a prestiž

(120–150 slov: 43 DOP chráněných označení, region Toscana vs Puglia vs Sicília, typická kyselost, cena, pro koho vhodný)

## Řecký olivový olej: kvalita tiše dominuje

(120–150 slov: Kalamata, Manaki, Koroneiki odrůdy, 80 % produkce je EVOO, high-polyphenol Crete oleje, typická kyselost, cena)

## Který vybrat? Přímé srovnání

(Krátká tabulka v markdownu s řádky: Producent | Typická odrůda | Kyselost | Chuť | Nejlepší použití | Průměrná cena/100ml)

Pak 2–3 odstavce s konkrétními doporučeními:
- Na každodenní vaření → španělský (ekonomické)  
- Pro dressingy a degustaci → řecký high-polyphenol
- Na dárek nebo sběratelský kousek → italský DOP

## FAQ

Napiš 4 FAQ otázky a odpovědi ve formátu:
**Otázka?**
Odpověď (max 2 věty).

Otázky: "Jaký olivový olej je nejzdravější?", "Proč je italský olivový olej dražší?", "Je řecký olivový olej opravdu lepší?", "Jak poznat původ olivového oleje?"

CELKOVÁ DÉLKA: 650–800 slov.
Nezapomeň: žádný marketing, jen fakta a konkrétní rady.`

async function main() {
  console.log('Generuji článek s Claude Haiku...')
  
  const response = await callClaude({
    model: HAIKU,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: PROMPT }]
  })
  
  const body = extractText(response).trim()
  console.log(`Body: ${body.length} znaků`)
  console.log('--- PREVIEW (200 zn.) ---')
  console.log(body.slice(0, 200))
  console.log('---')

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('articles')
    .insert({
      slug: 'recky-italsky-spanelsky-olej',
      title: 'Řecký, italský nebo španělský olivový olej? Srovnání 2026',
      excerpt: 'Španělsko, Itálie, Řecko — tři největší producenti, tři odlišné charaktery. Porovnáváme chuť, kyselost, certifikace a ceny, abyste věděli, který olej si vybrat.',
      emoji: '🌍',
      read_time: '6 min čtení',
      hero_image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      category: 'srovnani',
      body_markdown: body,
      meta_title: 'Řecký vs italský vs španělský olivový olej 2026 | Olivator',
      meta_description: 'Řecký, italský nebo španělský olej? Srovnáváme chuť, kyselost a DOP certifikace. Poradíme, který vybrat na vaření, dresinky nebo dárek.',
      status: 'active',
      source: 'ai_generated',
      ai_generated_at: now,
      published_at: now,
    })

  if (error) {
    console.error('DB INSERT chyba:', error.message)
    process.exit(1)
  }
  
  console.log('✅ Článek vložen do DB: recky-italsky-spanelsky-olej')

  // Mark task done
  const { error: taskErr } = await supabaseAdmin
    .from('seo_tasks')
    .update({ status: 'done' })
    .eq('task_key', 'article_italsky_spanelsky_recky')
  
  if (taskErr) console.error('Task update error:', taskErr.message)
  else console.log('✅ article_italsky_spanelsky_recky → done')
}

main().catch((e) => { console.error(e); process.exit(1) })
