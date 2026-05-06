/**
 * Fix reckonasbavi affiliate template — desturl= místo url=, a_bid c38e2d15.
 * Run: node --env-file=.env.local --import tsx scripts/fix-reckonasbavi-tpl.ts
 */
async function fixTplMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  // FINAL: a_bid 46f8224d (reckonasbavi banner) + desturl= parameter
  // Test potvrdil že tato kombinace deep-linkuje na produktovou URL.
  // Předtím byl parametr 'url=' který eHUB pro tento banner ignoroval
  // a redirectoval na homepage.
  const NEW_TPL =
    'https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=46f8224d&data1={product_slug}&desturl={product_url}'

  const { data: before } = await supabaseAdmin
    .from('retailers')
    .select('slug, name, base_tracking_url')
    .eq('slug', 'reckonasbavi')
    .maybeSingle()
  console.log('Before:', before?.base_tracking_url)
  console.log()

  const { error } = await supabaseAdmin
    .from('retailers')
    .update({ base_tracking_url: NEW_TPL })
    .eq('slug', 'reckonasbavi')
  if (error) {
    console.error('Update failed:', error.message)
    return
  }

  console.log('After: ', NEW_TPL)
  console.log()
  console.log('Test URL pro Iliada:')
  const ILIADA_URL = 'https://shop.reckonasbavi.cz/iliada-kalamata-extra-panensky-olivovy-olej-0-5--500ml---sklo/'
  const filled = NEW_TPL
    .replace('{product_slug}', encodeURIComponent('iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml'))
    .replace('{product_url}', encodeURIComponent(ILIADA_URL))
  console.log(filled)
}

fixTplMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
