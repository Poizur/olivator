// Pro cron skripty (samostatné Node procesy bez Next cache): po změně cen požádá web o obnovu stránek.
// Nefatální — selhání jen zaloguje, sync tím neselže.

export async function requestPriceRevalidation(since: Date, reason: string): Promise<void> {
  const base = process.env.REVALIDATE_BASE_URL ?? 'https://olivator.cz'
  try {
    const res = await fetch(`${base}/api/cron/revalidate-prices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ since: since.toISOString(), reason }),
      signal: AbortSignal.timeout(240_000),
    })
    const text = await res.text()
    if (res.ok) console.log(`[${reason}] obnova stránek s cenami: ${text.slice(0, 300)}`)
    else console.error(`[${reason}] obnova stránek s cenami SELHALA: HTTP ${res.status} ${text.slice(0, 200)}`)
  } catch (err) {
    console.error(`[${reason}] obnova stránek s cenami SELHALA:`, (err as Error).message)
  }
}
