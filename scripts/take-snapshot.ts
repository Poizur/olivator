import { takeMetricSnapshot, logActivity } from '@/lib/seo-activity'
async function main() {
  const r = await takeMetricSnapshot()
  await logActivity({ action_type: 'audit', title: 'Snapshot — autonomous run', description: `${r.snapshots} metrik`, source: 'cli' })
  console.log('Snapshot:', r)
}
main().catch(console.error)
