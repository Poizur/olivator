/**
 * Playwright PDF generace z lead-magnet-preview.html.
 * Výstup: public/pruvodce-olivovy-olej.pdf
 *
 * Použití:
 *   npx tsx --env-file=.env.local scripts/generate-lead-magnet-pdf.ts
 *
 * Chromium: Používá lokálně nainstalovaný Chrome (macOS), na Railway
 * musí být installován přes `npx playwright install chromium --with-deps`
 * (viz CLAUDE.md sekce 11).
 */

import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright-core'

const HTML_PATH = path.resolve(__dirname, '../public/lead-magnet.html')
const PDF_PATH  = path.resolve(__dirname, '../public/pruvodce-olivovy-olej.pdf')

// Pokud neexistuje public/lead-magnet.html, zkopírujeme ze scratchpadu / src
const PREVIEW_FALLBACK = path.resolve(__dirname, '../app/lead-magnet/content.html')

async function main() {
  // Zjisti zdroj HTML
  const htmlSrc = fs.existsSync(HTML_PATH)
    ? HTML_PATH
    : fs.existsSync(PREVIEW_FALLBACK)
      ? PREVIEW_FALLBACK
      : null

  if (!htmlSrc) {
    console.error('ERROR: Nenalezen HTML soubor průvodce.')
    console.error('  Očekáváno: public/lead-magnet.html NEBO app/lead-magnet/content.html')
    process.exit(1)
  }

  console.log(`[pdf-gen] HTML zdroj: ${path.relative(process.cwd(), htmlSrc)}`)

  // Detekuj Chrome
  const execPath = process.env.CHROME_PATH
    ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  if (!fs.existsSync(execPath) && !process.env.CHROME_PATH) {
    console.warn('[pdf-gen] Chrome nenalezen na výchozí cestě — zkousím bez executablePath')
  }

  const launchOpts = fs.existsSync(execPath)
    ? { executablePath: execPath, headless: true, args: ['--no-sandbox'] }
    : { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }

  const browser = await chromium.launch(launchOpts)
  const page    = await browser.newPage()

  await page.goto(`file://${htmlSrc}`, { waitUntil: 'networkidle' })

  // Skryj admin banner (červený pruh "NÁHLED KE SCHVÁLENÍ")
  await page.evaluate(() => {
    const banner = document.querySelector('.banner') as HTMLElement | null
    if (banner) banner.style.display = 'none'
  })

  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    printBackground: true,
    scale: 0.92,          // Mírné zmenšení kvůli okrajům .doc kontejneru
  })

  await browser.close()

  // Ulož PDF
  fs.mkdirSync(path.dirname(PDF_PATH), { recursive: true })
  fs.writeFileSync(PDF_PATH, pdfBuffer)

  const sizeMb = (pdfBuffer.length / 1_048_576).toFixed(2)
  console.log(`[pdf-gen] PDF uloženo: ${path.relative(process.cwd(), PDF_PATH)} (${sizeMb} MB)`)
  console.log('[pdf-gen] Hotovo. Zkontroluj stránkování a zalomení sekcí.')
}

main().catch(err => {
  console.error('[pdf-gen] CHYBA:', err.message)
  process.exit(1)
})
