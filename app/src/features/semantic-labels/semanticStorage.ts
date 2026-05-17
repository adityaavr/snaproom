import { SemanticLayer, SemanticAnchor3D } from '../../types/semantic'

const STORAGE_PREFIX = 'snaproom:semantic:'

export function saveSemanticLayer(sceneId: string, anchors: SemanticAnchor3D[]) {
  const layer: SemanticLayer = {
    sceneId,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    provider: 'gemini',
    anchors,
  }
  
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${sceneId}`, JSON.stringify(layer))
  } catch (e) {
    console.error('Failed to save semantic layer to localStorage', e)
  }
}

export function loadSemanticLayer(sceneId: string): SemanticLayer | null {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${sceneId}`)
    if (data) {
      return JSON.parse(data) as SemanticLayer
    }
  } catch (e) {
    console.error('Failed to load semantic layer from localStorage', e)
  }
  return null
}

export function clearSemanticLayer(sceneId: string) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sceneId}`)
  } catch (e) {
    console.error('Failed to clear semantic layer from localStorage', e)
  }
}

export function exportSemanticLayer(sceneId: string, anchors: SemanticAnchor3D[]) {
  const layer: SemanticLayer = {
    sceneId,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    provider: 'gemini',
    anchors,
  }
  
  const blob = new Blob([JSON.stringify(layer, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `semantic-layer-${sceneId}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importSemanticLayer(): Promise<SemanticLayer | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        try {
          const layer = JSON.parse(text) as SemanticLayer
          resolve(layer)
        } catch (err) {
          console.error('Failed to parse imported semantic layer', err)
          resolve(null)
        }
      } else {
        resolve(null)
      }
    }
    input.click()
  })
}
