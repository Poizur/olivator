import { syncReckonasbavyComplete } from '../lib/reckonasbavi-complete-sync'

async function main() {
  console.log('[run-complete-sync] starting...')
  const result = await syncReckonasbavyComplete()
  if (!result) {
    console.log('[run-complete-sync] skipped — RECKONASBAVI_COMPLETE_FEED_URL not set')
    return
  }
  console.log(JSON.stringify(result, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
