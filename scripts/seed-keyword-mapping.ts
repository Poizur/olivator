/**
 * Seeds keyword_mapping table from Marketing Miner export (keywords.txt).
 * Source: 200 keywords exported from MM (379 total in UI, export limit 200).
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/seed-keyword-mapping.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

const KEYWORDS_DATA: { keyword: string; volume: number; cpc: number; competition: number | null; yoy_change: number | null }[] = [
  { keyword: 'olivový olej', volume: 2700, cpc: 4.59, competition: 10, yoy_change: 128.7 },
  { keyword: 'olivovy olej', volume: 1500, cpc: 7.31, competition: 10, yoy_change: -29.3 },
  { keyword: 'olivový olej akce', volume: 1400, cpc: 2.92, competition: 19, yoy_change: 221.7 },
  { keyword: 'řecký olivový olej', volume: 610, cpc: 2.5, competition: 0, yoy_change: 52.6 },
  { keyword: 'extra panenský olivový olej', volume: 560, cpc: 6.58, competition: 16, yoy_change: -17.4 },
  { keyword: 'olivový olej v akci', volume: 480, cpc: 4.76, competition: 20, yoy_change: 46.9 },
  { keyword: 'olivový olej na smažení', volume: 480, cpc: 1.28, competition: 15, yoy_change: -6.8 },
  { keyword: 'nejlepší řecký olivový olej', volume: 460, cpc: 4.14, competition: null, yoy_change: -26.7 },
  { keyword: 'olivový olej kréta', volume: 460, cpc: 2.82, competition: null, yoy_change: 7.1 },
  { keyword: 'olivový olej ve spreji', volume: 430, cpc: 3.52, competition: 11, yoy_change: 43.4 },
  { keyword: 'olivový olej zdravotní účinky', volume: 420, cpc: 0, competition: null, yoy_change: -26.7 },
  { keyword: 'je olivový olej zdravý', volume: 410, cpc: 1.24, competition: null, yoy_change: 26.7 },
  { keyword: 'citronový olivový olej', volume: 390, cpc: 3.52, competition: null, yoy_change: 21.1 },
  { keyword: 'kvalitní olivový olej prodej', volume: 380, cpc: 3.1, competition: null, yoy_change: 275 },
  { keyword: 'krétský olivový olej', volume: 370, cpc: 4.55, competition: null, yoy_change: null },
  { keyword: 'olivový olej kvalita', volume: 370, cpc: 0.83, competition: null, yoy_change: null },
  { keyword: 'olivový olej z pokrutin', volume: 370, cpc: 3.36, competition: 27, yoy_change: -3.5 },
  { keyword: 'olivový olej na opalování', volume: 360, cpc: 4.96, competition: null, yoy_change: -11.9 },
  { keyword: 'jaký olivový olej', volume: 340, cpc: 0, competition: null, yoy_change: -15.4 },
  { keyword: 'olivový olej extra panenský', volume: 320, cpc: 6.62, competition: 6, yoy_change: 37.3 },
  { keyword: 'domácí olivový olej', volume: 310, cpc: 4.55, competition: null, yoy_change: 6.7 },
  { keyword: 'olivový olej po ránu', volume: 310, cpc: 0, competition: null, yoy_change: 18.2 },
  { keyword: 'nejkvalitnější olivový olej', volume: 300, cpc: 2.19, competition: null, yoy_change: 26.1 },
  { keyword: 'kvalitní olivový olej', volume: 300, cpc: 6.62, competition: 0, yoy_change: 37.2 },
  { keyword: 'panenský olivový olej', volume: 300, cpc: 8.31, competition: 0, yoy_change: -19.3 },
  { keyword: 'nejlepší olivový olej', volume: 290, cpc: 4.91, competition: 13, yoy_change: -16.9 },
  { keyword: 'olivový olej zdraví', volume: 290, cpc: 0.56, competition: 20, yoy_change: 22.3 },
  { keyword: 'olivovy olej extra panensky', volume: 290, cpc: 6.62, competition: null, yoy_change: 37.3 },
  { keyword: 'extra panenský olivový olej cena', volume: 290, cpc: 4.55, competition: null, yoy_change: null },
  { keyword: 'olivový olej na vlasy', volume: 250, cpc: 0.43, competition: 19, yoy_change: -31 },
  { keyword: 'olivový olej s citronem na opalování', volume: 240, cpc: 0, competition: null, yoy_change: -30.8 },
  { keyword: 'olivový olej smažení', volume: 240, cpc: 3.1, competition: 22, yoy_change: -22.3 },
  { keyword: 'olivový olej na pleť', volume: 230, cpc: 4.96, competition: 11, yoy_change: 24.9 },
  { keyword: 'olivový olej s citronem zkušenosti', volume: 220, cpc: 6.2, competition: null, yoy_change: 80.6 },
  { keyword: 'olivový olej účinky', volume: 220, cpc: 0.45, competition: 20, yoy_change: -39.4 },
  { keyword: 'nejlepší olivový olej na světě', volume: 220, cpc: 3.52, competition: 14, yoy_change: 13.3 },
  { keyword: 'olivový olej franz josef', volume: 220, cpc: 3.52, competition: 28, yoy_change: 7.3 },
  { keyword: 'olivový olej lidl', volume: 210, cpc: 0, competition: null, yoy_change: 88.2 },
  { keyword: 'rafinovaný olivový olej', volume: 210, cpc: 4.14, competition: 13, yoy_change: -12.8 },
  { keyword: 'proti zácpě olivový olej', volume: 200, cpc: 3.1, competition: 23, yoy_change: null },
  { keyword: 'olivový olej před spaním', volume: 180, cpc: 4.55, competition: 40, yoy_change: 400 },
  { keyword: 'olivový olej cena', volume: 180, cpc: 4.76, competition: 10, yoy_change: 0.8 },
  { keyword: 'franz josef olivový olej', volume: 170, cpc: 3.31, competition: 38, yoy_change: 11.3 },
  { keyword: 'akce olivový olej', volume: 170, cpc: 3.93, competition: null, yoy_change: 43.9 },
  { keyword: 'olivový olej 5l', volume: 170, cpc: 2.69, competition: 10, yoy_change: 36.7 },
  { keyword: 'olivový olej s citronem', volume: 170, cpc: 4.96, competition: 7, yoy_change: 52.9 },
  { keyword: 'olivový olej nalačno', volume: 170, cpc: 4.76, competition: 23, yoy_change: 47.6 },
  { keyword: 'olivovy olej akce', volume: 170, cpc: 3.93, competition: null, yoy_change: null },
  { keyword: 'extra panenský olivový olej zdraví', volume: 160, cpc: 5.17, competition: 20, yoy_change: 111.4 },
  { keyword: 'olej olivový', volume: 160, cpc: 6.62, competition: null, yoy_change: 17.1 },
  { keyword: 'olivový olej na lačno', volume: 140, cpc: 5.38, competition: null, yoy_change: 215.8 },
  { keyword: 'olivový olej na vaření', volume: 140, cpc: 2.9, competition: null, yoy_change: null },
  { keyword: 'olivový olej extra virgin', volume: 140, cpc: 5.79, competition: 14, yoy_change: -13.5 },
  { keyword: 'olivový olej na tělo', volume: 130, cpc: 2.52, competition: null, yoy_change: -26.5 },
  { keyword: 'olivovy olej 5l', volume: 130, cpc: 3.93, competition: 20, yoy_change: 52.9 },
  { keyword: 'olivový olej 1l', volume: 120, cpc: 0.98, competition: null, yoy_change: 24.1 },
  { keyword: 'olivovy olej smazeni', volume: 120, cpc: 2.69, competition: 22, yoy_change: -14.3 },
  { keyword: 'olivový olej za studena lisovaný', volume: 120, cpc: 3.93, competition: null, yoy_change: 36.4 },
  { keyword: 'extra panenský olivový olej akce', volume: 120, cpc: 6.41, competition: null, yoy_change: 50 },
  { keyword: 'nejlepsi olivovy olej', volume: 120, cpc: 3.31, competition: 13, yoy_change: 22.3 },
  { keyword: 'olivovy olej zdravi', volume: 120, cpc: 0, competition: null, yoy_change: -7.2 },
  { keyword: 'olivovy olej lidl', volume: 120, cpc: 1.86, competition: 46, yoy_change: 80.5 },
  { keyword: 'olivový olej na křečové žíly', volume: 100, cpc: 3.93, competition: 45, yoy_change: 44.7 },
  { keyword: 'extra virgin olivový olej', volume: 100, cpc: 6.2, competition: 14, yoy_change: 197.4 },
  { keyword: 'extra panenský olivový olej použití', volume: 100, cpc: 4.76, competition: 22, yoy_change: 78.5 },
  { keyword: 'lidl olivový olej', volume: 80, cpc: 1.03, competition: 59, yoy_change: 30.8 },
  { keyword: 'lidl olivovy olej', volume: 80, cpc: 1.03, competition: 46, yoy_change: 30.8 },
  { keyword: 'jak skladovat olivový olej', volume: 80, cpc: 0, competition: null, yoy_change: 16.7 },
  { keyword: 'olivový olej kalorie', volume: 70, cpc: 0, competition: null, yoy_change: 45.9 },
  { keyword: 'nádoba na olivový olej', volume: 70, cpc: 2.48, competition: null, yoy_change: 63 },
  { keyword: 'olivový olej do ucha', volume: 70, cpc: 0, competition: 40, yoy_change: 18.3 },
  { keyword: 'monini olivový olej', volume: 70, cpc: 3.31, competition: 29, yoy_change: 49.1 },
  { keyword: 'jak používat olivový olej', volume: 60, cpc: 0, competition: null, yoy_change: 50 },
  { keyword: 'nefiltrovany olivovy olej', volume: 60, cpc: 3.53, competition: null, yoy_change: 5.5 },
  { keyword: 'olivový olej a citron', volume: 60, cpc: 5.17, competition: null, yoy_change: 94.7 },
  { keyword: 'lahev na olivový olej', volume: 60, cpc: 2.48, competition: null, yoy_change: 45.1 },
  { keyword: 'jaký olivový olej je nejlepší', volume: 60, cpc: 7.65, competition: null, yoy_change: null },
  { keyword: 'bio olivovy olej', volume: 60, cpc: 4.01, competition: null, yoy_change: -2.8 },
  { keyword: 'nefiltrovaný olivový olej', volume: 60, cpc: 2.69, competition: null, yoy_change: 65.9 },
  { keyword: 'bio olivový olej', volume: 60, cpc: 7.03, competition: 4, yoy_change: 23.6 },
  { keyword: 'hořký olivový olej', volume: 60, cpc: 0, competition: 1, yoy_change: null },
  { keyword: 'olivový olej albert', volume: 50, cpc: 0.83, competition: null, yoy_change: 12.1 },
  { keyword: 'olivový olej kaufland', volume: 50, cpc: 2.07, competition: null, yoy_change: 27.1 },
  { keyword: 'olivový olej monini', volume: 50, cpc: 2.9, competition: null, yoy_change: 50 },
  { keyword: 'minerva olivový olej', volume: 50, cpc: 3.93, competition: null, yoy_change: 41.5 },
  { keyword: 'minerva olivovy olej', volume: 50, cpc: 3.93, competition: null, yoy_change: 41.5 },
  { keyword: 'albert olivovy olej', volume: 40, cpc: 0.67, competition: null, yoy_change: 12.5 },
  { keyword: 'konvička na olivový olej', volume: 40, cpc: 2.07, competition: null, yoy_change: 72.4 },
  { keyword: 'olivový olej na křečové žíly diskuze', volume: 40, cpc: 3.52, competition: null, yoy_change: 34.2 },
  { keyword: 'albert olivový olej', volume: 40, cpc: 0.83, competition: null, yoy_change: 6.2 },
  { keyword: 'olivový olej pomace', volume: 40, cpc: 3.93, competition: null, yoy_change: 6.2 },
  { keyword: 'olivovy olej test', volume: 40, cpc: 2.07, competition: null, yoy_change: null },
  { keyword: 'olivový olej použití', volume: 40, cpc: 4.14, competition: null, yoy_change: -41.1 },
  { keyword: 'extra virgin olivovy olej', volume: 40, cpc: 5.24, competition: null, yoy_change: -42 },
  { keyword: 'olivový olej nutriční hodnoty', volume: 40, cpc: 0, competition: null, yoy_change: 11.6 },
  { keyword: 'italský olivový olej', volume: 40, cpc: 2.69, competition: null, yoy_change: 46.9 },
  { keyword: 'kreolis olivový olej', volume: 40, cpc: 4.76, competition: null, yoy_change: 20.5 },
  { keyword: 'olivovy olej pomace', volume: 40, cpc: 0.76, competition: null, yoy_change: 2.3 },
  { keyword: 'olivový olej lisovaný za studena', volume: 40, cpc: 4.14, competition: null, yoy_change: null },
  { keyword: 'očista jater olivový olej citron', volume: 30, cpc: 7.24, competition: null, yoy_change: 215.4 },
  { keyword: 'dtest olivový olej', volume: 30, cpc: 3.1, competition: null, yoy_change: 13.9 },
  { keyword: 'olivový olej hubnutí', volume: 30, cpc: 5.58, competition: null, yoy_change: -6.8 },
  { keyword: 'olivový olej minerva', volume: 30, cpc: 4.14, competition: null, yoy_change: 14.3 },
  { keyword: 'billa olivovy olej', volume: 30, cpc: 0.56, competition: null, yoy_change: 8.1 },
  { keyword: 'řecký olivový olej 5l', volume: 30, cpc: 4.55, competition: null, yoy_change: 22.6 },
  { keyword: 'španělský olivový olej', volume: 30, cpc: 3.93, competition: null, yoy_change: 18.8 },
  { keyword: 'olivový olej kcal', volume: 30, cpc: 0, competition: null, yoy_change: 100 },
  { keyword: 'olivový olej vitamíny', volume: 30, cpc: 3.31, competition: null, yoy_change: 42.3 },
  { keyword: 'olivový olej na vrásky', volume: 30, cpc: 4.14, competition: null, yoy_change: -2.6 },
  { keyword: 'olivovy olej na vrasky', volume: 30, cpc: 4.14, competition: null, yoy_change: -2.6 },
  { keyword: 'olivový olej účinky na pleť', volume: 30, cpc: 5.38, competition: null, yoy_change: -24.4 },
  { keyword: 'primadonna extra panenský olivový olej delicato', volume: 30, cpc: 0, competition: null, yoy_change: 200 },
  { keyword: 'citron a olivový olej', volume: 30, cpc: 9.31, competition: null, yoy_change: -7.7 },
  { keyword: 'extra panenský olivový olej lisovaný za studena', volume: 30, cpc: 4.55, competition: null, yoy_change: 140 },
  { keyword: 'olivový olej složení', volume: 30, cpc: 3.7, competition: null, yoy_change: 33.3 },
  { keyword: 'olivový olej s chilli', volume: 30, cpc: 4.14, competition: null, yoy_change: 24.1 },
  { keyword: 'olivový olej místo krému', volume: 30, cpc: 0, competition: null, yoy_change: 9.1 },
  { keyword: 'olivový olej vlasy', volume: 30, cpc: 0, competition: null, yoy_change: 5.9 },
  { keyword: 'borges olivový olej', volume: 30, cpc: 1.03, competition: null, yoy_change: 59.1 },
  { keyword: 'olivový olej na vlasy doma', volume: 30, cpc: 0, competition: null, yoy_change: 45.8 },
  { keyword: 'olivový olej s bazalkou', volume: 30, cpc: 2.69, competition: null, yoy_change: 25 },
  { keyword: 'tesco olivový olej', volume: 30, cpc: 0, competition: null, yoy_change: 54.5 },
  { keyword: 'tesco olivovy olej', volume: 30, cpc: 0, competition: null, yoy_change: 54.5 },
  { keyword: 'prošlý olivový olej', volume: 30, cpc: 0, competition: null, yoy_change: 17.9 },
  { keyword: 'extra panenský olivový olej lidl', volume: 30, cpc: 0, competition: null, yoy_change: 153.8 },
  { keyword: 'olivovy olej na lacno ucinky', volume: 30, cpc: 0, competition: null, yoy_change: 153.8 },
  { keyword: 'olivový olej na pečení', volume: 30, cpc: 3.31, competition: null, yoy_change: 73.7 },
  { keyword: 'olivový olej na řasy', volume: 30, cpc: 0, competition: null, yoy_change: 25.9 },
  { keyword: 'olivový olej na vlasy diskuze', volume: 30, cpc: 0, competition: null, yoy_change: 22.2 },
  { keyword: 'maska na vlasy olivový olej', volume: 30, cpc: 3.5, competition: null, yoy_change: -2.9 },
  { keyword: 'olivový olej na obličej', volume: 30, cpc: 7.24, competition: null, yoy_change: -19.5 },
  { keyword: 'la espanola olivovy olej', volume: 30, cpc: 4.34, competition: null, yoy_change: 128.6 },
  { keyword: 'extra panenský olivový olej smažení', volume: 30, cpc: 6.66, competition: null, yoy_change: 88.2 },
  { keyword: 'olivový olej borges', volume: 30, cpc: 2.9, competition: null, yoy_change: null },
  { keyword: 'jak poznat kvalitní olivový olej', volume: 30, cpc: 1.86, competition: null, yoy_change: 40.9 },
  { keyword: 'zálivka na salát olivový olej', volume: 30, cpc: 0, competition: null, yoy_change: -31.1 },
  { keyword: 'olivový olej tesco', volume: 30, cpc: 0, competition: null, yoy_change: 19.2 },
  { keyword: 'olivovy olej tesco', volume: 30, cpc: 0, competition: null, yoy_change: 19.2 },
  { keyword: 'billa olivový olej', volume: 20, cpc: 0.6, competition: null, yoy_change: 87.5 },
  { keyword: 'olivový olej billa', volume: 20, cpc: 0.62, competition: null, yoy_change: 76.5 },
  { keyword: 'ballester olivový olej recenze', volume: 20, cpc: 0, competition: null, yoy_change: 625 },
  { keyword: 'kaufland olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 70.6 },
  { keyword: 'co obsahuje olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 70.6 },
  { keyword: 'olivový olej sprej', volume: 20, cpc: 0, competition: null, yoy_change: 383.3 },
  { keyword: 'olivový olej na pleť diskuze', volume: 20, cpc: 0, competition: null, yoy_change: 45 },
  { keyword: 'olivový olej franz josef akce', volume: 20, cpc: 0, competition: null, yoy_change: 45 },
  { keyword: 'doza na olivovy olej', volume: 20, cpc: 0, competition: null, yoy_change: 45 },
  { keyword: 'olivový olej pleť', volume: 20, cpc: 0, competition: null, yoy_change: 16 },
  { keyword: 'jaký olivový olej na smažení', volume: 20, cpc: 1.1, competition: null, yoy_change: 100 },
  { keyword: 'terra creta olivový olej', volume: 20, cpc: 3.72, competition: null, yoy_change: -20 },
  { keyword: 'olivový olej z pokrutin na smažení', volume: 20, cpc: 4.76, competition: null, yoy_change: 80 },
  { keyword: 'olivovy olej kcal', volume: 20, cpc: 0, competition: null, yoy_change: 58.8 },
  { keyword: 'olivový olej do vlasů', volume: 20, cpc: 0, competition: null, yoy_change: 23.8 },
  { keyword: 'ondoliva olivový olej', volume: 20, cpc: 0.77, competition: null, yoy_change: 8.7 },
  { keyword: 'kupi olivovy olej', volume: 20, cpc: 0, competition: null, yoy_change: 71.4 },
  { keyword: 'pokrutiny olivový olej', volume: 20, cpc: 3.72, competition: null, yoy_change: 41.2 },
  { keyword: 'olivový olej primadonna lidl', volume: 20, cpc: 0, competition: null, yoy_change: 118.2 },
  { keyword: 'ochucený olivový olej', volume: 20, cpc: 5.53, competition: null, yoy_change: 50 },
  { keyword: 'olivový olej cholesterol', volume: 20, cpc: 0, competition: null, yoy_change: 14.3 },
  { keyword: 'olivový olej a zdraví', volume: 20, cpc: 0.83, competition: null, yoy_change: 14.3 },
  { keyword: 'primadonna olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 53.3 },
  { keyword: 'ballester extra panenský olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 15 },
  { keyword: 'olivový olej na nehty', volume: 20, cpc: 0, competition: null, yoy_change: 76.9 },
  { keyword: 'olivový olej kupi', volume: 20, cpc: 0, competition: null, yoy_change: 53.3 },
  { keyword: 'extra panensky olivovy olej', volume: 20, cpc: 4.55, competition: 6, yoy_change: -11.5 },
  { keyword: 'žluklý olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 37.5 },
  { keyword: 'olivový olej ve spreji lidl', volume: 20, cpc: 5.38, competition: null, yoy_change: 133.3 },
  { keyword: 'olivový olej san fabio recenze', volume: 20, cpc: 0, competition: null, yoy_change: 75 },
  { keyword: 'latzimas olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 75 },
  { keyword: 'olivový olej sleva', volume: 20, cpc: 0, competition: null, yoy_change: 69.2 },
  { keyword: 'olivový olej san fabio', volume: 20, cpc: 0, competition: null, yoy_change: 57.1 },
  { keyword: 'olivový olej ondoliva', volume: 20, cpc: 2.69, competition: null, yoy_change: 46.7 },
  { keyword: 'olivový olej výroba', volume: 20, cpc: 0, competition: null, yoy_change: 40 },
  { keyword: 'olivový olej s lanýži', volume: 20, cpc: 3.72, competition: null, yoy_change: 22.2 },
  { keyword: 'smažení olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 5 },
  { keyword: 'olivový olej franz josef recenze', volume: 20, cpc: 3.52, competition: null, yoy_change: 5 },
  { keyword: 'olivový olej na akné', volume: 20, cpc: 7.86, competition: null, yoy_change: -4.3 },
  { keyword: 'bertolli olivový olej', volume: 20, cpc: 0, competition: null, yoy_change: 5.3 },
  { keyword: 'extra panenský olivový olej 5l', volume: 20, cpc: 89.56, competition: null, yoy_change: 66.7 },
  { keyword: 'olivový olej primadonna', volume: 20, cpc: 0, competition: null, yoy_change: 42.9 },
  { keyword: 'olivový olej panenský', volume: 20, cpc: 6.41, competition: null, yoy_change: 25 },
  { keyword: 'olivový olej z kréty', volume: 20, cpc: 2.9, competition: null, yoy_change: 17.6 },
  { keyword: 'makro olivový olej', volume: 20, cpc: 1.24, competition: null, yoy_change: 11.1 },
  { keyword: 'chorvatský olivový olej', volume: 20, cpc: 65.77, competition: null, yoy_change: 5.3 },
  { keyword: 'olivový olej recenze', volume: 20, cpc: 3.31, competition: null, yoy_change: 5.3 },
  { keyword: 'costa d oro olivový olej', volume: 20, cpc: 1.86, competition: null, yoy_change: 58.3 },
  { keyword: 'pomace olivovy olej', volume: 20, cpc: 0, competition: null, yoy_change: -17.4 },
  { keyword: 'olivový olej jako lubrikant', volume: 20, cpc: 0, competition: null, yoy_change: 18.8 },
  { keyword: 'monini olivový olej akce', volume: 20, cpc: 2.69, competition: null, yoy_change: 38.5 },
  { keyword: 'karafa na olivový olej', volume: 20, cpc: 2.9, competition: null, yoy_change: 12.5 },
  { keyword: 'olivový olej do koupele', volume: 20, cpc: 4.76, competition: null, yoy_change: 20 },
  { keyword: 'olivový olej pro miminka', volume: 20, cpc: 0, competition: null, yoy_change: null },
  { keyword: 'olivový olej na zuby', volume: 20, cpc: 0, competition: null, yoy_change: -5.3 },
  { keyword: 'kalamata olivový olej', volume: 10, cpc: 3.72, competition: null, yoy_change: 30.8 },
  { keyword: 'monini classico extra panenský olivový olej', volume: 10, cpc: 9.31, competition: null, yoy_change: 30.8 },
  { keyword: 'kurkuma pepř olivový olej', volume: 10, cpc: 0, competition: null, yoy_change: 21.4 },
  { keyword: 'ballester olivový olej', volume: 10, cpc: 2.54, competition: null, yoy_change: 13.3 },
  { keyword: 'aristeon olivový olej', volume: 10, cpc: 5.17, competition: null, yoy_change: 6.2 },
  { keyword: 'zmrzlý olivový olej', volume: 10, cpc: 0, competition: null, yoy_change: -10.5 },
  { keyword: 'olivový olej kalamata', volume: 10, cpc: 8.27, competition: null, yoy_change: 41.7 },
]

function detectIntent(keyword: string): string {
  const lower = keyword.toLowerCase()
  if (lower.includes('akce') || lower.includes('sleva') || lower.includes('koupit') ||
      lower.includes('cena') || lower.includes('prodej')) return 'commercial'
  const brands = ['lidl', 'tesco', 'monini', 'borges', 'bertolli', 'franz josef', 'kaufland',
                  'albert', 'billa', 'costa d oro', 'minerva', 'primadonna', 'ballester',
                  'ondoliva', 'latzimas', 'kreolis', 'aristeon', 'terra creta', 'la espanola',
                  'san fabio', 'makro', 'kupi']
  if (brands.some(b => lower.includes(b))) return 'navigational'
  if (lower.includes('jak ') || lower.includes('co je') || lower.includes('proč') ||
      lower.startsWith('je ') || lower.includes('účinky') || lower.includes('zdrav') ||
      lower.includes('dtest') || lower.includes('recenze') || lower.includes('zkušenosti') ||
      lower.includes('kalorie') || lower.includes('kcal') || lower.includes('vitamín') ||
      lower.includes('složení') || lower.includes('nutriční') || lower.includes('hubnut') ||
      lower.includes('cholesterol') || lower.includes('použití')) return 'informational'
  return 'informational'
}

function detectCluster(keyword: string): string {
  const lower = keyword.toLowerCase()
  if (lower.includes('řeck') || lower.includes('recky') || lower.includes('krét') ||
      lower.includes('kret') || lower.includes('kalamata')) return 'regional_GR'
  if (lower.includes('italsk')) return 'regional_IT'
  if (lower.includes('španělsk') || lower.includes('chorvatsk')) return 'regional_ES'
  if (lower.includes('lidl') || lower.includes('primadonna')) return 'brand_lidl'
  if (lower.includes('tesco')) return 'brand_tesco'
  if (lower.includes('monini')) return 'brand_monini'
  if (lower.includes('borges') || lower.includes('ballester') || lower.includes('la espanola')) return 'brand_es'
  if (lower.includes('bertolli')) return 'brand_bertolli'
  if (lower.includes('franz josef')) return 'brand_franz_josef'
  if (lower.includes('kaufland')) return 'brand_kaufland'
  if (lower.includes('albert')) return 'brand_albert'
  if (lower.includes('billa')) return 'brand_billa'
  if (lower.includes('minerva') || lower.includes('ondoliva') || lower.includes('costa d oro')) return 'brand_other'
  if (lower.includes('akce') || lower.includes('sleva')) return 'commercial_akce'
  if (lower.includes('smažen') || lower.includes('smazeni') || lower.includes('vaření') ||
      lower.includes('vareni') || lower.includes('pečení')) return 'use_cooking'
  if (lower.includes('pleť') || lower.includes('vlas') || lower.includes('opalován') ||
      lower.includes('nehty') || lower.includes('řasy') || lower.includes('obličej') ||
      lower.includes('vrásky') || lower.includes('akné') || lower.includes('kůži')) return 'use_skincare'
  if (lower.includes('zdrav') || lower.includes('účinky') || lower.includes('cholesterol') ||
      lower.includes('hubnut') || lower.includes('kcal') || lower.includes('kalorie') ||
      lower.includes('vitamín') || lower.includes('zácpa') || lower.includes('játr')) return 'health'
  if (lower.includes('sprej') || lower.includes('spreji')) return 'product_spray'
  if (lower.includes('5l') || lower.includes('1l') || lower.includes('plech')) return 'product_volume'
  if (lower.includes('bio')) return 'product_bio'
  if (lower.includes('extra panensk') || lower.includes('panenský') || lower.includes('extra virgin') ||
      lower.includes('pokrutin') || lower.includes('pomace') || lower.includes('rafinovan')) return 'product_type'
  if (lower.includes('nádoba') || lower.includes('lahev') || lower.includes('konvička') ||
      lower.includes('karafa') || lower.includes('dóza') || lower.includes('doza')) return 'product_container'
  if (lower.includes('recenze') || lower.includes('zkušenosti') || lower.includes('dtest') ||
      lower.includes('test') || lower.includes('nejlepší') || lower.includes('nejlepsi') ||
      lower.includes('kvalit')) return 'comparison'
  return 'general'
}

function calculatePriority(volume: number, intent: string): number {
  const multiplier: Record<string, number> = { commercial: 1.5, navigational: 1.3, informational: 1.0 }
  const score = volume * (multiplier[intent] ?? 1.0)
  if (score > 2000) return 5
  if (score > 500) return 4
  if (score > 200) return 3
  if (score > 50) return 2
  return 1
}

async function main() {
  let inserted = 0, failed = 0

  for (const kw of KEYWORDS_DATA) {
    const intent = detectIntent(kw.keyword)
    const cluster = detectCluster(kw.keyword)
    const priority = calculatePriority(kw.volume, intent)

    const { error } = await supabaseAdmin
      .from('keyword_mapping')
      .upsert({
        keyword: kw.keyword,
        search_volume: kw.volume,
        cpc_czk: kw.cpc ?? 0,
        competition_score: kw.competition ?? null,
        yoy_change_pct: kw.yoy_change ?? null,
        intent,
        cluster_group: cluster,
        priority,
        status: 'unmapped',
      }, { onConflict: 'keyword' })

    if (error) { console.error(`FAIL: ${kw.keyword}`, error.message); failed++ }
    else inserted++
  }

  const { count } = await supabaseAdmin.from('keyword_mapping').select('*', { count: 'exact', head: true })
  console.log(`Done — upserted: ${inserted}, failed: ${failed}, total in DB: ${count}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
