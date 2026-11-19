/**
 * Prebuild kontrola: každá route v app/api/admin/** musí volat isAdminAuthenticated (middleware kryje jen /admin stránky,
 * ne /api/admin — nález 2026-11-19: /api/admin/maintenance byl bez kontroly). Výjimky: login, logout.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join('app', 'api', 'admin')
const EXEMPT = new Set([join(ROOT, 'login', 'route.ts'), join(ROOT, 'logout', 'route.ts')])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (name === 'route.ts') out.push(p)
  }
  return out
}

const missing = walk(ROOT).filter((f) => !EXEMPT.has(f) && !/isAdminAuthenticated\s*\(/.test(readFileSync(f, 'utf8')))
if (missing.length > 0) {
  console.error(`[check-admin-auth] ✗ route bez isAdminAuthenticated():\n  ${missing.join('\n  ')}`)
  process.exit(1)
}
console.log('[check-admin-auth] ✓ všechny /api/admin routes mají kontrolu přihlášení')
