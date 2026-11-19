// Redakční pravidla CLAUDE.md §16/§25/§26 jako jedna sada regexů pro všechny zápisy veřejného textu
// (Olík, newsletter, generátory popisů/FAQ/entit, admin editor článků, executor).

export const HEALTH_RE =
  /(léč|\blék(?!ař)|vyléč|uzdrav|prevenc|předcház|chrání\s+před|snižuj\w*\s+(riziko|cholesterol|tlak|LDL)|cholesterol|rakovin|nádor|srdc|srdeční|kardio|cukrovk|diabet|imunit|zánět|detox|antioxida|omlaz|hubnut|zdravotní\w*\s+(účin|benefit|přínos|vlastnost|bonus)|zdraví\s+prospěšn|prospěšn\w*\s+(pro\s+zdraví|účin)|blahodárn|ibuprofen|nejzdravější|skvěl\w+\s+pro\s+zdraví|pro\s+zdravotní|health\s+claim)/i

// Věty, které zdravotní slova používají přípustně: negace, doslovné tvrzení 432/2012, citace studie.
export const ALLOWED_HEALTH_RE =
  /((není|nemá|nejsou|nesmí\w*|netvrd\w*|nelze|neslibuj\w*|neuvád\w*|nehodnot\w*|neřad\w*)\s.{0,80}(léč|lék|účin|tvrzení|zdrav)|není\s+lék|nenahrazuje\s+léčbu|ochran[ěy]\s+krevních\s+lipidů\s+před\s+oxidativním\s+stresem|432\/2012|hydroxytyrosol|autoři\s+(pozorovali|uvádějí|popsali|sledovali)|\bet\s+al\.?,?\s+\d{4}|\(\w[\w\s&]*,?\s+\d{4}\))/i

// Olivátor netestuje — hodnotí podle deklarovaných dat. Počty katalogu patří do tokenu {{products.count}}, ne natvrdo.
export const TESTING_CLAIM_RE = /(otestovali\s+jsme|testovali\s+jsme|testujeme\s+olej|test\s+olivových\s+olejů|jak\s+(jsme\s+)?testujeme|v\s+našem\s+testu|v\s+naší\s+laborato|naše\s+laborato)/i
export const HARD_COUNT_RE = /(?:^|[^\p{L}\d])(?:přes|více\s+než|celkem)?\s*(?:[5-9]\d|\d{3,4})\+?\s*(?:olivových\s+)?olej(?:ů|e)(?!\p{L})/iu

const SPLIT_RE = /(?<=[.!?…])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„"(])|\n+/

export function splitSentences(text: string): string[] {
  return text
    .replace(/<[^>]+>/g, ' ')
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** První věta se zdravotním tvrzením mimo povolené výjimky, nebo null. */
export function findHealthClaim(text: string): string | null {
  for (const s of splitSentences(text)) {
    if (HEALTH_RE.test(s) && !ALLOWED_HEALTH_RE.test(s)) return s
  }
  return null
}

export interface EditorialIssue {
  rule: 'health_claim' | 'testing_claim' | 'hard_count'
  sentence: string
}

/** Všechna porušení §26 (zdraví), tvrzení o testování a počtů katalogu natvrdo. */
export function findEditorialIssues(text: string): EditorialIssue[] {
  const issues: EditorialIssue[] = []
  for (const s of splitSentences(text)) {
    if (HEALTH_RE.test(s) && !ALLOWED_HEALTH_RE.test(s)) issues.push({ rule: 'health_claim', sentence: s })
    if (TESTING_CLAIM_RE.test(s)) issues.push({ rule: 'testing_claim', sentence: s })
    if (HARD_COUNT_RE.test(s) && !/\{\{products\.count\}\}/.test(s)) issues.push({ rule: 'hard_count', sentence: s })
  }
  return issues
}

export function formatEditorialIssues(issues: EditorialIssue[]): string {
  const label: Record<EditorialIssue['rule'], string> = {
    health_claim: 'zdravotní tvrzení (§26)',
    testing_claim: 'tvrzení o testování (Olivátor netestuje)',
    hard_count: 'počet olejů natvrdo (použij {{products.count}})',
  }
  return issues.map((i) => `${label[i.rule]}: „${i.sentence.slice(0, 140)}“`).join('; ')
}
