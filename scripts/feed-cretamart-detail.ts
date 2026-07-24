/**
 * Detailní analýza Cretamart feedu — parser-compatible field check
 */
import https from 'https'

const URL = 'https://cretamart.com/data-xml/modul-heureka/heureka-read.php?shop=1&type=productscz&token=5f760d1dc9'

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res) => {
      let data = ''; res.on('data', (c) => { data += c }); res.on('end', () => resolve(data))
    })
    req.on('error', reject); req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function count(text: string, pattern: RegExp) { return (text.match(pattern) ?? []).length }

async function main() {
  const xml = await fetchUrl(URL)

  const priceVat    = count(xml, /<PRICE_VAT>/gi)
  const categoryText = count(xml, /<CATEGORYTEXT>/gi)
  const eanTags     = count(xml, /<EAN>/gi)

  console.log('Cretamart feed — správné tagy pro parser:')
  console.log(`  <PRICE_VAT>:   ${priceVat}`)
  console.log(`  <CATEGORYTEXT>: ${categoryText}`)
  console.log(`  <EAN>:         ${eanTags}`)
  console.log()

  // Unikátní kategorie
  const cats = [...new Set([...xml.matchAll(/<CATEGORYTEXT><!\[CDATA\[(.*?)\]\]>|<CATEGORYTEXT>(.*?)<\/CATEGORYTEXT>/gi)].map(m => (m[1] ?? m[2] ?? '').trim()))]
  console.log('Kategorie v feedu:')
  cats.forEach(c => console.log(`  "${c}"`))
  console.log()

  // Položky s "Kuchyňské oleje" kategori
  const oilItems = [...xml.matchAll(/<SHOPITEM>([\s\S]*?)<\/SHOPITEM>/gi)]
    .filter(m => m[1].includes('Kuchyňské oleje'))
  console.log(`Položky v kategorii "Kuchyňské oleje": ${oilItems.length}`)
  for (const item of oilItems.slice(0, 10)) {
    const name = item[1].match(/<PRODUCTNAME><!\[CDATA\[(.*?)\]\]>|<PRODUCTNAME>(.*?)<\/PRODUCTNAME>/)?.[1] ?? '?'
    const price = item[1].match(/<PRICE_VAT>(.*?)<\/PRICE_VAT>/)?.[1] ?? '?'
    const ean = item[1].match(/<EAN>(.*?)<\/EAN>/)?.[1] ?? '?'
    const avail = item[1].match(/<ITEM_TYPE>(.*?)<\/ITEM_TYPE>|<AVAILABILITY>(.*?)<\/AVAILABILITY>/)?.[1] ?? '?'
    console.log(`  ${name} | cena: ${price} | EAN: ${ean}`)
  }

  // Zkontroluj první 3 plné SHOPITEM elementy
  console.log('\n\nPrvní 3 položky — raw tagy:')
  for (const item of oilItems.slice(0, 3)) {
    const condensed = item[1].replace(/\s+/g, ' ').replace(/<DESCRIPTION>[\s\S]*?<\/DESCRIPTION>/i, '<DESCRIPTION>...</DESCRIPTION>').slice(0, 600)
    console.log(`\n${condensed}`)
  }
}
main().catch(console.error)
