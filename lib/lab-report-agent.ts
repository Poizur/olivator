// Claude Vision agent that reads olive oil lab analysis reports (PDF/image).
// Extracts structured chemistry: acidity, polyphenols, peroxide, K232, K270, DK, oleic acid.
// Input: public image URL. Output: structured data or null values where not found.

import { callClaude, extractText } from './anthropic'

const MODEL = 'claude-sonnet-4-20250514' // vision requires Sonnet, not Haiku

export interface LabReportData {
  acidity: number | null         // kyselost %
  polyphenols: number | null     // mg/kg
  oleocanthal: number | null     // mg/kg — protizánětlivý fenol
  peroxideValue: number | null   // mEq O2/kg
  oleicAcidPct: number | null    // kys. olejová %
  k232: number | null
  k270: number | null
  deltaK: number | null          // ΔK (DK)
  confidence: 'high' | 'medium' | 'low'
  notes: string                  // Czech, 1-2 sentences describing what was found
}

const SYSTEM_PROMPT = `Jsi odborník na laboratorní analýzy olivových olejů. Dostaneš obrázek, který MŮŽE být laboratorní protokol.

Hledej tyto hodnoty:
- **acidita** (kyselost, % volných mastných kyselin, oleic acid equivalent) — čísla jako 0.1 až 1.0
- **polyfenoly** (total polyphenols, polifenoli totali) — mg/kg, čísla typicky 50-800
- **oleocanthal** (oleocantalio, oleocantale, ibuprofen-like phenol) — mg/kg, typicky 0-700; bývá na etiketách prémiových EVOO jako samostatný údaj nebo součást fenolického profilu
- **peroxidové číslo** (peroxide value) — mEq O2/kg, čísla 0-25
- **kys. olejová** (oleic acid) — % všech mastných kyselin, typicky 55-83
- **K232** — UV absorption koeficient, typicky 1.5-3.0
- **K270** — UV absorption koeficient, typicky 0.05-0.30
- **ΔK / DeltaK / DK** — typicky -0.01 až 0.02

Vrať POUZE JSON (žádný markdown, žádný text okolo):
{
  "acidity": 0.32,
  "polyphenols": 285,
  "oleocanthal": 120,
  "peroxideValue": 8.5,
  "oleicAcidPct": 75.2,
  "k232": 1.95,
  "k270": 0.15,
  "deltaK": 0.002,
  "confidence": "high",
  "notes": "Lab report Q4 2025, Evoilino. Všechny hodnoty čitelné, pod EU limity pro extra panenský."
}

**Pravidla:**
- Hodnota NENÍ v obrázku → null (ne 0, ne "N/A")
- Obrázek není lab report (je to fotka lahve/krajiny/etikety) → confidence "low", všechny hodnoty null, notes vysvětlí ("Obrázek je fotka lahve, ne lab report")
- Čísla jsou nečitelná (rozmazané, malé) → confidence "low" nebo "medium"
- Evropské čárky (0,32) převeď na tečky (0.32)
- Pokud je "< 20 mEq" → uveď 20 (horní hranice)
- Pokud je rozsah "0,32 - 0,8 %" → uveď spodní hodnotu (0.32) jako naměřenou

**Confidence:**
- "high" — lab report jasně čitelný, ≥3 hodnoty najdeny
- "medium" — některé hodnoty najdeny, jiné nečitelné
- "low" — není lab report NEBO <2 hodnoty najdeny`

export async function scanLabReport(imageUrl: string): Promise<LabReportData> {
  // Retry pro 529 Overloaded řeší callClaude wrapper.
  const res = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl,
            },
          },
          {
            type: 'text',
            text: 'Přečti lab report a vrať JSON se strukturovanou chemií.',
          },
        ],
      },
    ],
  })
  const text = extractText(res)
  const cleaned = text
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  const parsed = JSON.parse(cleaned) as Partial<LabReportData>

  // Normalize + validate
  return {
    acidity: safeNum(parsed.acidity, 0, 5),
    polyphenols: safeNum(parsed.polyphenols, 0, 2000, true),
    oleocanthal: safeNum(parsed.oleocanthal, 0, 1000, true),
    peroxideValue: safeNum(parsed.peroxideValue, 0, 50),
    oleicAcidPct: safeNum(parsed.oleicAcidPct, 0, 100),
    k232: safeNum(parsed.k232, 0, 10),
    k270: safeNum(parsed.k270, 0, 1),
    deltaK: safeNum(parsed.deltaK, -1, 1),
    confidence: (parsed.confidence === 'high' || parsed.confidence === 'low') ? parsed.confidence : 'medium',
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
  }
}

function safeNum(v: unknown, min: number, max: number, integer = false): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!isFinite(n)) return null
  if (n < min || n > max) return null
  return integer ? Math.round(n) : n
}

/** Heuristic: guess if an image URL/filename looks like a lab report.
 *  Used to auto-suggest scanning to admin. */
export function looksLikeLabReport(url: string, alt?: string | null): boolean {
  const s = `${url} ${alt ?? ''}`.toLowerCase()
  const hints = [
    'q1-', 'q2-', 'q3-', 'q4-',
    'test', 'analyz', 'rozbor', 'protokol', 'report',
    'lab', 'chem', 'certif', 'osvedc',
    'cert-', '_cert', 'nyiooc',
    'coa', 'certificate',
  ]
  return hints.some(h => s.includes(h))
}
