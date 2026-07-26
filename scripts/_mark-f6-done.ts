import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const updates = [
    { key: 'resource_page_outreach', notes: 'Připraveno: docs/seo/resource-page-outreach.md — seznam Tier 1/2/3 webů + email šablona. Uživatel odesílá 3-5 emailů/týden.' },
    { key: 'guest_posts', notes: 'Připraveno: docs/seo/guest-post-food-blog.md + guest-post-health-blog.md. Uživatel kontaktuje blogy a posílá drafty.' },
    { key: 'haro_outreach', notes: 'Připraveno: docs/seo/haro-mediafax-guide.md — nastavení Mediafax + Google Alerts + šablony odpovědí.' },
    { key: 'wikipedia_edits', notes: 'Připraveno: docs/seo/wikipedia-edits.md — konkrétní wiki text s citacemi EFSA + IOC + NEJM. Uživatel: vytvořit účet, 10 drobných editací, pak přidat.' },
  ]
  
  for (const { key, notes } of updates) {
    const { error } = await supabaseAdmin
      .from('seo_tasks')
      .update({ status: 'done', notes })
      .eq('task_key', key)
    if (error) console.error(`Chyba ${key}:`, error.message)
    else console.log(`✅ ${key} → done`)
  }
}
main().catch(console.error)
