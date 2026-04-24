// Certification claim detector.
// Scans raw_description text for DOP / PGP / BIO / NYIOOC / Demeter mentions.
// Pure function, no external calls. Output is SUGGESTIONS — admin must confirm
// before adding to products.certifications array. BIO/DOP require actual paperwork
// so we distinguish "claim" (low confidence) from "certificate number found" (high).

export type Confidence = 'high' | 'medium' | 'low'

export interface CertCandidate {
  cert: string       // matches CERT_OPTIONS value (dop, pgp, bio, organic, nyiooc, demeter)
  label: string      // human-readable UI label
  confidence: Confidence
  evidence: string   // the actual matched text snippet
  reasoning: string  // why we flagged it
}

// Pattern groups — each cert type has multiple regexes sorted by confidence tier.
// We take the HIGHEST confidence match per cert (one product can have multiple certs).
interface PatternGroup {
  cert: string
  label: string
  patterns: Array<{ re: RegExp; confidence: Confidence; reasoning: string }>
}

const CERT_PATTERNS: PatternGroup[] = [
  {
    cert: 'dop',
    label: 'DOP / PDO',
    patterns: [
      { re: /\b(?:DOP|PDO|P\.D\.O\.?)\s+([A-ZŘÁČÉÍÓÚŮĚŠČŽÝŇŤĎ][a-zřáéíóúůěščžýňťďě]{3,25})\b/, confidence: 'high', reasoning: 'DOP/PDO s konkrétním regionem' },
      { re: /\b(?:DOP|PDO|P\.D\.O\.?)\b/, confidence: 'high', reasoning: 'DOP/PDO zmíněno' },
      { re: /\bchráněné\s+označení\s+původu\b/i, confidence: 'high', reasoning: 'Explicitní "chráněné označení původu"' },
      { re: /\bdenominazione\s+(?:di\s+)?origine\s+protetta\b/i, confidence: 'high', reasoning: 'DOP v italštině' },
    ],
  },
  {
    cert: 'pgp',
    label: 'PGP / IGP / IGT',
    patterns: [
      { re: /\b(?:PGP|PGI|IGP|IGT)\s+([A-ZŘÁČÉÍÓÚŮĚŠČŽÝŇŤĎ][a-zřáéíóúůěščžýňťďě]{3,25})\b/, confidence: 'high', reasoning: 'PGP/IGP s konkrétním regionem' },
      { re: /\b(?:PGP|PGI|IGP|IGT)\b/, confidence: 'high', reasoning: 'PGP/IGP/IGT zmíněno' },
      { re: /\bchráněné\s+zeměpisné\s+označení\b/i, confidence: 'high', reasoning: 'Explicitní "chráněné zeměpisné označení"' },
      { re: /\bindicazione\s+geografica\s+protetta\b/i, confidence: 'high', reasoning: 'IGP v italštině' },
    ],
  },
  {
    cert: 'bio',
    label: 'BIO',
    patterns: [
      // High — official certificate number pattern (e.g. CZ-BIO-001, IT-BIO-014, EU-BIO-XXX)
      { re: /\b(?:CZ|EU|DE|AT|FR|IT|ES|GR|PT|HR|UK)-(?:BIO|ECO|ORG|AB)[-\s]?\d{2,5}\b/i, confidence: 'high', reasoning: 'Nalezen certifikační kód (např. CZ-BIO-001)' },
      { re: /\bcertifikát\s+(?:č\.?|číslo)?\s*(?:BIO|organic|ekolog)/i, confidence: 'high', reasoning: 'Explicitní zmínka certifikátu BIO' },
      { re: /\b(?:BIO|organic)\s+certifikac/i, confidence: 'high', reasoning: 'Certifikace BIO/organic' },
      { re: /\borganic\s+(?:certification|certified|farming)\b/i, confidence: 'high', reasoning: 'Organic certification (EN)' },
      { re: /\bUSDA\s+Organic\b/i, confidence: 'high', reasoning: 'USDA Organic certifikace' },

      // Medium — claim without proof
      { re: /\b(?:bio|organic)\s+olivov[ýáéeouým]/i, confidence: 'medium', reasoning: 'Popis "bio/organic olej" — ověř certifikát' },
      { re: /\bolivov[ýáéeouým]\s+(?:bio|organic)/i, confidence: 'medium', reasoning: 'Popis "olej bio/organic"' },
      { re: /\bekologick(?:é|ého|ým)\s+zeměděl/i, confidence: 'medium', reasoning: 'Ekologické zemědělství — ověř certifikát' },
      { re: /\bz\s+ekologick/i, confidence: 'medium', reasoning: 'Zmínka "z ekologického..."' },

      // Low — producer claim, not certification
      { re: /\bchemicky\s+neošetřovan/i, confidence: 'low', reasoning: 'Tvrzení "chemicky neošetřovaný" — není oficiální BIO' },
      { re: /\b(?:nejsou|není|bez)\s+chemicky\s+(?:ošetřov|přihnojov|hnojen)/i, confidence: 'low', reasoning: 'Tvrzení "nejsou chemicky ošetřovány" — není oficiální BIO' },
      { re: /\bbez\s+chemick(?:ých|ý|á|é)\s+(?:sub|post|látek|přís|ošetř)/i, confidence: 'low', reasoning: 'Tvrzení "bez chemických..." — ověř BIO certifikát' },
      { re: /\bbez\s+pesticid/i, confidence: 'low', reasoning: 'Tvrzení "bez pesticidů" — není oficiální BIO' },
      { re: /\bpřírodní\s+(?:olivov|olej)/i, confidence: 'low', reasoning: 'Marketingová fráze "přírodní" — bez důkazu' },
    ],
  },
  {
    cert: 'nyiooc',
    label: 'NYIOOC',
    patterns: [
      { re: /\bNYIOOC\b/, confidence: 'high', reasoning: 'NYIOOC zkratka nalezena' },
      { re: /\bNew\s+York\s+International\s+Olive\s+Oil/i, confidence: 'high', reasoning: 'NYIOOC plný název' },
      { re: /\b(?:Gold|Silver|Bronze)\s+(?:Award|medail)\b/i, confidence: 'medium', reasoning: 'Award zmíněn — možná NYIOOC (ověř)' },
      { re: /\bzlatá?\s+medail/i, confidence: 'low', reasoning: '"Zlatá medaile" — ověř přesný zdroj' },
    ],
  },
  {
    cert: 'demeter',
    label: 'Demeter',
    patterns: [
      { re: /\bDemeter\b/, confidence: 'high', reasoning: 'Demeter certifikát zmíněn' },
      { re: /\bbiodynamick/i, confidence: 'medium', reasoning: 'Biodynamické zemědělství — ověř Demeter' },
    ],
  },
]

function confidenceRank(c: Confidence): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1
}

/** Scan raw text and return best candidate per cert type.  */
export function detectCertificationsInText(text: string | null): CertCandidate[] {
  if (!text || text.trim().length < 20) return []
  const out: CertCandidate[] = []

  for (const group of CERT_PATTERNS) {
    let best: CertCandidate | null = null
    for (const { re, confidence, reasoning } of group.patterns) {
      const m = text.match(re)
      if (!m) continue
      const candidate: CertCandidate = {
        cert: group.cert,
        label: group.label,
        confidence,
        evidence: m[0].trim(),
        reasoning,
      }
      if (!best || confidenceRank(confidence) > confidenceRank(best.confidence)) {
        best = candidate
      }
    }
    if (best) out.push(best)
  }

  // Sort: high → medium → low
  out.sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence))
  return out
}
