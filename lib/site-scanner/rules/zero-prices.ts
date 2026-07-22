import type { Element } from 'domhandler'
import type { ScanRule, Finding } from '../types'

// Matches: "0 Kč", "0,00 Kč", "0.00 Kč", "0 €" — but NOT "100 Kč" etc.
const ZERO_PRICE_RE = /\b0[,.]?0{0,2}\s*(Kč|CZK|€|EUR)\b/

export const zeroPricesRule: ScanRule = {
  name: 'zero_price',
  async run(url, _html, $) {
    const findings: Finding[] = []
    const seen = new Set<string>()

    // Look for price-like elements: tabular-nums class (our pattern), or elements
    // near "Kč" / "CZK" text
    $('[class*="tabular-nums"], [class*="price"], [class*="Price"]').each((_: number, el: Element) => {
      const text = $(el).text().trim()
      if (!ZERO_PRICE_RE.test(text)) return

      const key = `${$(el).attr('class')}|${text}`
      if (seen.has(key)) return
      seen.add(key)

      // Find nearest product context (parent with product name)
      const productName = $(el)
        .closest('[class*="card"], [class*="product"], article, li, div')
        .find('[class*="font-medium"], [class*="font-semibold"], h2, h3')
        .first()
        .text()
        .trim()
        .slice(0, 80)

      findings.push({
        findingType: 'zero_price',
        severity: 'high',
        url,
        element: `${el.tagName}.${($(el).attr('class') ?? '').split(' ')[0]}`,
        detail: `Cena zobrazuje nulu${productName ? ` u produktu "${productName}"` : ''}`,
        evidence: `Zobrazená hodnota: "${text}"`,
      })
    })

    return findings
  },
}
