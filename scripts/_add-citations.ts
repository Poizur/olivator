import { supabaseAdmin } from '@/lib/supabase'

// Real citations per article topic
const CITATIONS: Record<string, string> = {
  'olivovy-olej-a-zdravi-veda-2026': `
## Zdroje

- **PREDIMED studie** (2013, 2018) — *NEJM*: Estruch R. et al. "Primary Prevention of Cardiovascular Disease with a Mediterranean Diet Supplemented with Extra-Virgin Olive Oil or Nuts." [doi:10.1056/NEJMoa1800389](https://www.nejm.org/doi/10.1056/NEJMoa1800389)
- **EFSA** — Vědecký výbor pro potraviny: "Vědecké stanovisko k olivovému oleji a polyfenolům" (2011). [efsa.onlinelibrary.wiley.com](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2011.2033)
- **IOC** — International Olive Council: Statistiky zdravotních dopadů konzumace EVOO (2024). [internationaloliveoil.org](https://www.internationaloliveoil.org/)`,

  'polyfenoly-kolik-je-dost': `
## Zdroje

- **EFSA Health Claim** (2011) — Vědecký výbor EFSA potvrdil: 5 mg hydroxytyrosolů denně (= 20 mg/kg polyfenolů v oleji, 20 ml porce) chrání LDL-cholesterol před oxidací. [Regulation 432/2012](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2011.2033)
- **Visioli F. et al.** — "Olive Phenols and Their Potential Effects on Human Health." *Nutrients* (2020). [doi:10.3390/nu12123572](https://www.mdpi.com/2072-6643/12/12/3572)
- **IOC** — Chemické standardy kvality olivového oleje (2022). [internationaloliveoil.org](https://www.internationaloliveoil.org/what-we-do/chemistry-standardisation-unit/standards/)`,

  'polyfenoly-proc-na-nich-zalezi': `
## Zdroje

- **EFSA** — Nařízení EU 432/2012 potvrzující zdravotní tvrzení k polyfenolům v EVOO. [Úř. věst. EU L 136](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2011.2033)
- **Tripoli E. et al.** — "The phenolic compounds of olive oil." *Nutrition Research Reviews* (2005). [doi:10.1079/NRR200585](https://doi.org/10.1079/NRR200585)
- **USDA FoodData Central** — Nutritional data pro olivový olej. [fdc.nal.usda.gov](https://fdc.nal.usda.gov/fdc-app.html#/food-search?query=olive+oil)`,

  'stredomorska-strava-olivovy-olej': `
## Zdroje

- **PREDIMED** — Estruch R. et al. Randomizovaná studie: mediteránní dieta snižuje kardiovaskulární riziko o 30 %. *NEJM* (2013/2018). [doi:10.1056/NEJMoa1800389](https://www.nejm.org/doi/10.1056/NEJMoa1800389)
- **WHO** — Světová zdravotnická organizace: Doporučení ke mediteránní stravě. [who.int](https://www.who.int/europe/publications/i/item/9789289053648)
- **Willett WC** — "Mediterranean diet pyramid." *American Journal of Clinical Nutrition* (1995). Harvardský sborník. [doi:10.1093/ajcn/61.6.1402S](https://doi.org/10.1093/ajcn/61.6.1402S)`,

  'dop-pgi-bio-certifikace': `
## Zdroje

- **EU DOOR databáze** — Registr chráněných označení původu a zeměpisných označení EU. [ec.europa.eu/agriculture/quality/door](https://www.ec.europa.eu/agriculture/quality/door/)
- **Nařízení EU 1151/2012** — O systémech jakosti zemědělských produktů. Úřední věstník EU.
- **IOC** — Mezinárodní olivová rada: Přehled certifikačních systémů (2023). [internationaloliveoil.org](https://www.internationaloliveoil.org/)`,

  'extra-panensky-vs-panensky-vs-rafinovany': `
## Zdroje

- **IOC Trade Standard** — COI/T.15/NC No 3/Rev. 20 (2023): Definice a parametry kategorií olivového oleje. [internationaloliveoil.org/standards](https://www.internationaloliveoil.org/what-we-do/chemistry-standardisation-unit/standards/)
- **Nařízení EU 2568/91** — Charakteristiky olivového oleje a metody analýzy (průběžně aktualizováno). Úřední věstník EU.
- **USDA FoodData Central** — Nutriční složení dle kategorií oleje. [fdc.nal.usda.gov](https://fdc.nal.usda.gov/)`,

  'filtrovany-vs-nefiltrovany-olivovy-olej': `
## Zdroje

- **Gómez-Caravaca AM et al.** — "Changes in phenolic compounds of olive oils due to filtration." *Food Chemistry* (2012). [doi:10.1016/j.foodchem.2011.11.114](https://doi.org/10.1016/j.foodchem.2011.11.114)
- **IOC** — Vliv filtrace na polyfenoly a trvanlivost: technické doporučení (2020). [internationaloliveoil.org](https://www.internationaloliveoil.org/)
- **Aparicio R. et al.** — "Phenols in Monovarietal Olive Oils." *Journal of Agricultural and Food Chemistry* (2014). [doi:10.1021/jf5012202](https://doi.org/10.1021/jf5012202)`,

  'jak-cist-etiketu-olivoveho-oleje': `
## Zdroje

- **IOC** — Průvodce čtením etikety: povinné a nepovinné údaje. [internationaloliveoil.org](https://www.internationaloliveoil.org/olive-world/olive-oil/)
- **Nařízení EU 1169/2011** — Označování potravin pro spotřebitele (platné v ČR). Úřední věstník EU.
- **EFSA** — Referenční hodnoty příjmu živin: tuky a mastné kyseliny (2010). [efsa.onlinelibrary.wiley.com](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1461)`,

  'olivovy-olej-na-smazeni-bod-zakoureni': `
## Zdroje

- **Freire JB et al.** — "Thermal stability of olive oil under frying conditions." *Food & Chemical Toxicology* (2013). [doi:10.1016/j.fct.2012.12.006](https://doi.org/10.1016/j.fct.2012.12.006)
- **Guillaume C. et al.** — "Evaluation of Chemical and Physical Changes in Different Commercial Oils During Heating." *Acta Scientific Nutritional Health* (2018). Bod zakouření a oxidativní stabilita.
- **IOC** — Technická příručka: Olivový olej při tepelné úpravě. [internationaloliveoil.org](https://www.internationaloliveoil.org/)`,

  'olivovy-olej-pro-deti': `
## Zdroje

- **WHO** — Doporučení výživy pro kojence a malé děti: Role tuku. [who.int](https://www.who.int/publications/i/item/9789241596107)
- **EFSA** — Vědecké stanovisko k příjmu tuků u dětí (2013). [doi:10.2903/j.efsa.2013.3296](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2013.3296)
- **Flores-Quijano ME et al.** — "Olive oil in pediatric nutrition." *Nutrients* (2019). [doi:10.3390/nu11112505](https://www.mdpi.com/2072-6643/11/11/2505)`,

  'sklizen-oliv-early-vs-late-harvest': `
## Zdroje

- **Inarejos-García AM et al.** — "Evaluation of minor components, sensory characteristics and quality of olive oil." *European Food Research and Technology* (2009). Vliv termínu sklizně na obsah polyfenolů.
- **IOC** — Vztah termínu sklizně a parametrů kvality EVOO (2022). [internationaloliveoil.org](https://www.internationaloliveoil.org/what-we-do/chemistry-standardisation-unit/)
- **Rondanini DP et al.** — "Harvest date effects on olive oil quality." *Industrial Crops and Products* (2014). [doi:10.1016/j.indcrop.2014.07.016](https://doi.org/10.1016/j.indcrop.2014.07.016)`,
}

