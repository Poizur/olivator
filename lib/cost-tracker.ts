// Cost Tracker — hard-limit guard pro dávkové běhy Claude API.
//
// Použití:
//   const tracker = createCostTracker({ hardLimitUsd: 3, name: 'junk-cleanup' })
//   await tracker.guard()  // throw pokud už přes limit
//   const result = await callClaude({...})
//   tracker.recordUsage(result.usage)  // záznam z anthropic SDK response
//   console.log(tracker.report())
//
// Pricing tabulka: stav 2026-05. Aktualizuj pokud se ceny změní.
// Pricing podle Anthropic dev docs — input/output per 1M tokenů.

type Model =
  | 'claude-haiku-4-5-20251001'
  | 'claude-haiku-4-5'
  | 'claude-sonnet-4-20250514'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-7'

interface PricePerMillion {
  inputUsd: number
  outputUsd: number
}

const PRICING: Record<Model, PricePerMillion> = {
  // Haiku 4.5 — fast & cheap
  'claude-haiku-4-5':           { inputUsd: 1.00, outputUsd: 5.00 },
  'claude-haiku-4-5-20251001':  { inputUsd: 1.00, outputUsd: 5.00 },
  // Sonnet 4 — balanced
  'claude-sonnet-4-20250514':   { inputUsd: 3.00, outputUsd: 15.00 },
  'claude-sonnet-4-6':          { inputUsd: 3.00, outputUsd: 15.00 },
  // Opus 4 — premium
  'claude-opus-4-7':             { inputUsd: 15.00, outputUsd: 75.00 },
}

// Bezpečný fallback pro neznámý model — používáme Haiku ceny (nejdražší
// se obvykle reportuje samostatně). Lepší než vracet 0 = unlimited spend.
const DEFAULT_PRICING: PricePerMillion = { inputUsd: 1.0, outputUsd: 5.0 }

export interface ClaudeUsage {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

export interface CostTrackerOptions {
  hardLimitUsd: number
  name: string
}

export interface CostReport {
  name: string
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalUsd: number
  hardLimitUsd: number
  remainingUsd: number
  perModel: Record<string, { calls: number; inputTokens: number; outputTokens: number; usd: number }>
}

export class CostLimitExceededError extends Error {
  constructor(public usd: number, public limit: number, public name: string) {
    super(`[${name}] cost tracker EXCEEDED limit: $${usd.toFixed(4)} > $${limit}`)
    this.name = 'CostLimitExceededError'
  }
}

export interface CostTracker {
  recordUsage(model: string, usage: ClaudeUsage | null | undefined): number
  guard(): void
  totalUsd(): number
  remainingUsd(): number
  report(): CostReport
}

export function createCostTracker(opts: CostTrackerOptions): CostTracker {
  let totalCalls = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalUsd = 0
  const perModel = new Map<string, { calls: number; inputTokens: number; outputTokens: number; usd: number }>()

  function priceFor(model: string): PricePerMillion {
    return PRICING[model as Model] ?? DEFAULT_PRICING
  }

  return {
    recordUsage(model: string, usage: ClaudeUsage | null | undefined): number {
      const inputTokens = (usage?.input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0)
      const outputTokens = usage?.output_tokens ?? 0
      // Cache reads jsou typicky 10× levnější — ale konzervativně započítáme jako input.
      // Pro junk-brand-cleanup nepoužíváme caching, takže to nevadí.
      const cacheRead = usage?.cache_read_input_tokens ?? 0

      const p = priceFor(model)
      const usd =
        (inputTokens * p.inputUsd) / 1_000_000 +
        (outputTokens * p.outputUsd) / 1_000_000 +
        (cacheRead * (p.inputUsd * 0.1)) / 1_000_000

      totalCalls++
      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens
      totalUsd += usd

      const m = perModel.get(model) ?? { calls: 0, inputTokens: 0, outputTokens: 0, usd: 0 }
      m.calls++
      m.inputTokens += inputTokens
      m.outputTokens += outputTokens
      m.usd += usd
      perModel.set(model, m)

      return usd
    },

    guard(): void {
      if (totalUsd >= opts.hardLimitUsd) {
        throw new CostLimitExceededError(totalUsd, opts.hardLimitUsd, opts.name)
      }
    },

    totalUsd(): number {
      return totalUsd
    },

    remainingUsd(): number {
      return Math.max(0, opts.hardLimitUsd - totalUsd)
    },

    report(): CostReport {
      const perModelObj: CostReport['perModel'] = {}
      for (const [k, v] of perModel) perModelObj[k] = v
      return {
        name: opts.name,
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalUsd,
        hardLimitUsd: opts.hardLimitUsd,
        remainingUsd: Math.max(0, opts.hardLimitUsd - totalUsd),
        perModel: perModelObj,
      }
    },
  }
}
