/**
 * Browser-side image preparation for world generation.
 *
 * Two jobs:
 *  - Decode the upload to pixels. Safari decodes HEIC/HEIF (iPhone photos)
 *    natively; other browsers can't, so those fall back to a wasm transcode.
 *    The old local pipeline used macOS `sips`, unavailable in a browser.
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

/** Decode a blob via an <img> element — uses the browser's native codecs. */
function decodeWithImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth > 0) resolve(img)
      else reject(new Error('decoded image is empty'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('native decode failed'))
    }
    img.src = url
  })
}

/** HEIC/HEIF -> JPEG blob via wasm, for browsers without native HEIC support. */
async function transcodeHeic(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default
  try {
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    return Array.isArray(converted) ? converted[0] : converted
  } catch {
    throw new Error(
      'This HEIC photo could not be decoded in your browser. Open it in Safari, ' +
        'or re-save it as JPEG and upload again.',
    )
  }
}

export async function prepareImage(file: File, maxDimension = 2048): Promise<PreparedImage> {
  let source: CanvasImageSource
  let sourceWidth: number
  let sourceHeight: number

  try {
    // Native path: works for JPEG/PNG/WebP everywhere, and HEIC on Safari.
    const img = await decodeWithImageElement(file)
    source = img
    sourceWidth = img.naturalWidth
    sourceHeight = img.naturalHeight
  } catch (nativeError) {
    if (!isHeic(file)) {
      throw nativeError instanceof Error ? nativeError : new Error('Could not decode the image.')
    }
    // Non-Safari + HEIC: transcode to JPEG, then decode that.
    const bitmap = await createImageBitmap(await transcodeHeic(file))
    source = bitmap
    sourceWidth = bitmap.width
    sourceHeight = bitmap.height
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get a 2D canvas context for image preparation.')
  ctx.drawImage(source, 0, 0, width, height)
  if (source instanceof ImageBitmap) source.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return { dataUrl, base64, mime: 'image/jpeg', extension: 'jpeg' }
}
