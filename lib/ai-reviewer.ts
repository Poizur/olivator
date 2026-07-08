// Base runner pro AI review vrstvu — generický, znovupoužitelný.
// Specifická pravidla + kontext jsou v lib/[agent]-reviewer.ts.
//
// Pattern: caller sestaví prompt → runReview() → Claude Haiku → ReviewResult
// Loguje výsledek do agent_decisions vždy (i error).

import { callClaude, extractText } from './anthropic'
import { supabaseAdmin } from './supabase'

export interface ReviewIssue {
  rule: string
  severity: 'info' | 'warn' | 'block'
  detail: string
}

export interface ReviewResult {
  verdict: 'ok' | 'warn' | 'block' | 'error'
  issues: ReviewIssue[]
  summary: string
}

export interface ReviewContext {
  agentName: string
  prompt: string
}

const REVIEWER_MODEL = 'claude-haiku-4-5-20251001'
const TIMEOUT_MS = 30_000

async function callOnce(prompt: string): Promise<ReviewResult> {
  const response = await callClaude({
    model: REVIEWER_MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = extractText(response).trim()
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first < 0 || last <= first) {
    throw new Error(`Reviewer response is not JSON: ${text.slice(0, 120)}`)
  }
  const parsed = JSON.parse(text.slice(first, last + 1)) as {
    verdict?: string
    issues?: Array<{ rule?: string; severity?: string; detail?: string }>
    summary?: string
  }
  return {
    verdict: (['ok', 'warn', 'block'].includes(parsed.verdict ?? '') ? parsed.verdict : 'ok') as ReviewResult['verdict'],
    issues: (parsed.issues ?? []).map(i => ({
      rule: i.rule ?? 'unknown',
      severity: (['info', 'warn', 'block'].includes(i.severity ?? '') ? i.severity : 'warn') as ReviewIssue['severity'],
      detail: i.detail ?? '',
    })),
    summary: parsed.summary ?? '',
  }
}

export async function runReview(context: ReviewContext): Promise<ReviewResult> {
  let result: ReviewResult

  try {
    result = await Promise.race([
      callOnce(context.prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ])
  } catch (firstErr) {
    console.warn(`[ai-reviewer:${context.agentName}] first attempt failed, retrying:`, firstErr)
    await new Promise(r => setTimeout(r, 5000))
    try {
      result = await Promise.race([
        callOnce(context.prompt),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
      ])
    } catch (secondErr) {
      console.error(`[ai-reviewer:${context.agentName}] both attempts failed:`, secondErr)
      result = {
        verdict: 'error',
        issues: [],
        summary: 'AI reviewer nedostupný — doporučuji manuální kontrolu před sendem.',
      }
    }
  }

  try {
    await supabaseAdmin.from('agent_decisions').insert({
      agent_name: context.agentName,
      decision_type: 'review_completed',
      payload: { verdict: result.verdict, issue_count: result.issues.length, summary: result.summary },
    })
  } catch {
    // non-critical
  }

  return result
}
