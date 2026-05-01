// POST /api/admin/entity-images/upload
// multipart/form-data: file, entityId, entityType, altText?
// → nahraje na Supabase Storage, AI alt text, uloží do entity_images

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateImageAltText } from '@/lib/product-image'

const BUCKET = 'entities'
const MAX_BYTES = 10 * 1024 * 1024  // 10 MB

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const entityId = formData.get('entityId') as string | null
  const entityType = formData.get('entityType') as string | null
  const altText = (formData.get('altText') as string | null)?.trim() || null

  if (!file || !entityId || !entityType) {
    return NextResponse.json({ error: 'file, entityId, entityType jsou povinné' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Pouze obrázky (jpg, png, webp…)' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Maximální velikost je 10 MB' }, { status: 400 })
  }

  // Extension z MIME nebo filename
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  }
  const ext = extMap[file.type] ?? 'jpg'
  const timestamp = Date.now()
  const storagePath = `${entityType}/${entityId}/${timestamp}.${ext}`

  await ensureBucket()

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadErr) {
    return NextResponse.json({ error: `Upload selhal: ${uploadErr.message}` }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  // AI alt text — pokud nebylo zadáno, nechej Claude popsat obrázek
  let finalAlt = altText
  if (!finalAlt && process.env.ANTHROPIC_API_KEY) {
    try {
      // Předáme URL — je veřejně dostupná ihned po uploadu
      finalAlt = await generateImageAltText(publicUrl, entityType)
    } catch {
      // Non-blocking — alt zůstane null
    }
  }

  // Sort order + is_primary
  const { data: last } = await supabaseAdmin
    .from('entity_images')
    .select('sort_order, is_primary')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .eq('status', 'active')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = last ? (last.sort_order as number) + 1 : 0
  const isPrimary = !last

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('entity_images')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      url: publicUrl,
      alt_text: finalAlt,
      source: 'manual_upload',
      source_id: storagePath,
      is_primary: isPrimary,
      sort_order: nextOrder,
      status: 'active',
    })
    .select('id, url, alt_text, is_primary, sort_order, source, source_attribution, width, height')
    .single()
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, photo: inserted })
}
