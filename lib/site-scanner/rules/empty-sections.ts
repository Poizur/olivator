import type { Element } from 'cheerio'
import type { ScanRule, Finding } from '../types'

// Min visible text length that means "section has content"
const MIN_CONTENT_CHARS = 60

// Headings that signal a meaningful section (not nav/footer labels)
const CONTENT_HEADINGS = ['h2', 'h3']

export const emptySectionsRule: ScanRule = {
  name: 'empty_section',
  async run(url, _html, $) {
    const findings: Finding[] = []

    $('section, [class*="section"]').each((_: number, el: Element) => {
      const $el = $(el)

      // Must have a heading to be considered a "section with intent"
      const heading = $el.find(CONTENT_HEADINGS.join(',')).first()
      if (!heading.length) return

      const headingText = heading.text().trim()
      if (!headingText) return

      // Skip header/footer/nav sections
      const elClass = $el.attr('class') ?? ''
      if (/nav|header|footer|menu|breadcrumb/i.test(elClass)) return

      // Count meaningful text outside the heading itself
      const clone = $el.clone()
      clone.find(CONTENT_HEADINGS.join(',')).remove()
      const bodyText = clone.text().replace(/\s+/g, ' ').trim()

      if (bodyText.length < MIN_CONTENT_CHARS) {
        findings.push({
          findingType: 'empty_section',
          severity: 'medium',
          url,
          element: `section[class="${elClass.slice(0, 60)}"]`,
          detail: `Sekce "${headingText.slice(0, 60)}" neobsahuje viditelný obsah`,
          evidence: `Text těla: "${bodyText.slice(0, 80)}" (${bodyText.length} znaků)`,
        })
      }
    })

    return findings
  },
}
