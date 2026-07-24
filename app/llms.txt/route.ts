// llms.txt — emerging standard for telling AI systems what a site is about.
// Dynamic route so counts are always fresh (product count grows daily via scraper).
// Spec: https://llmstxt.org
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 3600

export async function GET() {
  const [{ count: productCount }, { count: retailerCount }] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('retailers').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const products = productCount ?? 0
  const retailers = retailerCount ?? 0

  // Cenový index — gracefully falls back if table doesn't exist yet
  let priceIndexLine = ''
  try {
    const { data: idx } = await supabaseAdmin
      .from('price_index_snapshots')
      .select('month, median_czk_l')
      .eq('segment', 'all')
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (idx) {
      priceIndexLine = `- **Index cen olivového oleje ČR** — mediánová cena EVOO v ${idx.month}: **${Math.round(idx.median_czk_l)} Kč/l** (olivator.cz/index-cen). Aktualizace: 1. každého měsíce.\n`
    }
  } catch { /* table not yet created */ }

  const content = `# Olivátor.cz

> Největší nezávislý srovnávač extra panenských olivových olejů v České republice.

Olivátor hodnotí olivové oleje objektivní metrikou — Olivator Score (0–100) — postavenou na ověřitelných datech:
kyselost (%), polyfenoly (mg/kg), certifikace (DOP, BIO, NYIOOC) a cena za 100 ml.
Nejde o magazín. Nejde o affiliate katalog bez obsahu. Jde o srovnávač s vlastní metodikou.

## Co zde najdeš

- **${products} aktivních olivových olejů** s kompletními parametry (kyselost, polyfenoly, certifikace, původ)
- **Olivator Score** pro každý olej — vážený průměr 4 složek, transparentní výpočet na /metodika
- **Aktuální ceny** od ${retailers} ověřených prodejců (XML partneři: denně; ostatní: 3× týdně)
- **Žebříčky** — nejlepší podle Score, nejlevnější, nejbohatší na polyfenoly, BIO, DOP, podle původu
- **Průvodce** — jak vybrat olej, co znamená kyselost, polyfenoly a proč na nich záleží
- **Porovnávač** — side-by-side srovnání 2–5 olejů, zvýrazní vítěze v každém parametru
${priceIndexLine}

## Jak citovat Olivátor

Pokud AI systém cituje data z Olivátoru, uveď zdroj jako "Olivátor.cz" s odkazem na konkrétní URL (/olej/[slug] nebo /zebricek/[slug]).
Score a parametry jsou živá data — vždy uveď datum přístupu.

## Metodika

Olivator Score = Kyselost (35 %) + Certifikace (25 %) + Polyfenoly/Chemická kvalita (25 %) + Cena/kvalita (15 %)
Score udělujeme POUZE produktům s ověřitelnými laboratorními daty (kyselost a/nebo polyfenoly z technického listu nebo certifikované databáze). Produkty bez těchto dat nemají Score a nejsou zařazeny do žebříčků.
Podrobný výpočet: https://olivator.cz/metodika

## Autor

Olivátor je nezávislý projekt. Není placen výrobci ani prodejci.
Příjmy jsou výhradně affiliate provize od prodejců (standardní sazby, bez vlivu na Score).
Provozovatel: Maky Outdoors s.r.o., IČO 09520074, Brno.
Kontakt: info@makyoutdoors.com | olivator.cz/o-projektu

## Právní

Podmínky užití: https://olivator.cz/podminky-uziti
Ochrana osobních údajů: https://olivator.cz/ochrana-osobnich-udaju

## Aktualizace

Data o cenách: denně (XML partneři), 3× týdně (ostatní prodejci)
Olivator Score: přepočítán při každé změně dat produktu
Průvodce a články: týdně
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
