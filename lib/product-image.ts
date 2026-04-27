// Product image pipeline.
// Primary source: Open Food Facts API (free, CC-BY-SA images, commercial OK).
// Downloads, converts to WebP, uploads to Supabase Storage bucket 'products',
// then updates products.image_url.

import sharp from 'sharp'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const STORAGE_BUCKET = 'products'

/** Claude vision-based alt text per photo. Cheap Haiku model, returns
 *  ≤120 char Czech description that includes product name. Falls back
 *  to a rule-based alt on any error. */
export async function generateImageAltText(
  imageUrl: string,
  productName: string
): Promise<string> {
  const fallback = productName
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallback

  const client = new Anthropic({ apiKey })
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: `Jsi accessibility/SEO copywriter pro e-shop s olivovými oleji.

Generuješ alt text pro fotografii produktu. Pravidla:
- POVINNĚ česky, MAX 120 znaků
- Začít názvem produktu (zkráceným pokud je dlouhý)
- Pak STRUČNĚ popsat co je na fotce (přední strana, štítek detail, lab report, balení, použití…)
- Žádné marketingové fráze, jen popis
- Žádné uvozovky, žádné emoji
- Vrať POUZE jeden řádek alt textu, žádný úvod ani závěr`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            { type: 'text', text: `Produkt: ${productName}\n\nVrať alt text.` },
          ],
        },
      ],
    })
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()
      .replace(/^["'„"]+|["'""]+$/g, '')
    if (!text || text.length < 10) return fallback
    return text.length > 120 ? text.slice(0, 120).replace(/\s+\S*$/, '') : text
  } catch (err) {
    console.warn('[image/alt] vision failed:', err instanceof Error ? err.message : err)
    return fallback
  }
}

interface OFFProductResponse {
  status?: number
  product?: {
    image_url?: string
    image_front_url?: string
    selected_images?: {
      front?: {
        display?: Record<string, string>
      }
    }
  }
}

/** Fetch highest-quality product front image URL from Open Food Facts. */
export async function fetchOpenFoodFactsImage(ean: string): Promise<string | null> {
  try {
    const res = await fetch(`${OFF_BASE}/${ean}.json`, {
      headers: { 'User-Agent': 'Olivator.cz/1.0 (https://olivator.cz)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as OFFProductResponse
    if (data.status !== 1) return null

    const product = data.product
    if (!product) return null

    // Preference: selected front image (highest res) > generic front > any image
    const selected = product.selected_images?.front?.display
    if (selected) {
      const langs = ['cs', 'en', 'it', 'gr', 'es']
      for (const lang of langs) {
        if (selected[lang]) return selected[lang]
      }
      const anyLang = Object.values(selected)[0]
      if (anyLang) return anyLang
    }
    return product.image_front_url ?? product.image_url ?? null
  } catch (err) {
    console.warn(`[image/off] EAN ${ean}:`, err instanceof Error ? err.message : err)
    return null
  }
}

/** Download image, normalize to 800×800 on white background, save as
 *  {slug}.webp (or {slug}-{suffix}.webp for gallery photos) in Supabase
 *  Storage. Returns a cache-busted public URL. */
export async function downloadAndStoreImage(
  sourceUrl: string,
  productSlug: string,
  suffix?: string | number
): Promise<string> {
  const res = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())

  // Normalize:
  //  1. Fit inside 800×800 keeping aspect ratio
  //  2. Pad to exact 800×800 canvas with white background
  //  3. Export WebP 82% quality
  // Result: consistent grid dimensions regardless of source aspect ratio.
  const webp = await sharp(buffer)
    .resize(800, 800, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 82 })
    .toBuffer()

  const filename = suffix != null ? `${productSlug}-${suffix}.webp` : `${productSlug}.webp`
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, webp, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    })
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename)

  return `${urlData.publicUrl}?v=${Date.now()}`
}

