import Link from 'next/link'

interface Props {
  page: number
  perPage: number
  total: number
  basePath: string
  // All current query params — pagination overrides page/perPage
  queryParams: Record<string, string | undefined>
}

const PER_PAGE_OPTIONS = [10, 50, 100, 250]

function buildUrl(
  basePath: string,
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const merged = { ...params, ...overrides }
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== '') qs.set(k, v)
  }
  const s = qs.toString()
  return s ? `${basePath}?${s}` : basePath
}

export function AdminPagination({ page, perPage, total, basePath, queryParams }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  // Strip page/perPage from base params so we always override them cleanly
  const baseParams = { ...queryParams }
  delete baseParams.page
  delete baseParams.perPage

  function pageUrl(p: number, pp?: number) {
    return buildUrl(basePath, baseParams, {
      page: p > 1 ? String(p) : undefined,
      perPage: (pp ?? perPage) !== 50 ? String(pp ?? perPage) : undefined,
    })
  }

  // Page number range with ellipsis
  const range: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) range.push(i)
  } else {
    range.push(1)
    if (page > 3) range.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i)
    if (page < totalPages - 2) range.push('...')
    range.push(totalPages)
  }

  const btnBase = 'px-2.5 py-1 text-xs rounded border transition-colors'
  const btnActive = 'bg-olive text-white border-olive'
  const btnNormal = 'border-off2 text-text2 hover:border-olive hover:text-olive bg-white'
  const btnDisabled = 'border-off2 text-text3 opacity-40 pointer-events-none bg-white'

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
      {/* Per-page selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text3 mr-0.5">Zobrazit:</span>
        {PER_PAGE_OPTIONS.map((opt) => (
          <Link key={opt} href={pageUrl(1, opt)} className={`${btnBase} ${perPage === opt ? btnActive : btnNormal}`}>
            {opt}
          </Link>
        ))}
      </div>

      {/* Total info */}
      <span className="text-xs text-text3 tabular-nums">
        {total.toLocaleString('cs-CZ')} celkem · str. {page}/{totalPages}
      </span>

      {/* Page nav */}
      <div className="flex items-center gap-1">
        <Link
          href={pageUrl(Math.max(1, page - 1))}
          className={`${btnBase} ${page <= 1 ? btnDisabled : btnNormal}`}
          aria-disabled={page <= 1}
        >
          ←
        </Link>
        {range.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-xs text-text3">
              …
            </span>
          ) : (
            <Link key={p} href={pageUrl(p)} className={`${btnBase} ${page === p ? btnActive : btnNormal}`}>
              {p}
            </Link>
          ),
        )}
        <Link
          href={pageUrl(Math.min(totalPages, page + 1))}
          className={`${btnBase} ${page >= totalPages ? btnDisabled : btnNormal}`}
          aria-disabled={page >= totalPages}
        >
          →
        </Link>
      </div>
    </div>
  )
}
