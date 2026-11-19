// Next.js instrumentation hook — běží 1× při startu Node.js serveru.
// Dokumentace: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
//
// Účel: Railway hobby memory roste lineárně (50 MB → 500 MB / 24h, žádný GC
// pressure → reference se neuvolňují). Po 24h aplikace sama končí, Railway
// restartuje container (railway.toml: restartPolicyType = "ALWAYS").
// Výsledek: stabilní RAM ~50-200 MB, billing klesne ze ~$0.80 na ~$0.30 měs.
//
// Jen v Node.js runtime (ne Edge) — Edge nemá process API.

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return

  const RESTART_AFTER_MS = 24 * 60 * 60 * 1000 // 24 hodin
  const startedAt = Date.now()

  setTimeout(() => {
    const uptimeHours = ((Date.now() - startedAt) / 3600_000).toFixed(1)
    const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024)
    console.log(
      `[instrumentation] 24h scheduled restart — uptime=${uptimeHours}h rss=${memMB}MB. exit(0).`
    )
    // exit(0) = healthy exit. Railway restartPolicy=ALWAYS pak restartne.
    process.exit(0)
  }, RESTART_AFTER_MS)

  console.log('[instrumentation] daily restart timer armed (24h from now)')

  // Po startu (nasazení, restart) obnov stránky s cenami: /, /slevy, žebříčky a oleje se změnou ceny za 24 h.
  // Build je předgeneroval v čase buildu; tohle zaručí, že první návštěvník nedostane starší kopii.
  setTimeout(() => {
    const port = process.env.PORT ?? '3000'
    fetch(`http://127.0.0.1:${port}/api/cron/revalidate-prices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ reason: 'deploy' }),
      signal: AbortSignal.timeout(280_000),
    })
      .then(async (res) => console.log(`[instrumentation] obnova stránek po startu: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`))
      .catch((err: Error) => console.error('[instrumentation] obnova stránek po startu selhala:', err.message))
  }, 20_000).unref()
}
