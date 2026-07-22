import type { CheerioAPI } from 'cheerio'

export type FindingType =
  | 'broken_image'
  | 'zero_price'
  | 'duplicate_name'
  | 'empty_section'
  | 'repeated_product'
  | 'missing_logo'
  | 'http_404'

export type Severity = 'high' | 'medium' | 'low'

export interface Finding {
  findingType: FindingType
  severity: Severity
  url: string
  element?: string
  detail: string
  evidence?: string
}

export interface ScanRule {
  name: string
  run(url: string, html: string, $: CheerioAPI): Promise<Finding[]>
}

export type { CheerioAPI }
