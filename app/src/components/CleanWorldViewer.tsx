import { useCallback, useEffect, useState } from 'react'
import { useRoute } from 'wouter'
import { WorldViewer } from './WorldViewer'
import { useSceneProject } from '../modules/scene/useSceneProject'
import type { WorldEntry, WorldHoverPreview, WorldObjectAsset } from '../types/world'

interface Props {
  worlds: WorldEntry[]
  targetSlug: string
  refreshingWorlds: boolean
  onRefreshWorlds: () => void
}

export function CleanWorldViewer({ worlds, targetSlug, refreshingWorlds, onRefreshWorlds }: Props) {
  const [editMatch] = useRoute('/:slug/edit')
  const [selectedWorldVersions] = useState<Record<string, number>>({})
  const [hoveredObjectAssetId, setHoveredObjectAssetId] = useState<string | null>(null)
  const [hoveredObjectInstanceId, setHoveredObjectInstanceId] = useState<string | null>(null)
  const [hoveredWorldPreview, setHoveredWorldPreview] = useState<WorldHoverPreview | null>(null)
  const [sceneProjectEnabled, setSceneProjectEnabled] = useState(true)

  const entry = worlds.find((w) => w.slug === targetSlug) ?? worlds[0]
  const editing = Boolean(editMatch)
  const defaultWorldVersionIndex = entry?.worldVersions[entry.worldVersions.length - 1]?.index
  const activeWorldVersionIndex = selectedWorldVersions[entry?.slug] ?? defaultWorldVersionIndex
  const activeWorldVersion = entry?.worldVersions.find((version) => version.index === activeWorldVersionIndex)
  const activeWorld = activeWorldVersion?.world ?? entry?.world
  const renderableObjectAssets = entry?.objectAssets.filter((asset) => asset.complete && asset.url) ?? []
  const renderableAllObjectAssets = entry?.allObjectAssets.filter((asset) => asset.complete && asset.url) ?? []
  const { sceneProject, sceneProjectReady, updateSceneProject } = useSceneProject(entry?.slug, `/`, entry?.sceneProject)

  useEffect(() => {
    setSceneProjectEnabled(true)
    setHoveredObjectAssetId(null)
    setHoveredObjectInstanceId(null)
    setHoveredWorldPreview(null)
  }, [entry?.slug])

  const handleObjectHover = useCallback((asset: WorldObjectAsset, hovering: boolean, instanceId?: string) => {
    setHoveredObjectAssetId((current) => {
      if (hovering) return asset.assetId
      return current === asset.assetId ? null : current
    })
    setHoveredObjectInstanceId((current) => {
      if (hovering) return instanceId ?? null
      return current === instanceId ? null : current
    })
  }, [])

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-black">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p>Loading room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <WorldViewer
        world={activeWorld}
        slug={entry.slug}
        sourceImageUrl={entry.sourceImageUrl}
        hoveredWorldPreview={hoveredWorldPreview}
        objectAssets={renderableObjectAssets}
        allObjectAssets={renderableAllObjectAssets}
        worldSfxUrls={entry.worldSfxUrls}
        sceneProject={editing || sceneProjectEnabled ? sceneProject : undefined}
        sceneProjectReady={sceneProjectReady}
        hoveredObjectAssetId={hoveredObjectAssetId}
        hoveredObjectInstanceId={hoveredObjectInstanceId}
        editing={editing}
        uiVisible={false} // Hide all built-in UI
        onObjectHover={handleObjectHover}
        onSceneProjectSaved={updateSceneProject}
        onRefreshWorlds={onRefreshWorlds}
        refreshingWorlds={refreshingWorlds}
      />
    </div>
  )
}
