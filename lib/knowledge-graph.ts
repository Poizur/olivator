// Knowledge Graph reference URLs (Wikipedia, Wikidata) per entity slug.
// Google používá `sameAs` v JSON-LD k propojení s Knowledge Graph entities,
// což zlepšuje topical autority pro daný region/odrůdu.
//
// Když přidáváme novou entitu do druhé wave, doplníme i sem.

export const REGION_SAMEAS: Record<string, string[]> = {
  peloponnes: [
    'https://cs.wikipedia.org/wiki/Peloponés',
    'https://en.wikipedia.org/wiki/Peloponnese',
    'https://www.wikidata.org/wiki/Q170085',
  ],
  kreta: [
    'https://cs.wikipedia.org/wiki/Kréta',
    'https://en.wikipedia.org/wiki/Crete',
    'https://www.wikidata.org/wiki/Q43429',
  ],
  apulie: [
    'https://cs.wikipedia.org/wiki/Apulie',
    'https://en.wikipedia.org/wiki/Apulia',
    'https://www.wikidata.org/wiki/Q1447',
  ],
  korfu: [
    'https://cs.wikipedia.org/wiki/Korfu',
    'https://en.wikipedia.org/wiki/Corfu',
    'https://www.wikidata.org/wiki/Q121378',
  ],
  // Pre 2nd wave (Toskánsko, Andalusie, atd.) — TODO až budou produkty.
}

export const CULTIVAR_SAMEAS: Record<string, string[]> = {
  koroneiki: [
    'https://en.wikipedia.org/wiki/Koroneiki',
    'https://www.wikidata.org/wiki/Q3198523',
  ],
  kalamata: [
    'https://en.wikipedia.org/wiki/Kalamata_olive',
    'https://www.wikidata.org/wiki/Q1709253',
  ],
  coratina: [
    'https://it.wikipedia.org/wiki/Coratina',
  ],
  manaki: [
    // No wikipedia entry, skip
  ],
  'cima-di-mola': [
    // Niche cultivar, no canonical link yet
  ],
  frantoio: [
    'https://en.wikipedia.org/wiki/Frantoio',
    'https://it.wikipedia.org/wiki/Frantoio_(cultivar)',
  ],
  leccino: [
    'https://en.wikipedia.org/wiki/Leccino',
    'https://it.wikipedia.org/wiki/Leccino',
  ],
  olivastra: [
    // No clean wikipedia entry
  ],
}

// Brandy obecně nemají Wikipedia entries (jsou to malé manufaktury). Pokud
// objevíme známou značku s Wikipedia záznamem, doplníme tady. Default je
// jen websiteUrl z DB.
export const BRAND_SAMEAS: Record<string, string[]> = {}

export function getRegionSameAs(slug: string): string[] {
  return REGION_SAMEAS[slug] ?? []
}

export function getCultivarSameAs(slug: string): string[] {
  return CULTIVAR_SAMEAS[slug] ?? []
}

export function getBrandSameAs(slug: string): string[] {
  return BRAND_SAMEAS[slug] ?? []
}
