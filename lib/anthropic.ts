// Anthropic singleton — splňuje pravidlo z CLAUDE.md sekce 13:
// "Singleton, nikdy per-request". Sdílený HTTPS keep-alive pool, jeden import.
//
// Plus centrální retry wrapper pro 529 Overloaded (BUG-017 z CLAUDE.md).
// Všechny Claude wrappery musí použít callClaude() místo client.messages.create().

import Anthropic from '@anthropic-ai/sdk'

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
  retries = 4
): Promise<Anthropic.Messages.Message> {
  const client = getAnthropic()
  for (let i = 0; i < retries; i++) {
    try {
      return await client.messages.create(params)
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

/**
 * Helper pro extract textu z Claude response. Vrací '' pokud žádný text block.
 */
export function extractText(response: Anthropic.Messages.Message): string {
  const block = response.content.find((b) => b.type === 'text')
  return block && block.type === 'text' ? block.text : ''
}
