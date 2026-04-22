// Product image pipeline.
// Primary source: Open Food Facts API (free, CC-BY-SA images, commercial OK).
// Downloads, converts to WebP, uploads to Supabase Storage bucket 'products',
// then updates products.image_url.

import sharp from 'sharp'
import { supabaseAdmin } from './supabase'

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const STORAGE_BUCKET = 'products'

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

/** Download image bytes, convert to 800×800 WebP, upload to Supabase Storage.
 *  Returns the public URL stored in the bucket. */
export async function downloadAndStoreImage(
  sourceUrl: string,
  productEan: string
): Promise<string> {
  const res = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())

  // Resize + compress to WebP. Keep aspect ratio, max 800×800.
  const webp = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const filename = `${productEan}.webp`
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, webp, {
      contentType: 'image/webp',
      cacheControl: '31536000', // 1 year — files are versioned by EAN
      upsert: true,
    })
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

  const { data: urlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename)

  return urlData.publicUrl
}

/** End-to-end: for a product id, fetch from OFF and update products.image_url. */
export async function fetchAndStoreProductImage(
  productId: string
): Promise<{ ok: true; imageUrl: string; source: string } | { ok: false; reason: string }> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, ean, name')
    .eq('id', productId)
    .maybeSingle()
  if (error || !product) return { ok: false, reason: 'Product not found' }

  const offUrl = await fetchOpenFoodFactsImage(product.ean as string)
  if (!offUrl) return { ok: false, reason: 'No image in Open Food Facts for this EAN' }

  const storedUrl = await downloadAndStoreImage(offUrl, product.ean as string)

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
    .select('id, ean')
    .eq('id', productId)
    .maybeSingle()
  if (error || !product) return { ok: false, reason: 'Product not found' }

  try {
    const storedUrl = await downloadAndStoreImage(sourceUrl, product.ean as string)
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
    .select('id, ean')
    .eq('id', productId)
    .maybeSingle()
  if (!product) return { ok: false, reason: 'Product not found' }

  // Delete from storage (ignore errors — file may not exist)
  await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([`${product.ean as string}.webp`])

  const { error } = await supabaseAdmin
    .from('products')
    .update({ image_url: null, image_source: null, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
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