/** End-to-end: for a product id, fetch from OFF and update products.image_url. */
export async function fetchAndStoreProductImage(
  productId: string
): Promise<{ ok: true; imageUrl: string; source: string } | { ok: false; reason: string }> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, ean, slug, name')
    .eq('id', productId)
    .maybeSingle()
  if (error || !product) return { ok: false, reason: 'Product not found' }

  const offUrl = await fetchOpenFoodFactsImage(product.ean as string)
  if (!offUrl) return { ok: false, reason: 'No image in Open Food Facts for this EAN' }

  const storedUrl = await downloadAndStoreImage(offUrl, product.slug as string)

  const { error: updateErr } = await supabaseAdmin
    .from('products')
    .update({
      image_url: storedUrl,
      image_source: 'open_food_facts',
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
  if (updateErr) return { ok: false, reason: `DB update failed: ${updateErr.message}` }

  return { ok: true, imageUrl: storedUrl, source: 'open_food_facts' }
}

/** Store a manually-provided image URL. */
export async function storeManualImage(
  productId: string,
  sourceUrl: string
): Promise<{ ok: true; imageUrl: string; source: string } | { ok: false; reason: string }> {
  try {
    new URL(sourceUrl) // validate
  } catch {
    return { ok: false, reason: 'Neplatná URL' }
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, slug')
    .eq('id', productId)
    .maybeSingle()
  if (error || !product) return { ok: false, reason: 'Product not found' }

  try {
    const storedUrl = await downloadAndStoreImage(sourceUrl, product.slug as string)
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({
        image_url: storedUrl,
        image_source: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
    if (updateErr) return { ok: false, reason: `DB update failed: ${updateErr.message}` }
    return { ok: true, imageUrl: storedUrl, source: 'manual' }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Download failed' }
  }
}

/** Clear image from a product (and delete storage file). */
export async function clearProductImage(productId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, ean, slug')
    .eq('id', productId)
    .maybeSingle()
  if (!product) return { ok: false, reason: 'Product not found' }

  // Delete possible files (both new slug-based and legacy EAN-based naming)
  await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([
      `${product.slug as string}.webp`,
      `${product.ean as string}.webp`,
    ])

  const { error } = await supabaseAdmin
    .from('products')
    .update({ image_url: null, image_source: null, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/** Detect role of gallery image from URL/alt text — used for SEO filename suffix. */
export function detectImageRole(url: string, alt?: string | null): 'lab' | 'cert' | 'harvest' | 'label' | 'detail' {
  const s = `${url} ${alt ?? ''}`.toLowerCase()
  if (/q[1-4]-|test|analyz|rozbor|protokol|report|coa\b|chem/.test(s)) return 'lab'
  if (/cert|nyiooc|dop\b|pdo|bio[-_]|organic|demeter/.test(s)) return 'cert'
  if (/sber|sběr|harvest|olivovn[ií]k|sklize/.test(s)) return 'harvest'
  if (/etiket|label|nálep/.test(s)) return 'label'
  return 'detail'
}

/** Download gallery image, convert to WebP, store in Supabase with SEO filename.
 *  Returns the new public URL or null on failure. */
export async function downloadGalleryImage(
  sourceUrl: string,
  productSlug: string,
  role: 'lab' | 'cert' | 'harvest' | 'label' | 'detail',
  sortOrder: number
): Promise<{ ok: true; storageUrl: string; filename: string } | { ok: false; reason: string }> {
  try {
    new URL(sourceUrl) // validate
  } catch {
    return { ok: false, reason: 'invalid URL' }
  }

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` }
    const buffer = Buffer.from(await res.arrayBuffer())

    // Lab reports stay closer to original size (need readable text); product photos compressed harder
    const isText = role === 'lab' || role === 'cert' || role === 'label'
    const webp = await sharp(buffer)
      .resize(isText ? 1600 : 1200, isText ? 1600 : 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: isText ? 88 : 82 })
      .toBuffer()

    // Filename: {slug}-{role}.webp for unique roles, {slug}-{role}-{n}.webp if multiple
    // For 'detail' use plain numbered: {slug}-2.webp, {slug}-3.webp, …
    const filename = role === 'detail'
      ? `${productSlug}-${sortOrder}.webp`
      : `${productSlug}-${role}-${sortOrder}.webp`

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, webp, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      })
    if (uploadErr) return { ok: false, reason: uploadErr.message }

    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename)

    return {
      ok: true,
      storageUrl: `${urlData.publicUrl}?v=${Date.now()}`,
      filename,
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'download error' }
  }
}

/** Ensure the 'products' storage bucket exists. Safe to call repeatedly. */
export async function ensureProductsBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const exists = buckets?.some(b => b.name === STORAGE_BUCKET)
  if (exists) return { created: false }

  const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2 MB per file max
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
  })
  if (error) throw new Error(`Bucket creation failed: ${error.message}`)
  return { created: true }
}
