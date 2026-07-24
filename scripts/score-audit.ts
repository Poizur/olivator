/**
 * SCORE METHODOLOGY AUDIT — data extraction script
 * Output: raw numbers for docs/audits/SCORE-METHODOLOGY-AUDIT.md
 */
import { createClient } from '@supabase/supabase-js'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
})

// ── inline score functions (mirrors lib/score.ts) ────────────────────────
const SCORING_CERTS = new Set(['dop','pdo','pgp','pgi','igp','bio','organic','nyiooc','demeter'])

function calcAcidity(a: number): number {
  if (a <= 0.2) return 35
  if (a <= 0.4) return Math.round(34 - ((a - 0.2) / 0.2) * 9)
  if (a <= 0.8) return Math.round(24 - ((a - 0.4) / 0.4) * 9)
  return Math.max(0, Math.round(14 - ((a - 0.8) / 0.7) * 14))
}
function calcCertifications(certs: string[]): number {
  const has = (c: string) => certs.map(x => x.toLowerCase()).includes(c)
  const hasDOP = has('dop') || has('pdo')
  const hasBIO = has('bio') || has('organic')
  const hasPGP = has('pgp') || has('pgi') || has('igp')
  const hasNYIOOC = has('nyiooc')
  const hasDemeter = has('demeter')
  let score = 0
  if (hasDOP && hasBIO) score = 25
  else if (hasDOP) score = 20
  else if (hasBIO) score = 18
  else if (hasPGP) score = 15
  else if (hasNYIOOC) score = 15
  if (hasDemeter) score += 3
  if (hasNYIOOC && (hasDOP || hasBIO || hasPGP)) score += 2
  return Math.max(0, Math.min(25, score))
}
function calcQuality(poly: number, peroxide?: number | null): number {
  let score = poly >= 300 ? 22 + Math.min(3, (poly - 300) / 100)
    : poly >= 200 ? 15 + ((poly - 200) / 100) * 7
    : poly >= 100 ? 8 + ((poly - 100) / 100) * 7
    : (poly / 100) * 8
  if (peroxide != null && peroxide < 20 && peroxide > 15) score -= 3
  else if (peroxide != null && peroxide < 20 && peroxide > 10) score -= 1
  return Math.max(0, Math.min(25, Math.round(score)))
}
function calcValue(price: number): number {
  if (price <= 20) return 15
  if (price <= 30) return 12
  if (price <= 40) return 9
  if (price <= 55) return 5
  return 2
}
function calcScore(acidity: number|null, certs: string[], poly: number|null, pricePer100ml: number|null, peroxide?: number|null) {
  const hasAcid = acidity != null
  const hasCert = certs.some(c => SCORING_CERTS.has(c.toLowerCase()))
  const hasPoly = poly != null
  const hasPrice = pricePer100ml != null
  const W = { acidity: 35, certifications: 25, quality: 25, value: 15 }
  const acidPts = hasAcid ? calcAcidity(acidity!) : 0
  const certPts = hasCert ? calcCertifications(certs) : 0
  const qualPts = hasPoly ? calcQuality(poly!, peroxide) : 0
  const valPts = hasPrice ? calcValue(pricePer100ml!) : 0
  const available = (hasAcid?W.acidity:0)+(hasCert?W.certifications:0)+(hasPoly?W.quality:0)+(hasPrice?W.value:0)
  if (available < 50) return null
  const sum = acidPts + certPts + qualPts + valPts
  const base = Math.round((sum / available) * 100)
  const bonus = (hasPoly && poly! > 1500) ? Math.min(10, Math.floor((poly! - 1500) / 200)) : 0
  return { total: Math.min(100, base + bonus), acid: acidPts, cert: certPts, qual: qualPts, val: valPts, available, base, bonus, hasAcid, hasCert, hasPoly, hasPrice }
}

function pricePer100ml(price: number, volumeMl: number | null): number | null {
  if (!volumeMl || volumeMl <= 0) return null
  return price / (volumeMl / 100)
}

