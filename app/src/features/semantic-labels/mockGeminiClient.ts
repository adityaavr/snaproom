import { SemanticDetection2D, SemanticScreenshot } from '../../types/semantic'

const API_KEY = import.meta.env.VITE_GOOGLE_GEMINI_KEY as string | undefined

const CATEGORY_IMPORTANCE: Record<string, number> = {
  furniture: 0.82,
  architecture: 0.72,
  lighting: 0.68,
  appliance: 0.64,
  electronics: 0.62,
  plant: 0.58,
  decor: 0.5,
  textile: 0.48,
  other: 0.42,
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function estimateImportance(
  item: { category?: string },
  bbox: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
) {
  const categoryScore = CATEGORY_IMPORTANCE[item.category?.toLowerCase() ?? ''] ?? CATEGORY_IMPORTANCE.other
  const areaRatio = clamp01((bbox.width * bbox.height) / Math.max(1, viewport.width * viewport.height))
  const centerX = bbox.x + bbox.width / 2
  const centerY = bbox.y + bbox.height / 2
  const normalizedCenterDistance = Math.hypot(
    (centerX / viewport.width - 0.5) * 2,
    (centerY / viewport.height - 0.5) * 2,
  )
  const centrality = clamp01(1 - normalizedCenterDistance / 1.35)
  const presenceScore = clamp01(Math.sqrt(areaRatio) * 1.8)

  return clamp01(categoryScore * 0.58 + centrality * 0.24 + presenceScore * 0.18)
}

/**
 * Analyze a screenshot of a 3DGS scene using Gemini Vision.
 *
 * Gemini returns bounding boxes as normalised [0..1] coordinates which we
 * convert back to pixel-space so the SemanticScanner can raycast through
 * their centres.
 */
export async function analyzeScreenshot(screenshot: SemanticScreenshot): Promise<SemanticDetection2D[]> {
  if (!API_KEY) {
    console.error('[SemanticScan] VITE_GOOGLE_GEMINI_KEY is not set – cannot call Gemini.')
    return []
  }

  const base64Data = screenshot.imageDataUrl.split(',')[1]
  if (!base64Data) {
    console.error('[SemanticScan] Could not extract base64 data from screenshot.')
    return []
  }

  const prompt = `You are an expert object detector. Analyze this image of a 3D room environment.
Identify every distinct, visually recognizable object you can see (furniture, fixtures, decor, architectural elements).
For each object, return:
- "label": A short, human-readable name (e.g. "Sofa", "Floor Lamp", "Bookshelf").
- "description": A one-sentence description of the object.
- "category": One of "furniture", "architecture", "lighting", "decor", "appliance", "textile", "plant", "electronics", "other".
- "importance": A float from 0.0 to 1.0 for how important this object is to understand or look at in this specific scene. Give primary focal objects, navigational anchors, and distinctive features high scores; repeated details and small decor should be lower. Do not inflate every score.
- "bbox": An object with keys "ymin", "xmin", "ymax", "xmax", each a float between 0.0 and 1.0 representing the bounding box in normalised image coordinates (top-left origin).

Return ONLY a raw JSON array. No markdown fences, no commentary. Example:
[{"label":"Sofa","description":"A large grey L-shaped sofa.","category":"furniture","importance":0.92,"bbox":{"ymin":0.4,"xmin":0.2,"ymax":0.8,"xmax":0.7}}]`

  console.log('[SemanticScan] Calling Gemini Vision API…')

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      },
    )

    if (!response.ok) {
      const body = await response.text()
      console.error(`[SemanticScan] Gemini API error ${response.status}:`, body)
      throw new Error(`Gemini API ${response.status}`)
    }

    const data = await response.json()
    const textOutput: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      console.error('[SemanticScan] No text output from Gemini:', JSON.stringify(data).slice(0, 500))
      return []
    }

    // Strip possible markdown fences the model might add despite instructions
    const cleaned = textOutput
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: Array<{
      label: string
      description?: string
      category?: string
      importance?: number
      bbox: { ymin: number; xmin: number; ymax: number; xmax: number }
    }>

    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Truncated JSON repair: extract all complete objects from partial array
      console.warn('[SemanticScan] JSON truncated, attempting repair…')
      const repaired: typeof parsed = []
      const objectRegex = /\{[^{}]*"label"\s*:\s*"[^"]+?"[^{}]*"bbox"\s*:\s*\{[^{}]*\}[^{}]*\}/g
      let match: RegExpExecArray | null
      while ((match = objectRegex.exec(cleaned)) !== null) {
        try {
          repaired.push(JSON.parse(match[0]))
        } catch { /* skip malformed */ }
      }
      if (repaired.length === 0) {
        console.error('[SemanticScan] Could not recover any objects from response.')
        return []
      }
      console.log(`[SemanticScan] Recovered ${repaired.length} objects from truncated response.`)
      parsed = repaired
    }

    if (!Array.isArray(parsed)) {
      console.error('[SemanticScan] Gemini returned non-array:', typeof parsed)
      return []
    }

    console.log(`[SemanticScan] Gemini detected ${parsed.length} objects.`)

    const { width, height } = screenshot.viewport

    return parsed
      .filter((item) => item.bbox && typeof item.bbox.xmin === 'number')
      .map((item) => {
        const pxX = item.bbox.xmin * width
        const pxY = item.bbox.ymin * height
        const pxW = (item.bbox.xmax - item.bbox.xmin) * width
        const pxH = (item.bbox.ymax - item.bbox.ymin) * height
        const bbox = { x: pxX, y: pxY, width: pxW, height: pxH }
        const importance = typeof item.importance === 'number'
          ? clamp01(item.importance)
          : estimateImportance(item, bbox, screenshot.viewport)

        return {
          id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: item.label,
          description: item.description,
          category: item.category,
          confidence: 0.9,
          importance,
          bbox,
          screenshotId: screenshot.id,
          cameraPosition: screenshot.cameraPosition,
          cameraRotation: screenshot.cameraRotation,
          cameraQuaternion: screenshot.cameraQuaternion,
          projectionMatrix: screenshot.projectionMatrix,
          viewMatrix: screenshot.viewMatrix,
          viewport: screenshot.viewport,
        } satisfies SemanticDetection2D
      })
  } catch (err) {
    console.error('[SemanticScan] Gemini call failed:', err)
    return []
  }
}
