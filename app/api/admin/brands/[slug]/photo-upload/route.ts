// Brand photo upload — section-based, server-side WebP konverze + Vision alt.
//
// POST /api/admin/brands/[slug]/photo-upload
// multipart: file, section ('logo'|'hero'|'editorial'|'gallery'), sectionIndex?,
//            sectionTitle? (text kontextu pro Vision alt), replaceExisting?
//
// Server pipeline:
//   1. Validace MIME + size
//   2. sharp: resize 1920w + WebP 85 + strip EXIF
//   3. Slug filename: brand-slug-section-N.webp
//   4. Upload do Supabase Storage 'entities' bucket
//   5. Vision API: alt z fotky + section context (ne generic "obrázek")
//   6. Pokud replaceExisting + section unique (logo/hero/editorial s index):
//        deaktivuje předchozí entity_image této sekce
//   7. Insert/update entity_images s image_role + sort_order

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { processImage, buildPhotoFilename } from '@/lib/image-processor'
import { callClaude } from '@/lib/anthropic'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BUCKET = 'entities'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB upload limit

const SUPPORTED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic'])

const VALID_SECTIONS = new Set(['logo', 'hero', 'editorial', 'gallery'])

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
  }
}

// sort_order konvence:
//   0:    logo
//   1:    hero
//   10+i: editorial section i (0-based)
//   100+: gallery
function sortOrderFor(section: string, index: number | null): number {
  if (section === 'logo') return 0
  if (section === 'hero') return 1
  if (section === 'editorial') return 10 + (index ?? 0)
  // gallery — nepřepisujeme, voláme dynamicky podle existujících
  return 100 + (index ?? 0)
}

interface AltGenContext {
  brandName: string
  section: string
  sectionTitle: string | null
  imageBase64: string
  mediaType: string
}

