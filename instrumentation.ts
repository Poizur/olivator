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
}
