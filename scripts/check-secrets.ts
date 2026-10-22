/**
 * Prebuild kontrola: v souborech sledovaných gitem nesmí být tajné klíče (Anthropic sk-ant-, Supabase, JWT, Resend, GitHub).
 * Při nálezu build selže a vypíše jen soubor:řádek, nikdy hodnotu.
 */
import { execSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const PATTERN = /sk-ant-[A-Za-z0-9_-]{8,}|sb_secret_[A-Za-z0-9_-]{8,}|sbp_[a-f0-9]{20,}|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|BEGIN (RSA |EC )?PRIVATE KEY/

let files: string[] = []
try {
  files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
} catch {
  console.log('[check-secrets] git není k dispozici — přeskočeno')
  process.exit(0)
}

const hits: string[] = []
for (const f of files) {
  try {
    if (statSync(f).size > 2_000_000) continue
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (PATTERN.test(line)) hits.push(`${f}:${i + 1}`)
    })
  } catch { /* smazaný nebo binární soubor */ }
}

if (hits.length > 0) {
  console.error(`[check-secrets] ✗ Tajný klíč v souborech sledovaných gitem:\n  ${hits.join('\n  ')}`)
  process.exit(1)
}
console.log(`[check-secrets] ✓ ${files.length} souborů bez tajných klíčů`)
