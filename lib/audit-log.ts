// lib/audit-log.ts — unified helper pro audit trail autonomních akcí.
// Každý cron, který mění data v DB, volá tuto funkci místo vlastního INSERT.
//
// Vědomě neauditováno (interní kuchyně, v briefu by byl šum):
//   - quality_issues status=resolved (auto-audit) — jen interní stav flagů
//   - newsletter_pinned_product auto-clear (composer) — admin nastavil, composer konzumoval
//   - cultivar flavor_profile recompute (entity-aggregate) — bezpečná re-kalkulace, bez user dopadu
//   - email_drip_queue status update (lead-magnet-drip) — stavový automat

import { supabaseAdmin } from './supabase'

export async function logAgentAction(opts: {
  agentName: string
  decisionType: string
  payload: Record<string, unknown>
}): Promise<void> {
  try {
    await supabaseAdmin.from('agent_decisions').insert({
      agent_name: opts.agentName,
      decision_type: opts.decisionType,
      payload: opts.payload,
    })
  } catch (err) {
    // Audit log failure nesmí shodit main pipeline
    console.warn(`[audit-log] Failed to log ${opts.agentName}/${opts.decisionType}:`, err instanceof Error ? err.message : err)
  }
}
