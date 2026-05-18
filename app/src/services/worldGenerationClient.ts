import type { World, WorldEntry } from '../types/world'
import { prepareImage } from './imagePrep'

/**
 * Browser-direct world generation. The hosted build has no local pipeline, so
 * the browser drives generation itself through thin server-side proxies that
 * inject the API keys (`/api/worldlabs`, `/api/fal`):
 *
 *   photo      -> World Labs                 -> 3D world
 *   floor plan -> FAL nano-banana interior   -> World Labs -> 3D world
 *
 * World Labs is an async job API: submit returns an operation, then we poll it
 * to completion. Each call is short, so it fits serverless limits fine.
 */

const WORLD_LABS_MODEL = 'marble-1.1'
const FAL_NANO_BANANA = 'fal-ai/nano-banana-2/edit'
const WORLD_POLL_INTERVAL_MS = 12000
const FAL_POLL_INTERVAL_MS = 5000

// Turns a top-down 2D floor plan into an interior view World Labs can
// reconstruct. Mirrors the prompt the local floor-plan pipeline used.
const FLOORPLAN_TO_INTERIOR_PROMPT = [
  'Transform this 2D architectural floor plan into a single photorealistic',
  'interior photograph taken from inside the space, at standing eye level.',
  "Reconstruct real walls, floor, ceiling, windows and doorways that match the",
  "floor plan's layout, proportions and room shape. Natural daylight,",
  'realistic materials and textures, wide-angle interior view.',
  'Keep it an empty, unfurnished static environment — no furniture, no people,',
  'no text, no floor-plan lines or labels. Architectural visualization quality.',
].join(' ')

export type GenerationStage =
  | 'preparing'
  | 'interior'
  | 'submitting'
  | 'generating'
  | 'complete'

export interface GenerationProgress {
  stage: GenerationStage
  message: string
}

interface Operation {
  operation_id?: string
  id?: string
  name?: string
  done?: boolean
  error?: unknown
  response?: World
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function operationId(operation: Operation): string {
  const id = operation.operation_id || operation.id || operation.name
  if (!id) throw new Error('World Labs response did not include an operation id.')
  return String(id).split('/').pop() ?? String(id)
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = undefined
  }
  if (!response.ok) {
    const detail = (json as { error?: string } | undefined)?.error || text || `HTTP ${response.status}`
    throw new Error(detail)
  }
  return json ?? {}
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await parseResponse(response)) as T
}

async function getJson<T>(url: string): Promise<T> {
  return (await parseResponse(await fetch(url))) as T
}

/** Floor plan -> photoreal interior image URL, via the FAL queue proxy. */
async function renderInteriorFromFloorplan(imageDataUrl: string, extraPrompt?: string): Promise<string> {
  const prompt = extraPrompt
    ? `${FLOORPLAN_TO_INTERIOR_PROMPT}\n\nAdditional direction: ${extraPrompt}`
    : FLOORPLAN_TO_INTERIOR_PROMPT

  const submitted = await postJson<{ status_url?: string; response_url?: string }>('/api/fal', {
    mode: 'submit',
    endpoint: FAL_NANO_BANANA,
    input: {
      prompt,
      image_urls: [imageDataUrl],
      num_images: 1,
      aspect_ratio: 'auto',
      output_format: 'png',
      safety_tolerance: '4',
      resolution: '1K',
      limit_generations: true,
    },
  })
  if (!submitted.status_url || !submitted.response_url) {
    throw new Error('FAL did not return a status/response url for the floor-plan render.')
  }

  for (;;) {
    const status = await postJson<{ status?: string; error?: unknown }>('/api/fal', {
      mode: 'poll',
      url: submitted.status_url,
    })
    if (status.status === 'COMPLETED') break
    if (status.status === 'FAILED' || status.error) {
      throw new Error('FAL floor-plan render failed.')
    }
    await sleep(FAL_POLL_INTERVAL_MS)
  }

  const result = await postJson<{ images?: Array<{ url?: string }> }>('/api/fal', {
    mode: 'poll',
    url: submitted.response_url,
  })
  const interiorUrl = result.images?.[0]?.url
  if (!interiorUrl) throw new Error('FAL floor-plan render returned no interior image.')
  return interiorUrl
}

export async function generateWorldInBrowser(options: {
  file: File
  roomName: string
  worldSlug: string
  isFloorplan: boolean
  textPrompt?: string
  onProgress?: (progress: GenerationProgress) => void
}): Promise<WorldEntry> {
  const { file, roomName, worldSlug, isFloorplan, textPrompt, onProgress } = options
  const report = (stage: GenerationStage, message: string) => onProgress?.({ stage, message })

  report('preparing', 'Preparing the source image…')
  const prepared = await prepareImage(file)
  const sceneText = textPrompt || `A modern ${roomName.toLowerCase()} interior`

  let imagePrompt: Record<string, unknown>
  if (isFloorplan) {
    report('interior', 'Rendering a photoreal interior from the floor plan…')
    const interiorUrl = await renderInteriorFromFloorplan(prepared.dataUrl, textPrompt)
    imagePrompt = { source: 'uri', uri: interiorUrl }
  } else {
    imagePrompt = {
      source: 'data_base64',
      data_base64: prepared.base64,
      extension: prepared.extension,
      mime_type: prepared.mime,
    }
  }

  report('submitting', 'Submitting to World Labs…')
  const operation = await postJson<Operation>('/api/worldlabs', {
    display_name: worldSlug,
    model: WORLD_LABS_MODEL,
    world_prompt: { type: 'image', image_prompt: imagePrompt, text_prompt: sceneText },
  })
  const id = operationId(operation)

  report('generating', 'Building the 3D environment — this takes a few minutes…')
  let current = operation
  while (!current.done) {
    await sleep(WORLD_POLL_INTERVAL_MS)
    current = await getJson<Operation>(`/api/worldlabs?id=${encodeURIComponent(id)}`)
  }

  if (current.error) {
    const detail = typeof current.error === 'string' ? `: ${current.error}` : ''
    throw new Error(`World Labs generation failed${detail}.`)
  }
  const world = current.response
  if (!world || !world.assets) {
    throw new Error('World Labs finished without returning world assets.')
  }

  report('complete', 'World ready.')

  return {
    slug: worldSlug,
    project: {
      slug: worldSlug,
      display_name: roomName,
      created_at: new Date().toISOString(),
    },
    world,
    worldVersions: [{ index: 1, label: 'World 1', world, complete: true, status: 'completed' }],
    objectAssets: [],
    allObjectAssets: [],
    sourceImageUrl: world.assets.thumbnail_url || prepared.dataUrl,
    sourceImageVersions: [],
    worldSfxUrls: [],
  }
}
