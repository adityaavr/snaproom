import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { useSemanticStore } from '../../store/semantic'
import type { SemanticAnchor3D } from '../../types/semantic'

const MIN_LABELS_PER_VIEW = 2
const MAX_LABELS_PER_VIEW = 5
const SELECTION_INTERVAL_SECONDS = 0.12
const VIEW_MARGIN = 1.08

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

type ProjectedAnchor = {
  anchor: SemanticAnchor3D
  depth: number
  screenX: number
  screenY: number
  score: number
}

type LabelLayout = {
  line: CSSProperties
  box: CSSProperties
}

const LABEL_LAYOUTS: LabelLayout[] = [
  {
    line: { left: '4px', top: '50%', width: '58px', transform: 'translateY(-50%) rotate(-30deg)', transformOrigin: 'left center' },
    box: { left: '54px', bottom: '28px' },
  },
  {
    line: { left: '4px', top: '50%', width: '54px', transform: 'translateY(-50%) rotate(28deg)', transformOrigin: 'left center' },
    box: { left: '52px', top: '26px' },
  },
  {
    line: { right: '4px', top: '50%', width: '56px', transform: 'translateY(-50%) rotate(30deg)', transformOrigin: 'right center' },
    box: { right: '52px', bottom: '28px' },
  },
  {
    line: { right: '4px', top: '50%', width: '54px', transform: 'translateY(-50%) rotate(-28deg)', transformOrigin: 'right center' },
    box: { right: '52px', top: '26px' },
  },
  {
    line: { left: '50%', bottom: '4px', width: '48px', transform: 'translateX(-50%) rotate(-90deg)', transformOrigin: 'left center' },
    box: { left: '-104px', bottom: '58px' },
  },
]

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function getAnchorImportance(anchor: SemanticAnchor3D) {
  if (typeof anchor.importance === 'number') return clamp01(anchor.importance)

  const categoryScore = CATEGORY_IMPORTANCE[anchor.category?.toLowerCase() ?? ''] ?? CATEGORY_IMPORTANCE.other
  const confidence = typeof anchor.confidence === 'number' ? clamp01(anchor.confidence) : 0.5
  return clamp01(categoryScore * 0.7 + confidence * 0.3)
}

function getVisibleTargetCount(candidates: ProjectedAnchor[], camera: THREE.Camera) {
  if (candidates.length === 0) return 0

  const nearestDepth = Math.min(...candidates.map((candidate) => candidate.depth))
  const zoomByDistance = clamp01((9 - nearestDepth) / 7)
  let zoomByFov = 0

  if (camera instanceof THREE.PerspectiveCamera) {
    const effectiveFov = camera.fov / Math.max(camera.zoom, 0.001)
    zoomByFov = clamp01((75 - effectiveFov) / 45)
  }

  const zoomScore = Math.max(zoomByDistance, zoomByFov)
  const targetCount = Math.round(MIN_LABELS_PER_VIEW + zoomScore * (MAX_LABELS_PER_VIEW - MIN_LABELS_PER_VIEW))

  return Math.min(candidates.length, Math.max(MIN_LABELS_PER_VIEW, Math.min(MAX_LABELS_PER_VIEW, targetCount)))
}

function selectSemanticLabels(
  anchors: SemanticAnchor3D[],
  camera: THREE.Camera,
  size: { width: number; height: number },
) {
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)

  const candidates = anchors.flatMap((anchor): ProjectedAnchor[] => {
    if (anchor.visible === false) return []

    const worldPoint = new THREE.Vector3(...anchor.position)
    const toAnchor = worldPoint.clone().sub(camera.position)
    const depth = toAnchor.dot(forward)
    if (depth <= 0.1) return []

    const projected = worldPoint.clone().project(camera)
    if (
      projected.z < -1 ||
      projected.z > 1 ||
      Math.abs(projected.x) > VIEW_MARGIN ||
      Math.abs(projected.y) > VIEW_MARGIN
    ) {
      return []
    }

    const screenX = (projected.x * 0.5 + 0.5) * size.width
    const screenY = (-projected.y * 0.5 + 0.5) * size.height
    const centrality = clamp01(1 - Math.hypot(projected.x * 0.82, projected.y) / 1.25)
    const proximity = clamp01((10 - depth) / 9)
    const confidence = typeof anchor.confidence === 'number' ? clamp01(anchor.confidence) : 0.5
    const fallbackPenalty = anchor.metadata?.fallback ? -0.08 : 0
    const pinnedBoost = anchor.pinned ? 0.2 : 0
    const importance = getAnchorImportance(anchor)

    return [{
      anchor,
      depth,
      screenX,
      screenY,
      score: importance * 0.52 + centrality * 0.18 + confidence * 0.16 + proximity * 0.14 + pinnedBoost + fallbackPenalty,
    }]
  }).sort((a, b) => b.score - a.score)

  const targetCount = getVisibleTargetCount(candidates, camera)
  if (targetCount === 0) return []

  const minSeparation = size.width < 640 ? 104 : 154
  const selected: ProjectedAnchor[] = []
  const deferred: ProjectedAnchor[] = []

  for (const candidate of candidates) {
    if (selected.length >= targetCount) break

    const overlaps = selected.some((active) => (
      Math.hypot(active.screenX - candidate.screenX, active.screenY - candidate.screenY) < minSeparation
    ))

    if (overlaps) deferred.push(candidate)
    else selected.push(candidate)
  }

  const minCount = Math.min(MIN_LABELS_PER_VIEW, targetCount)
  for (const candidate of deferred) {
    if (selected.length >= minCount) break
    selected.push(candidate)
  }

  for (const candidate of deferred) {
    if (selected.length >= targetCount) break
    if (!selected.some((active) => active.anchor.id === candidate.anchor.id)) selected.push(candidate)
  }

  return selected.slice(0, MAX_LABELS_PER_VIEW)
}

