// N-01: Nahraď phantom sekci reálnými {{product:}} tokeny
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

const PHANTOM_SECTION = `## Tři prémiové volby z Olivator katalogu

*(Poznámka: konkrétní odkazy/scores vložit z reálné DB — níže ilustrativní příklady)*

### 1. **Sitia Kréta 0.3 Extra Virgin** (Score 84)
- Cena: ~580 Kč/L
- Cultivar: Koroneiki, early harvest říjen
- Kyselost: 0,28 %, polyfenoly 520 mg/kg
- DOP Sitia (východní Kréta), BIO

Skvělý entry-level premium. Koroneiki je mainstream kultivar, ale tady sklizen brzy = vyšší polyfenoly než běžné verze. Vyvážená chuť (fruity + mírně hořký), versatilní. Dostupný na Rohlík, Košík.

**Pro koho**: denní olej pro lidi, kteří chtějí víc než mid-range, ale nechtějí riskovat extrémní hořkost.

### 2. **Coratina Puglia DOP Single Estate** (Score 87)
- Cena: ~720 Kč/L
- Cultivar: Coratina (south Italy)
- Kyselost: 0,18 %, polyfenoly 680 mg/kg
- DOP Terre di Bari

Coratina = robustní, travnatý, hodně pálivý. Vysoké polyfenoly přirozeně (nemusíš lovit early harvest). Single estate = full traceability. Tmavá láhev, výborná skladovatelnost.

**Pro koho**: milovníci intenzivních chutí, na středomořské saláty nebo finishing. Zkušenější konzumenti.

### 3. **Manaki Messinia Premium** (Score 89)
- Cena: ~850 Kč/L
- Cultivar: Manaki (Peloponéz)
- Kyselost: 0,12 %, polyfenoly 740 mg/kg
- BIO, family farm Kalamata region

Rare kultivar (nízká produkce), komplexní profil (zelené jablko + artyčok + pepř). Extrémně nízká kyselost = špičková péče. Láhev vydrží 18+ měsíců bez výrazného poklesu kvality.

**Pro koho**: special occasions, dárky, experimenty s high-end kuchyní. Dražší než entry premium, ale chuť obhajitelná.`

const REAL_SECTION = `## Tři prémiové volby z Olivator katalogu

Tři různé přístupy k prémiové kvalitě — podle priorit kupujícího:

### 1. Vstupní premium — řecký DOP ze Sítie

Koroneiki z certifikované PDO oblasti východní Kréty. Ideální přechod z mid-range do prémiového segmentu — vyvážený profil vhodný pro každodenní použití i finishování.

{{product:sitia-premium-gold-sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l-plech}}

### 2. Italský charakter — Coratina z Apulie

Coratina přináší travnatý, intenzivně pálivý charakter přirozeně bez nutnosti early harvest — ideální volba pro středomořskou kuchyni a milovníky výrazných chutí. Oceněno Flos Olei.

{{product:intini-coratina-alberobello}}

### 3. Maximum polyfenolů — pro zdravotní prioritu

Extrémně vzácná sklizeň z řeckého Korfu, BIO certifikace. Nejbogatší na polyfenoly z celého Olivator katalogu. Malé balení je záměrné — olej je určen primárně ke každodenní zdravotní konzumaci, ne do salátu za 200 Kč.

{{product:evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen}}`

async function main() {
  const { data } = await supabase.from('articles').select('id, body_markdown').eq('slug', 'premium-olivovy-olej-ma-smysl').single()
  if (!data) throw new Error('Article not found')
  
  if (!data.body_markdown.includes('Poznámka: konkrétní odkazy')) {
    console.log('Phantom section not found — already fixed?')
    return
  }
  
  const newBody = data.body_markdown.replace(PHANTOM_SECTION, REAL_SECTION)
  
  if (newBody === data.body_markdown) {
    console.log('ERROR: Replace had no effect — text mismatch')
    // Debug
    const idx = data.body_markdown.indexOf('Tři prémiové volby')
    console.log('Section context around "Tři prémiové volby":')
    console.log(data.body_markdown.slice(Math.max(0, idx-10), idx+100))
    return
  }
  
  const { error } = await supabase.from('articles')
    .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
    .eq('id', data.id)
  
  if (error) throw error
  
  console.log('✓ N-01 OPRAVENO: phantom sekce nahrazena reálnými {{product:}} tokeny')
  console.log('  Vloženy:')
  console.log('  - sitia-premium-gold-...1-l-plech (Score 85, 646 mg/kg, DOP Kréta)')
  console.log('  - intini-coratina-alberobello (Score 83, 623 mg/kg, IT Flos Olei)')
  console.log('  - evolia-platinum-2777-...250-ml-extremne-vzacna-sklizen (Score 85, 2777 mg/kg, BIO)')
}
main().catch(e => { console.error(e); process.exit(1) })
