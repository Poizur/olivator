import { callClaude, extractText } from '@/lib/anthropic'
import { writeFileSync } from 'fs'

const HAIKU = 'claude-haiku-4-5-20251001'
const SYSTEM = `Jsi editor Olivator.cz. Piš přirozenou češtinou, aktivním hlasem. 
Tón: chytrý kamarád sommelier. Bez marketingové omáčky.
Článek má být použitelný jako hostující příspěvek na food/zdraví blog.
Vrátíš POUZE markdown text, bez komentářů.`

async function writeGuestPost(topic: string, filename: string, wordCount: string) {
  console.log(`Generuji: ${filename}...`)
  const res = await callClaude({
    model: HAIKU,
    max_tokens: 2500,
    system: SYSTEM,
    messages: [{ role: 'user', content: topic }],
  })
  const text = extractText(res).trim()
  writeFileSync(`docs/seo/${filename}`, text)
  console.log(`✅ ${filename} (${text.length} zn.)`)
  await new Promise(r => setTimeout(r, 3000))
}

async function main() {
  await writeGuestPost(
    `Napiš hostující příspěvek 600-700 slov na food blog o tématu:
    "5 věcí, které vám nikdo neřekl o olivovém oleji (a jak vybrat ten správný)"
    
    Struktura:
    # [nadpis]
    Úvod — proč je téma relevantní (2-3 věty)
    ## 1. Ne každý olivový olej je stejný (EVOO vs ostatní typy)
    ## 2. Kyselost a polyfenoly — čísla na etiketě, která fakt záleží  
    ## 3. Původ hraje roli (Řecko vs Itálie vs Španělsko — krátce)
    ## 4. Jak poznat falšovaný olej
    ## 5. Kde olivový olej uchovávat (a kde ne)
    Závěr — krátké shrnutí + přirozený odkaz na Olivator.cz jako zdroj pro srovnání
    
    Na konci přidej bio autora:
    ---
    *Autor: Martin Navrátil, zakladatel [Olivator.cz](https://olivator.cz) — prvního nezávislého srovnávače olivových olejů v ČR.*`,
    'guest-post-food-blog.md',
    '600-700 slov'
  )

  await writeGuestPost(
    `Napiš hostující příspěvek 600-700 slov na zdraví/výživa blog o tématu:
    "Polyfenoly v olivovém oleji: co říká věda a jak si vybrat olej s nejvyšším obsahem"
    
    Struktura:
    # [nadpis]
    Úvod — co jsou polyfenoly a proč jsou v oleji důležité (2-3 věty)
    ## Co jsou polyfenoly v olivovém oleji
    (hydroxytyrosol, oleuropein — zdroje: EFSA health claim 432/2012)
    ## Kolik polyfenolů potřebujete denně
    (EFSA: min 5 mg hydroxytyrosolů = 20 ml oleje s >250 mg/kg polyfenoly)
    ## Jak poznat high-polyphenol olej na etiketě
    (Early harvest, Koroneiki, Crete, Kalamata, obsah >300 mg/kg)
    ## Top tipy pro výběr
    (konkrétní rady — bez brandingu)
    Závěr — přirozený odkaz na Olivator.cz jako nástroj pro srovnání
    
    Na konci:
    ---
    *Autor: Martin Navrátil, zakladatel [Olivator.cz](https://olivator.cz)*`,
    'guest-post-health-blog.md',
    '600-700 slov'
  )
}

main().catch(console.error)
