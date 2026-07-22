import type { Element } from 'domhandler'
import type { ScanRule, Finding } from '../types'

const BROKEN_PATTERNS = [/^$/, /^#$/, /undefined/, /null/, /^data:,$/]

export const brokenImagesRule: ScanRule = {
  name: 'broken_image',
  async run(url, _html, $) {
    const findings: Finding[] = []
    const seen = new Set<string>()

    $('img').each((_: number, el: Element) => {
      const src = $(el).attr('src') ?? ''
      const dataSrc = $(el).attr('data-src') ?? ''
      const alt = $(el).attr('alt') ?? ''

      // Skip SVG inline, icons (width ≤ 24), and tracking pixels
      const width = parseInt($(el).attr('width') ?? '999', 10)
      const height = parseInt($(el).attr('height') ?? '999', 10)
      if (width <= 24 || height <= 24) return
      if (src.startsWith('data:image/svg')) return

      // Broken: empty src while data-src is also empty (lazy not configured)
      const isBroken = BROKEN_PATTERNS.some((p) => p.test(src)) && !dataSrc
      if (!isBroken) return

      // Deduplicate by alt + parent selector
      const key = `${alt}|${src}`
      if (seen.has(key)) return
      seen.add(key)

      const parentClass = $(el).parent().attr('class')?.slice(0, 60) ?? ''
      findings.push({
        findingType: 'broken_image',
        severity: 'high',
        url,
        element: `img[alt="${alt}"]`,
        detail: `Obrázek má prázdný src${dataSrc ? ' (data-src přítomen, ale src prázdný)' : ''}`,
        evidence: `src="${src}" | parent: .${parentClass}`,
      })
    })

    return findings
  },
}
