import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  // 1. Přidej keyword 'newsletter-repeat' do L-014
  const { data: l014 } = await sb.from('learnings').select('keywords').eq('code', 'L-014').single()
  if (l014) {
    const existing = (l014.keywords ?? []) as string[]
    if (!existing.includes('newsletter-repeat')) {
      const { error } = await sb.from('learnings').update({ keywords: [...existing, 'newsletter-repeat'] }).eq('code', 'L-014')
      if (error) console.error('L-014 update failed:', error.message)
      else console.log('✅ L-014 keywords updated → přidáno: newsletter-repeat')
    } else {
      console.log('ℹ️  L-014 už obsahuje newsletter-repeat')
    }
  }

  // 2. Vytvoř L-016
  const { data: l016, error: e2 } = await sb
    .from('learnings')
    .upsert(
      {
        code: 'L-016',
        title: 'Learning Memory Layer zavedena',
        category: 'architecture',
        impact: 'high',
        context: 'Agenti dříve četli paměť roztříštěně: markdown soubory (project_learnings.md), agent_decisions tabulka, CLAUDE.md sekce 21.',
        observation: 'Konsolidováno do learnings tabulky s getRelevantLearnings() API — keyword-based retrieval z GIN indexu.',
        rule: 'Každý nový AI agent MUSÍ volat getRelevantLearnings() před rozhodnutím a recordApplication() po akci. Pattern: read memory → decide → record. lib/learning-memory.ts je centrální vstupní bod.',
        keywords: ['learning', 'memory', 'agent', 'architecture', 'autonomie', 'getRelevantLearnings'],
        related_tickets: [],
        times_applied: 1,
        last_applied_at: new Date().toISOString(),
        validated: true,
        created_by: 'architect',
      },
      { onConflict: 'code' }
    )
    .select('id, code')
    .single()

  if (e2) console.error('L-016 failed:', e2.message)
  else console.log(`✅ L-016 vytvořena: id=${l016!.id}`)

  // 3. Ověř celkový stav
  const { count } = await sb.from('learnings').select('*', { count: 'exact', head: true })
  console.log(`\nCelkem lekcí v DB: ${count}`)
}

main().catch(console.error)
