/**
 * Browser-side image preparation for world generation.
 *
 * Two jobs:
 *  - Transcode HEIC/HEIF (iPhone photos) to JPEG. Browsers can't decode HEIC
 *    and World Labs rejects it; the local pipeline used macOS `sips`, which is
 *    obviously unavailable in a browser.
 *  - Downscale + re-encode to JPEG so the base64 payload stays well under
 *    Vercel's ~4.5MB serverless request-body limit.
 */

const HEIC_NAME = /\.(heic|heif)$/i

export interface PreparedImage {
  /** Full data URI — `data:image/jpeg;base64,...` */
  dataUrl: string
  /** Bare base64 with no data-URI prefix. */
  base64: string
  mime: string
  /** Extension without a leading dot, e.g. `jpeg`. */
  extension: string
}

function isHeic(file: File): boolean {
  return HEIC_NAME.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
}

export async function prepareImage(file: File, maxDimension = 2048): Promise<PreparedImage> {
  let blob: Blob = file

  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    blob = Array.isArray(converted) ? converted[0] : converted
  }

  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get a 2D canvas context for image preparation.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return { dataUrl, base64, mime: 'image/jpeg', extension: 'jpeg' }
}
