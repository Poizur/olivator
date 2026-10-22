// Anthropic singleton — splňuje pravidlo z CLAUDE.md sekce 13:
// "Singleton, nikdy per-request". Sdílený HTTPS keep-alive pool, jeden import.
//
// Plus centrální retry wrapper pro 529 Overloaded (BUG-017 z CLAUDE.md).
// Všechny Claude wrappery musí použít callClaude() místo client.messages.create().

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'

let _client: Anthropic | null = null

/**
 * Vrací singleton Anthropic klienta. Lazy init — vyhne se chybě při buildu
 * kde ANTHROPIC_API_KEY ještě není dostupný (Next.js prerender).
 */
export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY missing')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

/**
 * Volání Claude messages API s exponential backoff pro 529 Overloaded.
 * BUG-017 z CLAUDE.md: 529 jsou normální, retry s 5/15/30/60s je standard.
 */
export async function callClaude(
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  retries = 4,
  opts: { source?: string } = {}
): Promise<Anthropic.Messages.Message> {
  const client = getAnthropic()
  for (let i = 0; i < retries; i++) {
    try {
      const res = await client.messages.create(params)
      await logApiUsage(res, opts.source)
      return res
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 529 && i < retries - 1) {
        const delay = [5000, 15000, 30000, 60000][i] ?? 60000
        console.warn(`[anthropic] 529 Overloaded, retry ${i + 1}/${retries - 1} in ${delay}ms`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw new Error('Claude API: max retries exceeded')
}

// USD za milion tokenů [vstup, výstup]. Cache: zápis 1,25× vstup, čtení 0,1× vstup.
const PRICES: Array<[RegExp, number, number]> = [
  [/opus/, 15, 75],
  [/sonnet/, 3, 15],
  [/haiku-4/, 1, 5],
  [/haiku/, 0.8, 4],
]

export function estimateCostUsd(model: string, u: Anthropic.Messages.Usage): number {
  const [, pin, pout] = PRICES.find(([re]) => re.test(model)) ?? [null, 3, 15]
  const cacheWrite = u.cache_creation_input_tokens ?? 0
  const cacheRead = u.cache_read_input_tokens ?? 0
  return (u.input_tokens * pin + cacheWrite * pin * 1.25 + cacheRead * pin * 0.1 + u.output_tokens * pout) / 1e6
}

/** Zápis spotřeby do api_usage (denní přehled nákladů v pondělní rutině). Chyba zápisu nesmí shodit volání. */
async function logApiUsage(res: Anthropic.Messages.Message, source?: string): Promise<void> {
  try {
    const u = res.usage
    await supabaseAdmin.from('api_usage').insert({
      source: (source ?? process.env.RAILWAY_SERVICE_NAME ?? 'local').slice(0, 80),
      model: res.model.slice(0, 60),
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
      cost_usd: Number(estimateCostUsd(res.model, u).toFixed(5)),
    })
  } catch (err) {
    console.warn('[anthropic] api_usage log failed', err)
  }
}

/**
 * Helper pro extract textu z Claude response. Vrací '' pokud žádný text block.
 */
export function extractText(response: Anthropic.Messages.Message): string {
  const block = response.content.find((b) => b.type === 'text')
  return block && block.type === 'text' ? block.text : ''
}
