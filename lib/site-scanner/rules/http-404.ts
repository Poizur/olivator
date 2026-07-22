import type { ScanRule, Finding } from '../types'

// This rule is called directly from the orchestrator (not from per-page rule loop)
// because it needs to check the page status code, not parse HTML.
// The orchestrator passes statusCode via a special mechanism.
// Here we export a helper used by the index.ts instead of ScanRule interface.

export function make404Finding(url: string): Finding {
  const path = (() => {
    try { return new URL(url).pathname } catch { return url }
  })()
  return {
    findingType: 'http_404',
    severity: 'high',
    url,
    element: 'page',
    detail: `Stránka vrátila HTTP 404 — odkaz vede do prázdna`,
    evidence: `URL: ${path}`,
  }
}