async function generateAlt(ctx: AltGenContext): Promise<string | null> {
  const sectionDescription: Record<string, string> = {
    logo: 'logo značky',
    hero: 'velký hero obrázek na vrchu detailu značky',
    editorial: ctx.sectionTitle
      ? `editorial fotka k textu "${ctx.sectionTitle}"`
      : 'editorial fotka v textu',
    gallery: 'fotka v atmosférické galerii',
  }
  const role = sectionDescription[ctx.section] ?? 'fotka'

  const systemPrompt = `Jsi SEO asistent. Píšeš alt text pro obrázek na webu Olivator.cz
(srovnávač olivových olejů). Alt text:
- 1 věta v ČEŠTINĚ, max 120 znaků
- popisuje co je na fotce + kontext sekce
- žádné "obrázek značky" / "fotka" — buď konkrétní (krajina, lis, zakladatel)
- žádné keyword stuffing

Vrátí pouze samotný alt text, žádné uvozovky ani vysvětlení.`

  const userText = `Značka: ${ctx.brandName}
Pozice fotky na stránce: ${role}
Popiš co vidíš v 1 SEO-friendly větě (max 120 znaků).`

  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: ctx.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: ctx.imageBase64,
              },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
    })
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join(' ')
      .trim()
    if (!text) return null
    // Strip uvozovky, max 200 chars
    return text.replace(/^["']|["']$/g, '').slice(0, 200)
  } catch (err) {
    console.warn('[brand photo-upload] alt gen failed:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await params

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const section = (formData.get('section') as string | null) ?? 'gallery'
  const sectionIndexStr = formData.get('sectionIndex') as string | null
  const sectionTitle = (formData.get('sectionTitle') as string | null)?.trim() || null

  if (!file) {
    return NextResponse.json({ error: 'file je povinný' }, { status: 400 })
  }
  if (!VALID_SECTIONS.has(section)) {
    return NextResponse.json({ error: `Neznámá section "${section}"` }, { status: 400 })
  }
  if (!file.type.startsWith('image/') || !SUPPORTED_INPUT_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Nepodporovaný formát: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Maximální velikost je 10 MB' }, { status: 400 })
  }

  const sectionIndex = sectionIndexStr ? Number(sectionIndexStr) : null

  // Načti brand
  const { data: brand, error: brandErr } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()
  if (brandErr || !brand) {
    return NextResponse.json({ error: 'Brand nenalezen' }, { status: 404 })
  }

  // 1. Image processing
  const inputBuf = Buffer.from(await file.arrayBuffer())
  let processed
  try {
    processed = await processImage(inputBuf)
  } catch (err) {
    return NextResponse.json(
      {
        error: `Zpracování fotky selhalo: ${err instanceof Error ? err.message : 'unknown'}`,
      },
      { status: 500 }
    )
  }

  // 2. SEO filename — pokud existuje, dej časový suffix aby se nepřepsalo
  const desiredFilename = buildPhotoFilename({
    brandSlug: slug,
    section: section as 'logo' | 'hero' | 'editorial' | 'gallery',
    index: sectionIndex ?? undefined,
  })
  // Storage cesta: brand/{slug}/{filename}; přepisujeme upsertem (logo/hero
  // mají vždy 1 soubor, ostatní rozlišuje counter)
  const storagePath = `brand/${slug}/${desiredFilename}`

  await ensureBucket()
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, processed.buffer, {
      contentType: 'image/webp',
      upsert: true,
    })
  if (uploadErr) {
    return NextResponse.json({ error: `Upload selhal: ${uploadErr.message}` }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  // Cache buster — upsert vrátí stejnou URL, browser by hold cached. Přidáme ?v=timestamp
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

  // 3. Vision alt text
  let altText: string | null = null
  if (process.env.ANTHROPIC_API_KEY) {
    altText = await generateAlt({
      brandName: brand.name as string,
      section,
      sectionTitle,
      imageBase64: processed.buffer.toString('base64'),
      mediaType: processed.mediaType,
    })
  }

  // 4. Pro unique sekce (logo, hero, editorial+index) deaktivuj staré
  const sortOrder = sortOrderFor(section, sectionIndex)
  if (section === 'logo' || section === 'hero' || section === 'editorial') {
    await supabaseAdmin
      .from('entity_images')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('entity_id', brand.id)
      .eq('entity_type', 'brand')
      .eq('image_role', section)
      .eq('sort_order', sortOrder)
  }

  // 5. Pokud gallery, sort_order = next available
  let finalSortOrder = sortOrder
  if (section === 'gallery') {
    const { data: existingGallery } = await supabaseAdmin
      .from('entity_images')
      .select('sort_order')
      .eq('entity_id', brand.id)
      .eq('entity_type', 'brand')
      .eq('image_role', 'gallery')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    finalSortOrder = existingGallery ? (existingGallery.sort_order as number) + 1 : 100
  }

  // 6. Insert entity_image
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('entity_images')
    .insert({
      entity_type: 'brand',
      entity_id: brand.id,
      url: publicUrl,
      alt_text: altText,
      caption: altText, // duplicitní pro UX (curator card alt+caption)
      source: 'manual_upload',
      source_id: storagePath,
      is_primary: section === 'logo',
      sort_order: finalSortOrder,
      status: 'active',
      image_role: section,
      width: processed.width,
      height: processed.height,
    })
    .select('id, url, alt_text, caption, image_role, sort_order, width, height, status')
    .single()
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    photo: inserted,
    debug: {
      originalBytes: file.size,
      finalBytes: processed.bytes,
      compressionRatio: Math.round((1 - processed.bytes / file.size) * 100),
      width: processed.width,
      height: processed.height,
      filename: desiredFilename,
    },
  })
}

// DELETE — soft-delete photo (admin reset sekce)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await params
  const photoId = request.nextUrl.searchParams.get('id')
  if (!photoId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Brand nenalezen' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('entity_images')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', photoId)
    .eq('entity_id', brand.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
