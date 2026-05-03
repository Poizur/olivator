// Heureka XML feed parser — formát Heureka.cz pro produktové feedy.
// Volitelný zdroj: pokud retailer má xml_feed_url + xml_feed_format='heureka',
// místo Playwright scrapingu produktů URL po URL natáhneme všechno z XML.
//
// Použití: viz lib/feed-sync.ts.

import { load } from 'cheerio'

export interface HeurekaItem {
  itemId: string
  productName: string
  description: string  // HTML
  url: string
  imgUrl: string
  imgUrlAlternative: string[]
  priceVat: number    // s DPH, CZK
  manufacturer: string
  categoryText: string
  ean: string
  deliveryDate: string  // "0" = skladem
  params: Record<string, string>  // PARAM_NAME → VAL
}

const OIL_CATEGORY_HINT = 'Kuchyňské oleje'

export async function fetchHeurekaFeed(url: string): Promise<HeurekaItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)' },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Feed fetch HTTP ${res.status}: ${url}`)
  }
  const xml = await res.text()
  return parseHeurekaXml(xml)
}

export function parseHeurekaXml(xml: string): HeurekaItem[] {
  const $ = load(xml, { xmlMode: true })
  const items: HeurekaItem[] = []

  $('SHOPITEM').each((_, el) => {
    const $el = $(el)

    const params: Record<string, string> = {}
    $el.find('PARAM').each((_, pEl) => {
      const $p = $(pEl)
      const name = $p.find('PARAM_NAME').text().trim()
      const val = $p.find('VAL').text().trim()
      if (name && val) params[name] = val
    })

    const altUrls: string[] = []
    $el.find('IMGURL_ALTERNATIVE').each((_, urlEl) => {
      const u = $(urlEl).text().trim()
      if (u) altUrls.push(u)
    })

    const priceText = $el.find('PRICE_VAT').first().text().trim()
    const priceVat = parsePrice(priceText)

    items.push({
      itemId: $el.find('ITEM_ID').first().text().trim(),
      productName: $el.find('PRODUCTNAME').first().text().trim() || $el.find('PRODUCT').first().text().trim(),
      description: $el.find('DESCRIPTION').first().text().trim(),
      url: $el.find('URL').first().text().trim(),
      imgUrl: $el.find('IMGURL').first().text().trim(),
      imgUrlAlternative: altUrls,
      priceVat,
      manufacturer: $el.find('MANUFACTURER').first().text().trim(),
      categoryText: $el.find('CATEGORYTEXT').first().text().trim(),
      ean: $el.find('EAN').first().text().trim(),
      deliveryDate: $el.find('DELIVERY_DATE').first().text().trim(),
      params,
    })
  })

  return items
}

function parsePrice(text: string): number {
  if (!text) return 0
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Filtr na olivové oleje. Heureka kategorizace + textová heuristika v názvu —
// chceme přeskočit kokosové, slunečnicové, pomace.
export function isOliveOil(item: HeurekaItem): boolean {
  if (!item.categoryText.includes(OIL_CATEGORY_HINT)) return false
  const name = item.productName.toLowerCase()
  // Vyloučit ne-olivové
  if (name.includes('kokos')) return false
  if (name.includes('slunečnic')) return false
  if (name.includes('řepkov')) return false
  if (name.includes('lněn')) return false
  // Pozitivní signál
  return name.includes('oliv')
}

// EAN validation — některé eshopy generují fake EAN (7777770000037).
// Validní EAN-13 začíná country prefixem. Pro nás platí: kontrola checksum.
// V XML feedu z reckonasbavi je první SHOPITEM 7777770000037 — fake.
// Bypassujeme — přijímáme všechno, jen označíme suspect_ean.
export function isSuspectEan(ean: string): boolean {
  if (!ean) return true
  if (ean.length !== 13) return true
  // Padding fake EAN: 7777770000xxx
  if (/^7{6,}/.test(ean)) return true
  if (/^0{8,}/.test(ean)) return true
  return false
}

// Extract volume (ml) — z PARAM "Velikost balení" nebo z názvu produktu.
export function extractVolumeMl(item: HeurekaItem): number | null {
  const param = item.params['Velikost balení'] || item.params['Obsah balení'] || ''
  const fromParam = parseVolumeText(param)
  if (fromParam) return fromParam
  return parseVolumeText(item.productName)
}

function parseVolumeText(text: string): number | null {
  if (!text) return null
  const lower = text.toLowerCase()
  // 500 ml | 250 ml
  const mlMatch = lower.match(/(\d+(?:[,.]\d+)?)\s*ml\b/)
  if (mlMatch) {
    const n = parseFloat(mlMatch[1].replace(',', '.'))
    return Math.round(n)
  }
  // 1 l | 0,5 l | 5 l — \b tady chrání proti "lahev", "litr"
  const lMatch = lower.match(/(\d+(?:[,.]\d+)?)\s*l\b/)
  if (lMatch) {
    const litres = parseFloat(lMatch[1].replace(',', '.'))
    return Math.round(litres * 1000)
  }
  return null
}

// Acidita z PARAM "Acidita". Hodnoty bývají "0,32-0,8%" (dvojitá norma).
// Vezmeme nižší (lepší — naměřená kyselost po stočení).
export function extractAcidity(item: HeurekaItem): number | null {
  const raw = item.params['Acidita'] || item.params['Kyselost'] || ''
  if (!raw) return null
  const match = raw.match(/(\d+(?:[,.]\d+)?)/)
  if (!match) return null
  const n = parseFloat(match[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 5 ? n : null
}

export function extractPeroxideValue(item: HeurekaItem): number | null {
  const raw = item.params['peroxidové číslo'] || item.params['Peroxidové číslo'] || ''
  if (!raw) return null
  const match = raw.match(/(\d+(?:[,.]\d+)?)/)
  if (!match) return null
  const n = parseFloat(match[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 50 ? n : null
}

export function detectPackaging(item: HeurekaItem): string | null {
  const raw = (item.productName + ' ' + (item.params['Druh obalu'] ?? '')).toLowerCase()
  if (raw.includes('plech')) return 'tin'
  if (raw.includes('sklo') || raw.includes('skleněn')) return 'glass'
  if (raw.includes('pet') || raw.includes('plast')) return 'plastic'
  return null
}

// Detekce typu oleje. Většina reckonasbavi je extra panenský — default 'evoo'.
// Refinovaný / pomace má v názvu typicky odlišný pattern.
export function detectType(item: HeurekaItem): 'evoo' | 'virgin' | 'refined' | 'olive_oil' | 'pomace' {
  const name = item.productName.toLowerCase()
  if (name.includes('extra panensk')) return 'evoo'
  if (name.includes('panensk')) return 'virgin'
  if (name.includes('rafinov')) return 'refined'
  if (name.includes('pomace') || name.includes('výlisk')) return 'pomace'
  return 'evoo'  // konzervativní default pro specialty eshop
}
