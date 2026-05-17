export type SemanticScreenshot = {
  id: string
  imageDataUrl: string
  cameraPosition: [number, number, number]
  cameraRotation: [number, number, number]
  cameraQuaternion?: [number, number, number, number]
  projectionMatrix: number[]
  viewMatrix: number[]
  viewport: {
    width: number
    height: number
  }
  mode: "fly" | "walk"
  timestamp: string
}

export type SemanticDetection2D = {
  id: string
  label: string
  description?: string
  category?: string
  confidence: number
  importance?: number
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
  screenshotId: string
  cameraPosition: [number, number, number]
  cameraRotation: [number, number, number]
  cameraQuaternion?: [number, number, number, number]
  projectionMatrix: number[]
  viewMatrix: number[]
  viewport: {
    width: number
    height: number
  }
}

export type SemanticAnchorCandidate = {
  id: string
  label: string
  description?: string
  category?: string
  confidence: number
  importance?: number
  position: [number, number, number]
  normal?: [number, number, number]
  sourceDetectionId: string
}

export type SemanticAnchor3D = {
  id: string
  label: string
  description?: string
  category?: string
  confidence: number
  importance?: number
  position: [number, number, number]
  normal?: [number, number, number]
  sourceDetections: string[]
  createdAt: string
  updatedAt?: string
  visible?: boolean
  pinned?: boolean
  metadata?: {
    scanId?: string
    fallback?: boolean
    detectionCount?: number
  }
}

export type SemanticLayer = {
  sceneId: string
  roomName?: string
  version: 1
  createdAt: string
  updatedAt: string
  provider: "gemini" | "mock" | "manual"
  anchors: SemanticAnchor3D[]
}
