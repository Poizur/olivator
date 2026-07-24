import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const newBioFull = `Datový průvodce Olivátoru. Číslům věří víc než marketingovým sloganům.

Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Ostatní mu nevadí.

Olivator Score vznikl z prosté frustrace: nikdo v ČR nesrovnával oleje podle dat. Jen podle dojmů, obalů a toho, jestli na etiketě bylo napsáno „Toskánsko". Olík to změnil — vzal certifikáty výrobců, kyselost z protokolů, polyfenoly tam kde byly dostupné, a postavil skóre, které lze přepočítat.

Žádný výrobce mu neplatí. Naopak: čím dráž olej stojí, tím víc ho štve, když data neodpovídají ceně.`

const newSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Olík',
  jobTitle: 'datový průvodce Olivátoru',
  url: 'https://olivator.cz/autor/olik',
  image: 'https://olivator.cz/olik.png',
  worksFor: { '@type': 'Organization', name: 'Olivátor', url: 'https://olivator.cz' },
  knowsAbout: ['olivový olej', 'Olivator Score', 'DOP certifikace', 'polyfenoly', 'Mediterranean diet'],
  knowsLanguage: ['cs', 'en'],
}

async function main() {
  const { data, error } = await supabase
    .from('authors')
    .update({ bio_full: newBioFull, schema_metadata: newSchema })
    .eq('slug', 'olik')
    .select('slug')

  if (error) { console.error('Error:', error.message); process.exit(1) }
  console.log('PATCH OK:', JSON.stringify(data))
}

main()