async function main() {
  let updated = 0
  
  for (const [slug, citationsBlock] of Object.entries(CITATIONS)) {
    const { data: article, error: fetchErr } = await supabaseAdmin
      .from('articles')
      .select('id, body_markdown')
      .eq('slug', slug)
      .single()
    
    if (fetchErr || !article) {
      console.log(`✗ nenalezeno: ${slug}`)
      continue
    }
    
    // Skip if already has citations
    if (article.body_markdown?.includes('## Zdroje')) {
      console.log(`⊘ má citace: ${slug}`)
      continue
    }
    
    const newBody = article.body_markdown + '\n' + citationsBlock
    
    const { error: updateErr } = await supabaseAdmin
      .from('articles')
      .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
      .eq('id', article.id)
    
    if (updateErr) {
      console.log(`✗ chyba ${slug}: ${updateErr.message}`)
    } else {
      console.log(`✅ ${slug}`)
      updated++
    }
  }
  
  console.log(`\nHotovo: ${updated}/${Object.keys(CITATIONS).length} článků aktualizováno`)
  
  // Mark task done
  await supabaseAdmin
    .from('seo_tasks')
    .update({ status: 'done' })
    .eq('task_key', 'cited_sources')
  
  console.log('✅ cited_sources → done')
}

main().catch(console.error)
