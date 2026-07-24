/** Reckyeshop feed — kategorie a olivové položky mimo 'Kuchyňské oleje' */
import https from 'https'

const URL = 'https://www.reckyeshop.cz/heureka/export/products.xml'
function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = require('https').get(url, { headers: { 'User-Agent': 'OlivatorBot/1.0' } }, (res: any) => {
      let d = ''; res.on('data', (c: any) => { d += c }); res.on('end', () => resolve(d))
    }); req.on('error', reject); req.setTimeout(25000, () => { req.destroy(); reject(new Error('t')) })
  })
}

async function main() {
  const xml = await fetch(URL)

  // Unikátní kategorie (top level)
  const cats = new Map<string, number>()
  for (const m of xml.matchAll(/<CATEGORYTEXT><!\[CDATA\[(.*?)\]\]>|<CATEGORYTEXT>(.*?)<\/CATEGORYTEXT>/gi)) {
    const cat = (m[1] ?? m[2] ?? '').trim()
    cats.set(cat, (cats.get(cat) ?? 0) + 1)
  }
  const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1])
  console.log(`Unikátní kategorie (${sorted.length} celkem):`)
  for (const [cat, cnt] of sorted.slice(0, 20)) {
    console.log(`  ${String(cnt).padStart(4)}×  ${cat}`)
  }

  // Položky kde PRODUCTNAME obsahuje "olivov" ale kategorie != Kuchyňské oleje
  const items = [...xml.matchAll(/<SHOPITEM>([\s\S]*?)<\/SHOPITEM>/gi)]
  const olivyMimo: string[] = []
  for (const item of items) {
    const inner = item[1]
    const name = inner.match(/<PRODUCTNAME><!\[CDATA\[(.*?)\]\]>|<PRODUCTNAME>(.*?)<\/PRODUCTNAME>/)?.[1] ?? ''
    const cat = inner.match(/<CATEGORYTEXT><!\[CDATA\[(.*?)\]\]>|<CATEGORYTEXT>(.*?)<\/CATEGORYTEXT>/)?.[1] ?? ''
    if (/olivov|olive|olej/i.test(name) && !cat.includes('Kuchyňské oleje')) {
      olivyMimo.push(`${name.slice(0, 60)} | ${cat.slice(0, 60)}`)
    }
  }
  console.log(`\nOlivové položky MIMO 'Kuchyňské oleje' (${olivyMimo.length}):`)
  for (const x of olivyMimo.slice(0, 20)) console.log(`  ${x}`)
}
main().catch(console.error)
