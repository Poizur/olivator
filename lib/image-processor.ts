// Image processor — pipeline pro user-upload fotky:
//   1. resize na max 1920px wide (ostré pro retinu, ne 4K plýtvání)
//   2. konverze na WebP (~30-50 % menší než JPEG při stejné kvalitě)
//   3. quality 85 (vizuálně nerozeznatelné od originálu, dobré pro web)
//   4. strip EXIF/metadata (ochrana soukromí + pár kB navíc)
//   5. SEO filename: brand-slug-section-counter.webp
//
// Bytes typicky: 200-600 KB per fotka. 10 MB upload → 400 KB on disk.

import sharp from 'sharp'

const MAX_WIDTH = 1920
const QUALITY = 85

export interface ProcessedImage {
  buffer: Buffer
  width: number
  height: number
  bytes: number
  mediaType: 'image/webp'
  ext: 'webp'
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const meta = await sharp(input).metadata()
  const srcWidth = meta.width ?? 0

  let pipeline = sharp(input).rotate() // automatic EXIF rotation, then strip

  if (srcWidth > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }

  // Konverze na WebP + stripping EXIF (sharp default odstraní metadata
  // pokud není .withMetadata())
  const buffer = await pipeline.webp({ quality: QUALITY, effort: 4 }).toBuffer()
  const finalMeta = await sharp(buffer).metadata()

  return {
    buffer,
    width: finalMeta.width ?? srcWidth,
    height: finalMeta.height ?? meta.height ?? 0,
    bytes: buffer.byteLength,
    mediaType: 'image/webp',
    ext: 'webp',
  }
}

/**
 * Vygeneruje SEO friendly filename: <brand-slug>-<section>-<counter>.webp
 * např. intini-hero.webp, intini-editorial-1.webp, intini-galerie-3.webp
 */
export function buildPhotoFilename(args: {
  brandSlug: string
  section: 'logo' | 'hero' | 'editorial' | 'gallery'
  index?: number
  ext?: string
}): string {
  const ext = args.ext ?? 'webp'
  const sectionMap: Record<typeof args.section, string> = {
    logo: 'logo',
    hero: 'hero',
    editorial: 'editorial',
    gallery: 'galerie',
  }
  const base = `${args.brandSlug}-${sectionMap[args.section]}`
  if (args.index !== undefined) return `${base}-${args.index}.${ext}`
  return `${base}.${ext}`
}
