import { useEffect, useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSemanticStore } from '../../store/semantic'
import { analyzeScreenshot } from './mockGeminiClient'
import { saveSemanticLayer, loadSemanticLayer } from './semanticStorage'
import type { SemanticScreenshot, SemanticAnchor3D } from '../../types/semantic'

interface Props {
  slug: string
}

function isSameSemanticAnchor(a: SemanticAnchor3D, b: SemanticAnchor3D) {
  return (
    a.label.toLowerCase() === b.label.toLowerCase() &&
    new THREE.Vector3(...a.position).distanceToSquared(new THREE.Vector3(...b.position)) < 2.25
  )
}

export function SemanticScanner({ slug }: Props) {
  const { gl, scene, camera, size } = useThree()
  const { triggerScan, setScanStatus, setAnchors, setLabelsVisible } = useSemanticStore()
  const anchorsRef = useRef<SemanticAnchor3D[]>([])
  const isScanning = useRef(false)

  // Keep ref in sync with store
  useEffect(() => {
    return useSemanticStore.subscribe((s) => { anchorsRef.current = s.anchors })
  }, [])

  // Load persisted labels
  useEffect(() => {
    const layer = loadSemanticLayer(slug)
    if (layer && layer.anchors.length > 0) {
      setAnchors(layer.anchors)
      setLabelsVisible(true)
      return
    }
    setAnchors([])
    setLabelsVisible(false)
  }, [slug, setAnchors, setLabelsVisible])

  const runScan = useCallback(async () => {
    if (isScanning.current) return
    isScanning.current = true
    setScanStatus('scanning')
    console.log('[SemanticScan] Scan triggered!')

    try {
      // Capture frame
      gl.render(scene, camera)
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.8)
      console.log('[SemanticScan] Captured frame, sending to Gemini...')

      const screenshot: SemanticScreenshot = {
        id: `shot-${Date.now()}`,
        imageDataUrl: dataUrl,
        cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
        cameraRotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
        cameraQuaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
        projectionMatrix: camera.projectionMatrix.toArray(),
        viewMatrix: camera.matrixWorldInverse.toArray(),
        viewport: { width: size.width, height: size.height },
        mode: 'fly',
        timestamp: new Date().toISOString(),
      }

      const detections = await analyzeScreenshot(screenshot)
      console.log(`[SemanticScan] Got ${detections.length} detections from Gemini`)

      if (detections.length === 0) {
        setScanStatus('idle')
        isScanning.current = false
        return
      }

      // Collect raycastable meshes
      const meshes: THREE.Object3D[] = []
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          meshes.push(child)
        }
      })
      console.log(`[SemanticScan] ${meshes.length} meshes available for raycasting`)

      const raycaster = new THREE.Raycaster()
      const newAnchors: SemanticAnchor3D[] = []

      for (const det of detections) {
        const cx = det.bbox.x + det.bbox.width / 2
        const cy = det.bbox.y + det.bbox.height / 2
        const ndcX = (cx / size.width) * 2 - 1
        const ndcY = -(cy / size.height) * 2 + 1

        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

        let worldPos: THREE.Vector3
        let normal: [number, number, number] | undefined
        let isFallback = false

        const intersects = raycaster.intersectObjects(meshes, true)

        if (intersects.length > 0) {
          worldPos = intersects[0].point.clone()
          if (intersects[0].face?.normal) {
            const n = intersects[0].face.normal.clone().transformDirection(intersects[0].object.matrixWorld)
            normal = [n.x, n.y, n.z]
          }
        } else {
          // Heuristic depth: lower in viewport = closer
          const normY = cy / size.height
          const depth = THREE.MathUtils.lerp(8, 1.5, normY)
          worldPos = camera.position.clone()
            .add(raycaster.ray.direction.clone().multiplyScalar(depth))
          isFallback = true
        }

        newAnchors.push({
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: det.label,
          description: det.description,
          category: det.category,
          confidence: isFallback ? det.confidence * 0.7 : det.confidence,
          importance: det.importance,
          position: [worldPos.x, worldPos.y, worldPos.z],
          normal,
          sourceDetections: [det.id],
          createdAt: new Date().toISOString(),
          visible: true,
          pinned: false,
          metadata: { scanId: screenshot.id, detectionCount: 1, fallback: isFallback },
        })
      }

      // Deduplicate, but let repeat scans refresh priority metadata.
      const existing = anchorsRef.current
      const now = new Date().toISOString()
      let refreshedCount = 0
      const updatedExisting = existing.map((ea) => {
        const duplicate = newAnchors.find((na) => isSameSemanticAnchor(na, ea))
        if (!duplicate) return ea

        const nextImportance = Math.max(ea.importance ?? -1, duplicate.importance ?? -1)
        const nextConfidence = Math.max(ea.confidence, duplicate.confidence)
        const sourceDetections = Array.from(new Set([...ea.sourceDetections, ...duplicate.sourceDetections]))
        const shouldRefresh =
          nextImportance !== (ea.importance ?? -1) ||
          nextConfidence !== ea.confidence ||
          sourceDetections.length !== ea.sourceDetections.length

        if (!shouldRefresh) return ea

        refreshedCount += 1
        return {
          ...ea,
          description: ea.description ?? duplicate.description,
          category: ea.category ?? duplicate.category,
          confidence: nextConfidence,
          importance: nextImportance >= 0 ? nextImportance : ea.importance,
          sourceDetections,
          updatedAt: now,
          metadata: {
            ...ea.metadata,
            detectionCount: sourceDetections.length,
          },
        }
      })
      const filtered = newAnchors.filter((na) => !existing.some((ea) => isSameSemanticAnchor(na, ea)))

      const combined = [...updatedExisting, ...filtered]
      setAnchors(combined)
      setLabelsVisible(true)
      saveSemanticLayer(slug, combined)
      console.log(`[SemanticScan] ✅ Added ${filtered.length} labels, refreshed ${refreshedCount} priorities (${combined.length} total)`)
      setScanStatus('idle')
    } catch (err) {
      console.error('[SemanticScan] ❌ Scan failed:', err)
      setScanStatus('error')
      setTimeout(() => setScanStatus('idle'), 3000)
    } finally {
      isScanning.current = false
    }
  }, [gl, scene, camera, size, slug, setScanStatus, setAnchors, setLabelsVisible])

  // Fire on button press / Shift+L
  useEffect(() => {
    if (triggerScan === 0) return
    runScan()
  }, [triggerScan, runScan])

  return null
}