async function main() {
  // Fetch all active products + their cheapest offers
  const { data: products } = await s.from('products').select(
    'id,slug,name,olivator_score,score_breakdown,acidity,polyphenols,peroxide_value,certifications,harvest_year,volume_ml,type'
  ).eq('status', 'active').order('olivator_score', { ascending: false })

  const { data: offers } = await s.from('product_offers').select('product_id,price,in_stock').eq('in_stock', true)

  // Cheapest offer per product
  const cheapestByProduct: Record<string, number> = {}
  for (const o of offers ?? []) {
    const pid = o.product_id as string
    const price = o.price as number
    if (!cheapestByProduct[pid] || price < cheapestByProduct[pid]) cheapestByProduct[pid] = price
  }

  const all = (products ?? []).map(p => {
    const cheapest = cheapestByProduct[p.id as string] ?? null
    const pp100 = pricePer100ml(cheapest ?? 0, p.volume_ml as number)
    const pp100safe = cheapest && p.volume_ml ? pricePer100ml(cheapest, p.volume_ml as number) : null
    const certs = (p.certifications as string[]) ?? []
    const sc = calcScore(p.acidity as number|null, certs, p.polyphenols as number|null, pp100safe, p.peroxide_value as number|null)
    const scoringCerts = certs.filter(c => SCORING_CERTS.has(c.toLowerCase()))
    return {
      slug: p.slug as string,
      name: (p.name as string).slice(0, 50),
      olivator_score: p.olivator_score as number | null,
      computed: sc,
      acidity: p.acidity as number | null,
      polyphenols: p.polyphenols as number | null,
      peroxide: p.peroxide_value as number | null,
      certs: scoringCerts,
      harvest_year: p.harvest_year as number | null,
      volume_ml: p.volume_ml as number | null,
      cheapest,
      pp100: pp100safe,
      type: p.type as string,
    }
  })

  const withScore = all.filter(p => p.computed && p.computed.total > 0)
  const withoutScore = all.filter(p => !p.computed || p.computed.total === 0)

  console.log('\n════════════════════════════════════════')
  console.log('SCORE METHODOLOGY AUDIT — 2026-07-24')
  console.log('════════════════════════════════════════')

  // ── 1a. HISTOGRAM ────────────────────────────────────────────────────────
  console.log('\n── 1a. HISTOGRAM (computed scores) ──')
  const scores = withScore.map(p => p.computed!.total).sort((a,b) => a-b)
  const brackets: Record<string, number> = {}
  for (let i = 0; i <= 100; i += 5) brackets[`${i}-${i+4}`] = 0
  for (const s of scores) {
    const lo = Math.floor(s / 5) * 5
    brackets[`${lo}-${lo+4}`] = (brackets[`${lo}-${lo+4}`] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(brackets)) {
    if (v > 0) console.log(`  ${k}: ${'█'.repeat(v)} ${v}`)
  }
  const n = scores.length
  const sorted = [...scores].sort((a,b)=>a-b)
  const median = sorted[Math.floor(n/2)]
  const q1 = sorted[Math.floor(n*0.25)]
  const q3 = sorted[Math.floor(n*0.75)]
  console.log(`  n=${n}  median=${median}  Q1=${q1}  Q3=${q3}  min=${sorted[0]}  max=${sorted[n-1]}`)

  // ── 1b. BRACKETY ────────────────────────────────────────────────────────
  console.log('\n── 1b. BRACKETY ──')
  const b90 = withScore.filter(p=>p.computed!.total>=90).length
  const b80 = withScore.filter(p=>p.computed!.total>=80&&p.computed!.total<90).length
  const b70 = withScore.filter(p=>p.computed!.total>=70&&p.computed!.total<80).length
  const bLow = withScore.filter(p=>p.computed!.total<70).length
  console.log(`  90+: ${b90}  80-89: ${b80}  70-79: ${b70}  <70: ${bLow}  bez score: ${withoutScore.length}`)

  // ── 1c. SCORE STABILITA — ±10% CENA ────────────────────────────────────
  console.log('\n── 1c. SCORE STABILITA ±10% cena ──')
  const priceChanges: { slug: string; base: number; minus10: number; plus10: number }[] = []
  for (const p of all.filter(pp => pp.computed && pp.computed.total > 0 && pp.pp100)) {
    const base = p.computed!.total
    const pp = p.pp100!
    const sc_m10 = calcScore(p.acidity, p.certs, p.polyphenols, pp * 0.9, p.peroxide)
    const sc_p10 = calcScore(p.acidity, p.certs, p.polyphenols, pp * 1.1, p.peroxide)
    priceChanges.push({
      slug: p.slug,
      base,
      minus10: sc_m10?.total ?? base,
      plus10: sc_p10?.total ?? base,
    })
  }
  const diffs = priceChanges.map(pc => Math.max(Math.abs(pc.base - pc.minus10), Math.abs(pc.base - pc.plus10)))
  const maxDiff = Math.max(...diffs)
  const avgDiff = diffs.reduce((a,b)=>a+b,0)/diffs.length
  const movers = priceChanges.filter(pc => Math.abs(pc.base-pc.minus10) > 0 || Math.abs(pc.base-pc.plus10) > 0)
  console.log(`  Průměrná změna při ±10% cena: ${avgDiff.toFixed(2)} bodu`)
  console.log(`  Max změna: ${maxDiff} bodu`)
  console.log(`  Produktů kde ±10% změní Score: ${movers.length} z ${priceChanges.length}`)
  // Show price bracket boundaries
  const boundaries = [
    {label:'≤20→≤22 (+2 Kč/100ml)', change: calcValue(22)-calcValue(20)},
    {label:'≤30→≤33 (+3 Kč/100ml)', change: calcValue(33)-calcValue(30)},
    {label:'≤40→≤44 (+4 Kč/100ml)', change: calcValue(44)-calcValue(40)},
    {label:'≤55→≤61 (+6 Kč/100ml)', change: calcValue(61)-calcValue(55)},
  ]
  console.log('  Skoky na hranicích calcValue:')
  for (const b of boundaries) console.log(`    ${b.label}: ${b.change} bodu`)

  // ── 2a. FULL DATA VS PARTIAL ────────────────────────────────────────────
  console.log('\n── 2a. DATOVÁ POKRYTOST ──')
  const groups: Record<string, number[]> = {'4/4':[],'3/4':[],'2/4':[],'1/4':[]}
  for (const p of all) {
    const sc = p.computed
    if (!sc) continue
    const bits = [sc.hasAcid,sc.hasCert,sc.hasPoly,sc.hasPrice].filter(Boolean).length
    const key = `${bits}/4` as keyof typeof groups
    if (groups[key]) groups[key].push(sc.total)
  }
  for (const [k, arr] of Object.entries(groups)) {
    const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 'N/A'
    console.log(`  ${k} složky: ${arr.length} produktů | průměrné Score: ${avg}`)
  }
  // Products with insufficient data
  console.log(`  insufficient data (null): ${withoutScore.length} produktů`)

  // Missing data breakdown
  const missingAcid = all.filter(p=>p.acidity==null).length
  const missingPoly = all.filter(p=>p.polyphenols==null).length
  const missingCert = all.filter(p=>!p.certs.some(c=>SCORING_CERTS.has(c.toLowerCase()))).length
  const missingPrice = all.filter(p=>p.pp100==null).length
  console.log(`  Chybí kyselost: ${missingAcid}/${all.length}`)
  console.log(`  Chybí polyfenoly: ${missingPoly}/${all.length}`)
  console.log(`  Bez scoring cert: ${missingCert}/${all.length}`)
  console.log(`  Bez ceny: ${missingPrice}/${all.length}`)

  // ── 2b. RENORMALIZACE SIMULACE ────────────────────────────────────────
  console.log('\n── 2b. RENORMALIZACE — TOP 20 posun ──')
  // Current TOP 20
  const top20current = [...withScore].sort((a,b)=>b.computed!.total-a.computed!.total).slice(0,20)
  // Renormalized: already IS renormalized (score.ts does this) —
  // so current system IS proportional. Let me compare with PENALTY system (0 for missing)
  const penaltyScores = all.map(p => {
    const acid = p.acidity != null ? calcAcidity(p.acidity) : 0
    const cert = p.certs.length ? calcCertifications(p.certs) : 0
    const qual = p.polyphenols != null ? calcQuality(p.polyphenols, p.peroxide) : 0
    const val = p.pp100 != null ? calcValue(p.pp100) : 0
    const total = acid + cert + qual + val
    return { slug: p.slug, name: p.name, penalty: total, renorm: p.computed?.total ?? 0 }
  }).filter(p=>p.renorm>0).sort((a,b)=>b.renorm-a.renorm)

  // Show where PENALTY score differs from renormalized in top 20
  const top20pen = [...penaltyScores].sort((a,b)=>b.penalty-a.penalty).slice(0,20).map(p=>p.slug)
  const top20renorm = penaltyScores.slice(0,20).map(p=>p.slug)
  console.log('  Produkty v TOP 20 renorm ale NE v TOP 20 penalty:')
  for (const s of top20renorm) {
    if (!top20pen.includes(s)) {
      const pp = penaltyScores.find(x=>x.slug===s)!
      console.log(`    + ${pp.name.slice(0,40)} | renorm=${pp.renorm} penalty=${pp.penalty}`)
    }
  }
  console.log('  Produkty v TOP 20 penalty ale NE v TOP 20 renorm:')
  for (const s of top20pen) {
    if (!top20renorm.includes(s)) {
      const pp = penaltyScores.find(x=>x.slug===s)!
      console.log(`    - ${pp.name.slice(0,40)} | renorm=${pp.renorm} penalty=${pp.penalty}`)
    }
  }
  if (top20pen.join() === top20renorm.join()) console.log('  (Shodné — renormalizace nemění TOP 20 pořadí)')

  // ── 3a. KYSELOST DISTRIBUCE ────────────────────────────────────────────
  console.log('\n── 3a. KYSELOST DISTRIBUCE ──')
  const acidValues = all.map(p=>p.acidity).filter(v=>v!=null) as number[]
  const uniqueAcid = [...new Set(acidValues.map(v=>Math.round(v*10)/10))].sort((a,b)=>a-b)
  console.log(`  Celkem s kyselostí: ${acidValues.length}/${all.length}`)
  console.log(`  Unikátní hodnoty (zaokr. na 1 des.): ${uniqueAcid.join(', ')}`)
  const acidFreq: Record<string,number> = {}
  for (const v of acidValues) {
    const k = (Math.round(v*10)/10).toFixed(1)
    acidFreq[k] = (acidFreq[k]||0)+1
  }
  console.log('  Frekvence (nejčastější):')
  Object.entries(acidFreq).sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([k,v])=>console.log(`    ${k}%: ${v}×`))
  // Show score at each acidity level
  console.log('  Score za kyselost (calcAcidity):')
  for (const [k] of Object.entries(acidFreq).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))) {
    console.log(`    acidity=${k}% → ${calcAcidity(parseFloat(k))}/35 bodů`)
  }

  // ── 3b. CERTIFIKACE ────────────────────────────────────────────────────
  console.log('\n── 3b. CERTIFIKACE ──')
  const certFreq: Record<string,number> = {}
  let avgCertPts = 0; let certCount = 0
  for (const p of all) {
    if (!p.certs.length) continue
    const pts = calcCertifications(p.certs)
    avgCertPts += pts; certCount++
    for (const c of p.certs) certFreq[c] = (certFreq[c]||0)+1
  }
  console.log('  Distribuce scoring certů:')
  Object.entries(certFreq).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`    ${k}: ${v}×`))
  console.log(`  Průměrné body za cert (jen ti co mají): ${certCount ? (avgCertPts/certCount).toFixed(1) : 'N/A'}/25`)
  const noCert = all.filter(p=>!p.certs.some(c=>SCORING_CERTS.has(c.toLowerCase())))
  const noCertWithScore = noCert.filter(p=>p.computed&&p.computed.total>0)
  const maxNoCert = noCertWithScore.length ? Math.max(...noCertWithScore.map(p=>p.computed!.total)) : 0
  console.log(`  Produkty bez scoring cert: ${noCert.length} | max Score bez cert: ${maxNoCert}`)
  // Ceiling analysis — what's max score without DOP+BIO?
  console.log('  Teoretický strop bez cert: závisí na kyselosti+poly+ceně')
  const maxNoCertScore = noCertWithScore.reduce((max,p)=>Math.max(max, p.computed!.total), 0)
  console.log(`  Reálný max bez scoring cert v DB: ${maxNoCertScore}`)

  // ── 3c. CENA/KVALITA — CASE STUDY SITIA ──────────────────────────────
  console.log('\n── 3c. CASE STUDY — stejný olej různá balení ──')
  const sitia = all.filter(p=>p.slug.toLowerCase().includes('sitia'))
  for (const p of sitia.slice(0,10)) {
    console.log(`  ${p.slug.slice(0,55)}`)
    console.log(`    volume=${p.volume_ml}ml cheapest=${p.cheapest} pp100=${p.pp100?.toFixed(1)} Score=${p.computed?.total}`)
  }

  // ── 3d. HARVEST YEAR ────────────────────────────────────────────────────
  console.log('\n── 3d. HARVEST YEAR ──')
  const withHarvest = all.filter(p=>p.harvest_year!=null)
  const harvestFreq: Record<number,number> = {}
  for (const p of withHarvest) harvestFreq[p.harvest_year!] = (harvestFreq[p.harvest_year!]||0)+1
  console.log(`  S harvest_year: ${withHarvest.length}/${all.length}`)
  Object.entries(harvestFreq).sort((a,b)=>Number(a[0])-Number(b[0])).forEach(([y,n])=>console.log(`    ${y}: ${n}×`))
  // Freshness simulation: 2025 sklizeň = bonus 5b, 2024 = 0b, 2023 = -5b
  const currentYear = 2026
  const withFreshnessBonus = withHarvest.filter(p=>p.harvest_year===currentYear-1).length // 2025
  console.log(`  2025 sklizeň (1 rok stará): ${withFreshnessBonus}× — mohly by dostat freshness bonus`)

  // ── 4. RED-TEAM ────────────────────────────────────────────────────────
  console.log('\n── 4. RED-TEAM — manipulovatelné vektory ──')
  // Max score achievable by declaring low acidity
  const maxWithMinAcid = calcScore(0.1, ['dop','bio'], 300, 20, null)
  const maxWithFakeAcid = calcScore(0.1, [], 300, 20, null)
  console.log(`  DOP+BIO+300mg+20Kč/100ml+acid=0.1%: Score=${maxWithMinAcid?.total}`)
  console.log(`  Bez cert, jen acid=0.1%+300mg+20Kč: Score=${maxWithFakeAcid?.total}`)
  // Acidity gaming impact
  const fakeAcidBoost = calcAcidity(0.1) - calcAcidity(0.3)
  console.log(`  Posun acidity 0.3→0.1% (deklarace bez ověření): +${fakeAcidBoost} bodů`)
  // Cert stacking — multiple equiv certs
  const singleDOP = calcCertifications(['dop'])
  const dopPdoRedundant = calcCertifications(['dop', 'pdo'])
  console.log(`  DOP alone: ${singleDOP}/25 | DOP+PDO (redundant): ${dopPdoRedundant}/25`)
  // Price gaming — volume manipulation
  const v1l = calcValue(30); const v5l = calcValue(30*0.7)
  console.log(`  Olej 30 Kč/100ml (1L): ${v1l}/15 | stejný 5L "70%" slevy = 21Kč/100ml: ${v5l}/15`)
  // Max theoretical score
  const maxPossible = calcScore(0.1, ['dop','bio','demeter','nyiooc'], 2800, 15, 5)
  console.log(`  Max teoretický Score (vše perfect): ${maxPossible?.total}`)
  console.log(`  breakdown: acid=${maxPossible?.acid} cert=${maxPossible?.cert} qual=${maxPossible?.qual} val=${maxPossible?.val} bonus=${maxPossible?.bonus}`)

  // Extra: products where computed != stored
  console.log('\n── BONUS: computed vs. DB score neshoda ──')
  let mismatches = 0
  for (const p of all) {
    const computed = p.computed?.total ?? 0
    const stored = p.olivator_score ?? 0
    const diff = Math.abs(computed - stored)
    if (diff > 2) {
      mismatches++
      if (mismatches <= 10) console.log(`  ${p.slug.slice(0,45)}: computed=${computed} DB=${stored} diff=${diff}`)
    }
  }
  if (mismatches > 10) console.log(`  ... a ${mismatches-10} dalších`)
  console.log(`  Celkem >2 bodů rozdíl: ${mismatches}`)
}

main().catch(console.error)