function shortDescription(description?: string) {
  const text = description?.trim()
  if (!text) return ''
  if (text.length <= 118) return text
  return `${text.slice(0, 115).trim()}...`
}

function labelLayout(anchorId: string, index: number) {
  let hash = index
  for (let i = 0; i < anchorId.length; i += 1) {
    hash = (hash * 31 + anchorId.charCodeAt(i)) >>> 0
  }
  return LABEL_LAYOUTS[hash % LABEL_LAYOUTS.length]
}

export function SemanticLabelRenderer() {
  const { anchors, labelsVisible } = useSemanticStore()
  const { camera, size } = useThree()
  const [selectedAnchorIds, setSelectedAnchorIds] = useState<string[]>([])
  const lastSelectionAt = useRef(-Infinity)
  const selectedKeyRef = useRef('')

  useFrame(({ clock }) => {
    if (!labelsVisible || anchors.length === 0) {
      if (selectedKeyRef.current !== '') {
        selectedKeyRef.current = ''
        setSelectedAnchorIds([])
      }
      return
    }

    if (clock.elapsedTime - lastSelectionAt.current < SELECTION_INTERVAL_SECONDS) return
    lastSelectionAt.current = clock.elapsedTime

    const selected = selectSemanticLabels(anchors, camera, size)
    const nextIds = selected.map((candidate) => candidate.anchor.id)
    const nextKey = nextIds.join('|')

    if (nextKey !== selectedKeyRef.current) {
      selectedKeyRef.current = nextKey
      setSelectedAnchorIds(nextIds)
    }
  })

  const visibleAnchors = useMemo(() => {
    const anchorsById = new Map(anchors.map((anchor) => [anchor.id, anchor]))
    return selectedAnchorIds.flatMap((id) => {
      const anchor = anchorsById.get(id)
      return anchor ? [anchor] : []
    })
  }, [anchors, selectedAnchorIds])

  if (!labelsVisible || anchors.length === 0 || visibleAnchors.length === 0) return null

  return (
    <>
      {visibleAnchors.map((anchor, index) => {
        const importance = getAnchorImportance(anchor)
        const layout = labelLayout(anchor.id, index)
        const description = shortDescription(anchor.description)

        return (
          <Html
            key={anchor.id}
            position={anchor.position}
            center
            distanceFactor={12}
            zIndexRange={[100 + visibleAnchors.length - index, 0]}
          >
            <div className="relative flex items-center justify-center select-none pointer-events-none">
              <div className="absolute h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.82)] ring-2 ring-black/20" />

              <div
                className="absolute h-px bg-white/75"
                style={layout.line}
              />

              <div
                className="absolute w-[220px] overflow-hidden rounded-lg border border-white/30 bg-slate-950/38 p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.32)] ring-1 ring-black/20 backdrop-blur-xl pointer-events-auto"
                style={layout.box}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,255,255,0.07)_38%,rgba(8,13,22,0.28)_100%)]" />
                <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/55" />
                <div className="relative flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[11px] leading-relaxed text-white/90 font-mono tracking-wide">
                    <strong className="font-bold text-white text-[12px] capitalize">{anchor.label}:</strong>{' '}
                    {description}
                  </p>
                  <span
                    className="mt-0.5 shrink-0 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-cyan-100"
                    title="Importance score"
                  >
                    {Math.round(importance * 100)}
                  </span>
                </div>
                <div className="relative mt-2 h-[2px] w-full overflow-hidden rounded-full bg-white/16">
                  <div
                    className="h-full rounded-full bg-cyan-100/80 shadow-[0_0_8px_rgba(165,243,252,0.55)]"
                    style={{ width: `${Math.round(importance * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Html>
        )
      })}
    </>
  )
}
