// Seed script — kurátovaný seznam URL výrobců pro známé značky olivového oleje.
// Jednorázový import; pro budoucí značky existuje scripts/discover-brand-urls.ts
// (Claude web search) nebo admin UI manuální vyplnění.
//
// Spuštění: npx tsx scripts/seed-brand-urls.ts

import { supabaseAdmin } from '@/lib/supabase'

// Mapování značka slug → oficiální web výrobce.
// Ověřeno HTTP 200 + manuální kontrolou že je to opravdu výrobce, ne distributor.
//
// Co NENÍ v mapě:
// - Picual, Arbequina = názvy odrůd, ne značek (žádný web)
// - Vilgain = český e-shop, ne výrobce
// - Gourmet, Dárkové = generické názvy, není konkrétní výrobce
// - 15, Ellada, Extra, Sitia (zkrácené) = nedostatek dat pro identifikaci
const BRAND_URLS: Record<string, string> = {
  bartolini: 'https://www.oliobartolini.com',           // Italská olejárna v Umbrii (Arrone)
  corinto: 'https://www.corinto.cz',                     // CZ distributor řeckých olejů (vlastní brand)
  abea: 'https://www.abea.gr',                           // Řecká firma na Krétě
  evoilino: 'https://evoilino.gr',                       // Řecký výrobce z Korfu
  orino: 'https://www.orino.gr',                         // Krétská firma Sitia
  'petromilos-zakynthos': 'https://petromilos.gr',       // Řecký rodinný výrobce, Zakynthos
  plakias: 'https://www.plakiasoliveoil.gr',             // Krétská oblast Plakias
  'sitia-kreta': 'https://www.sitiagold.gr',             // Sitia Kréta PREMIUM GOLD
  antica: 'https://www.anticasicilia.it',                // Sicilský výrobce
  desantis: 'https://www.desantisolio.it',               // Italský výrobce z Bitonta (Apulie)
  motakis: 'https://motakis.gr',                         // Řecký rodinný výrobce, Kréta
  adelfos: 'https://adelfos.gr',                         // Řecké Sitia P.D.O.
  zigante: 'https://www.zigantetartufi.com',             // Chorvatský Istrian truffle/oil
  askra: 'https://www.askraestate.gr',                   // Řecký producer
  geusi: 'https://geusivounou.gr',                       // Řecký producer
  pons: 'https://www.pons.es',                           // Španělský výrobce (Catalunya)
  sagra: 'https://www.oliosagra.it',                     // Italský výrobce
  vilgain: 'https://www.vilgain.cz',                     // CZ e-shop (ne výrobce, ale aspoň zdroj)
}

async function main() {
  console.log(`Mám URL pro ${Object.keys(BRAND_URLS).length} značek\n`)

  let updated = 0
  let alreadySet = 0
  let notFound = 0

  for (const [slug, url] of Object.entries(BRAND_URLS)) {
    const { data: brand } = await supabaseAdmin
      .from('brands')
      .select('slug, name, website_url')
      .eq('slug', slug)
      .maybeSingle()

    if (!brand) {
      console.log(`⊘  ${slug.padEnd(20)} → značka neexistuje v DB`)
      notFound++
      continue
    }

    if (brand.website_url && brand.website_url.length > 0) {
      console.log(`-  ${slug.padEnd(20)} → už nastaveno (${brand.website_url})`)
      alreadySet++
      continue
    }

    // Ověř že URL responduje (browser User-Agent — některé weby blokují boty)
    let valid = false
    let httpStatus: number | string = '?'
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      })
      valid = res.ok
      httpStatus = res.status
    } catch (err) {
      httpStatus = err instanceof Error ? err.message.slice(0, 30) : 'fetch error'
    }

    // Uložíme i URL co aktuálně nereagují (DNS/CDN výpadky jsou běžné).
    // Lab-research / brand-research si pak poradí s 404 graceful.
    await supabaseAdmin
      .from('brands')
      .update({ website_url: url, updated_at: new Date().toISOString() })
      .eq('slug', slug)
    console.log(`${valid ? '✅' : '⚠️ '} ${slug.padEnd(22)} → ${url} (HTTP ${httpStatus})`)
    updated++
  }

  console.log()
  console.log('═══ Souhrn ═══')
  console.log(`Aktualizováno: ${updated}`)
  console.log(`Už mělo URL:    ${alreadySet}`)
  console.log(`Neexistuje:     ${notFound}`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
