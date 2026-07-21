export interface SourceVerification {
  ok: boolean
  status?: number
  evidence: string
}

const TIMEOUT_MS = 8_000

export async function verifyUrl(url: string): Promise<SourceVerification> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'olivator-executor/1.0' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      return { ok: true, status: res.status, evidence: `HTTP ${res.status} ${res.url}` }
    }
    return { ok: false, status: res.status, evidence: `HTTP ${res.status} — stránka nedostupná` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, evidence: `fetch selhal: ${msg}` }
  }
}
