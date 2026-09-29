/**
 * Manuální trigger čtvrtečního auto-sendu (normálně běží ve welcome-dispatcher cronu).
 * Local: npm run cron:newsletter-send
 */
import { autoSendWeeklyNewsletter } from '@/lib/newsletter-auto-send'

autoSendWeeklyNewsletter()
  .then(r => { console.log('[cron:newsletter-send]', JSON.stringify(r)); process.exit(0) })
  .catch(err => { console.error('[cron:newsletter-send] FAILED:', err); process.exit(1) })
