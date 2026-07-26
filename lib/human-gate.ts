// lib/human-gate.ts — L-037: Fail-closed guard
//
// "Fail-closed: když si automat není jistý, NEDĚLÁ NIC a ptá se."
//
// Volej z každé automatizované cesty, která by chtěla:
//   - změnit status entity na 'active' (produkty, články, retaileři)
//   - odeslat email s AI obsahem subscribers
//   - zapsat AI editorial text přímo do DB bez schválení
//
// Funkce zaloguje pokus do agent_decisions a vyhodí chybu.
// Volající MUSÍ zachytit výjimku a degradovat gracefully (přeskočit, vytvořit proposal).

import { logAgentAction } from '@/lib/audit-log'

export type GatedAction =
  | 'status_active:product'
  | 'status_active:article'
  | 'status_active:retailer'
  | 'email_send:ai_content'
  | 'retailer_text:tagline_story'

/**
 * Ověří, že akce probíhá v admin kontextu (isAdminContext=true).
 * Bez admin kontextu loguje do agent_decisions a hází HUMAN_GATE chybu.
 *
 * @param action - typ chráněné akce (viz GatedAction)
 * @param entityId - ID entity (UUID nebo slug)
 * @param caller - jméno volajícího modulu/funkce (pro debug)
 * @param isAdminContext - true pokud volání pochází z admin API route
 */
export async function assertHumanGate(
  action: GatedAction,
  entityId: string,
  caller: string,
  isAdminContext = false
): Promise<void> {
  if (isAdminContext) return

  await logAgentAction({
    agentName: 'human-gate',
    decisionType: 'gate_blocked',
    payload: {
      action,
      entity_id: entityId,
      caller,
      rule: 'L-037',
      message: 'Automatizovaná akce blokována — vyžaduje admin kontext',
    },
  })

  throw new Error(
    `HUMAN_GATE [L-037]: "${action}" pro ${entityId} blokováno. ` +
    `Zalogováno do agent_decisions. Admin musí schválit. Caller: ${caller}`
  )
}

/**
 * Vrací true pokud je akce povolena (admin kontext), false jinak.
 * Soft varianta — nezaloguje, jen vrátí bool. Použij pro if-else branching.
 */
export function isHumanContextPresent(isAdminContext = false): boolean {
  return isAdminContext
}
