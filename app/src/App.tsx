import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRoute, useLocation, Redirect } from 'wouter'
import { WorldViewer } from './components/WorldViewer'
import { WorldSidebar } from './components/WorldSidebar'
import { BottomLeftControls, ViewerModeHotkeys } from './components/BottomLeftControls'
import { TouchControls } from './components/TouchControls'
import { WelcomeInterface } from './components/WelcomeInterface'
import { UploadInterface } from './components/UploadInterface'
import { ProcessingInterface } from './components/ProcessingInterface'
import { RoomExplorer } from './components/RoomExplorer'
import { CleanWorldViewer } from './components/CleanWorldViewer'
import { useSceneProject } from './modules/scene/useSceneProject'
import { fetchWorlds, loadWorlds } from './utils/worldLoader'
import { useSessionWorlds } from './store/sessionWorlds'
import { useDebugStore } from './store/debug'
import { isEditableTarget } from './utils/dom'
import type { WorldEntry, WorldHoverPreview, WorldObjectAsset } from './types/world'
import { TerminalWindowIcon } from '@phosphor-icons/react'

type AppState = 'welcome' | 'upload' | 'processing' | 'room' | 'legacy'

interface UploadedFile {
  id: string
  file: File
  preview: string
  type: 'photo' | 'floorplan'
}

const LevaPanel = import.meta.env.DEV
  ? lazy(() => import('leva').then((module) => ({ default: module.Leva })))
  : null
const DebugPanel = import.meta.env.DEV
  ? lazy(() => import('./components/DebugPanel').then((module) => ({ default: module.DebugPanel })))
  : null

/** A world is "ready" once it has a generated environment (splats). */
function isWorldReady(entry: WorldEntry | undefined): boolean {
  if (!entry) return false
  if (entry.worldVersions.length > 0) return true
  const spzUrls = entry.world?.assets.splats.spz_urls
  return Boolean(spzUrls && Object.values(spzUrls).some(Boolean))
}

export function App() {
  const [baseWorlds, setBaseWorlds] = useState(loadWorlds)
  const sessionWorlds = useSessionWorlds((s) => s.worlds)
  // Build-time committed worlds, with browser-generated session worlds merged
  // on top (a session world wins if it shares a slug).
  const worlds = useMemo(() => {
    if (sessionWorlds.length === 0) return baseWorlds
    const bySlug = new Map(baseWorlds.map((w) => [w.slug, w]))
    for (const w of sessionWorlds) bySlug.set(w.slug, w)
    return Array.from(bySlug.values())
  }, [baseWorlds, sessionWorlds])
  const [refreshingWorlds, setRefreshingWorlds] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [roomName, setRoomName] = useState('')
  const refreshTimeoutRef = useRef<number | undefined>(undefined)
  
  // Check current URL to determine initial state
  const currentPath = window.location.pathname
  const urlParams = new URLSearchParams(window.location.search)
  const showLegacyInterface = urlParams.get('legacy') === 'true'
  // `?embed=1` renders a chrome-free, touch-first viewer — used by the
  // Snaproom mobile app's WebView when a room is opened from a scanned QR.
  const embedMode = urlParams.get('embed') === '1'
  
  const [appState, setAppState] = useState<AppState>('welcome')
  const [currentRoomSlug, setCurrentRoomSlug] = useState<string | null>(null)
  // Mirror appState in a ref so the URL-sync effect can read the live value
  // without depending on it (which would re-run and clobber the flow).
  const appStateRef = useRef(appState)
  appStateRef.current = appState

  // Initialize app state from the URL. This effect also re-runs whenever the
  // worlds list refreshes (dev HMR) so deep links can resolve once worlds load.
  // It must NOT interrupt an active upload/processing flow or an open room:
  // during those the URL is still "/", and a refresh would otherwise bounce
  // the user back to the welcome screen.
  useEffect(() => {
    if (showLegacyInterface) {
      setAppState('legacy')
      return
    }

    // A path like /bedroom: resolve it to that room once the world is known.
    const slugFromPath = currentPath.slice(1).split('/')[0]
    const foundWorld = worlds.find(w => w.slug === slugFromPath)

    if (slugFromPath && foundWorld) {
      setAppState('room')
      setCurrentRoomSlug(slugFromPath)
      setRoomName(foundWorld.project?.display_name || foundWorld.slug)
      return
    }

    // Root URL with no matching world: welcome is the default, but never
    // override a flow the user is actively in.
    const current = appStateRef.current
    if (current === 'upload' || current === 'processing' || current === 'room') return
    setAppState('welcome')
  }, [currentPath, worlds, showLegacyInterface])
  
  // Check if we have worlds
  const hasWorlds = worlds.length > 0

  const refreshWorlds = useCallback(async () => {
    if (!import.meta.env.DEV) return
    setRefreshingWorlds(true)
    try {
      setBaseWorlds(await fetchWorlds())
    } catch (error) {
      console.warn('Could not refresh local world assets.', error)
    } finally {
      setRefreshingWorlds(false)
    }
  }, [])

  useEffect(() => {
    refreshWorlds()
  }, [refreshWorlds])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const refreshSoon = () => {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = window.setTimeout(() => {
        void refreshWorlds()
      }, 150)
    }

    import.meta.hot?.on('worlds-changed', refreshSoon)
    return () => {
      window.clearTimeout(refreshTimeoutRef.current)
      import.meta.hot?.off('worlds-changed', refreshSoon)
    }
  }, [refreshWorlds])

  // Handle different app states
  if (appState === 'legacy' || showLegacyInterface) {
    // Show legacy developer interface
    if (!worlds.length) {
      return (
        <div className="flex items-center justify-center h-screen text-white bg-black">
          No worlds found in worlds/
        </div>
      )
    }
    
    return (
      <LoadedApp
        worlds={worlds}
        refreshingWorlds={refreshingWorlds}
        onRefreshWorlds={refreshWorlds}
      />
    )
  }
  
  // New user interface flow
  if (appState === 'welcome') {
    return (
      <WelcomeInterface 
        onStartUpload={() => setAppState('upload')}
        recentRooms={hasWorlds ? worlds.map(w => ({
          slug: w.slug,
          name: w.project?.display_name || w.slug,
          createdAt: new Date() // TODO: Get actual creation date
        })) : []}
        onOpenRoom={(slug) => {
          // Navigate to the room URL
          window.history.pushState(null, '', `/${slug}`)
          setCurrentRoomSlug(slug)
          setAppState('room')
          const foundWorld = worlds.find(w => w.slug === slug)
          setRoomName(foundWorld?.project?.display_name || foundWorld?.slug || slug)
        }}
      />
    )
  }
  
  if (appState === 'upload') {
    return (
      <UploadInterface 
        onStartProcessing={(files, name) => {
          setUploadedFiles(files)
          setRoomName(name)
          setAppState('processing')
        }}
        onCancel={() => setAppState('welcome')}
      />
    )
  }
  
  if (appState === 'processing') {
    return (
      <ProcessingInterface 
        roomName={roomName}
        fileCount={uploadedFiles.length}
        uploadedFiles={uploadedFiles}
        onComplete={(slug) => {
          // Make the finished room URL-addressable so a reload (or the
          // worlds-list refresh) resolves back to it instead of welcome.
          window.history.pushState(null, '', `/${slug}`)
          setCurrentRoomSlug(slug)
          setAppState('room')
        }}
        onCancel={() => setAppState('welcome')}
      />
    )
  }
  
  if (appState === 'room' && currentRoomSlug) {
    const roomWorld = worlds.find(w => w.slug === currentRoomSlug)
    
    if (roomWorld) {
      // Chrome-free viewer for the mobile app's WebView.
      if (embedMode) {
        return (
          <div className="relative w-screen h-screen overflow-hidden bg-black">
            <CleanWorldViewer
              worlds={worlds}
              targetSlug={currentRoomSlug}
              refreshingWorlds={refreshingWorlds}
              onRefreshWorlds={refreshWorlds}
            />
            <TouchControls />
          </div>
        )
      }

      return (
        <RoomExplorer
          roomName={roomName || roomWorld.slug}
          roomSlug={currentRoomSlug}
          worldReady={isWorldReady(roomWorld)}
          sourceImageUrl={roomWorld.sourceImageUrl}
          onNewRoom={() => {
            // Drop the room slug from the URL so a worlds refresh doesn't
            // resolve the old path straight back into the room.
            window.history.pushState(null, '', '/')
            setAppState('welcome')
            setCurrentRoomSlug(null)
            setRoomName('')
            setUploadedFiles([])
          }}
          onShareRoom={() => {
            // TODO: Implement sharing
            console.log('Share room:', currentRoomSlug)
          }}
        >
          <CleanWorldViewer
            worlds={worlds}
            targetSlug={currentRoomSlug}
            refreshingWorlds={refreshingWorlds}
            onRefreshWorlds={refreshWorlds}
          />
        </RoomExplorer>
      )
    } else {
      // Room not found, show placeholder or loading
      return (
        <div className="flex items-center justify-center h-screen text-white bg-black">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
            <p>Loading your 3D room...</p>
          </div>
        </div>
      )
    }
  }
  
  // Fallback - should not reach here with new logic
  return (
    <WelcomeInterface 
      onStartUpload={() => setAppState('upload')}
      recentRooms={[]}
    />
  )
}

function LoadedApp({
  worlds,
  refreshingWorlds,
  onRefreshWorlds,
  targetSlug,
}: {
  worlds: WorldEntry[]
  refreshingWorlds: boolean
  onRefreshWorlds: () => void
  targetSlug?: string
}) {
  const [editMatch, editParams] = useRoute('/:slug/edit')
  const [match, params] = useRoute('/:slug')
  const levaCollapsed = useDebugStore((s) => s.levaCollapsed)
  const setLevaCollapsed = useDebugStore((s) => s.setLevaCollapsed)
  const [location] = useLocation()
  const [uiHidden, setUiHidden] = useState(false)
  const [sceneProjectEnabled, setSceneProjectEnabled] = useState(true)
  const [selectedWorldVersions, setSelectedWorldVersions] = useState<Record<string, number>>({})
  const [hoveredObjectAssetId, setHoveredObjectAssetId] = useState<string | null>(null)
  const [hoveredObjectInstanceId, setHoveredObjectInstanceId] = useState<string | null>(null)
  const [hoveredWorldPreview, setHoveredWorldPreview] = useState<WorldHoverPreview | null>(null)

  const slug = targetSlug ?? editParams?.slug ?? params?.slug ?? worlds[0]?.slug
  const entry = worlds.find((w) => w.slug === slug) ?? worlds[0]
  const editing = Boolean(editMatch)
  const showLeva = import.meta.env.VITE_SHOW_LEVA === 'true'
  const uiVisible = !uiHidden
  const defaultWorldVersionIndex = entry.worldVersions[entry.worldVersions.length - 1]?.index
  const activeWorldVersionIndex = selectedWorldVersions[entry.slug] ?? defaultWorldVersionIndex
  const activeWorldVersion = entry.worldVersions.find((version) => version.index === activeWorldVersionIndex)
  const activeWorld = activeWorldVersion?.world ?? entry.world
  const renderableObjectAssets = entry.objectAssets.filter((asset) => asset.complete && asset.url)
  const renderableAllObjectAssets = entry.allObjectAssets.filter((asset) => asset.complete && asset.url)
  const hasSidebarWorldRow = Boolean(activeWorldVersion || (activeWorld && Object.values(activeWorld.assets.splats.spz_urls).some(Boolean)))
  const emptyWorld = !hasSidebarWorldRow && !entry.objectAssets.length
  const { sceneProject, sceneProjectReady, updateSceneProject } = useSceneProject(entry.slug, location, entry.sceneProject)
  const sceneProjectActive = Boolean(sceneProject && sceneProjectEnabled)

  useEffect(() => {
    setSceneProjectEnabled(true)
    setHoveredObjectAssetId(null)
    setHoveredObjectInstanceId(null)
    setHoveredWorldPreview(null)
  }, [entry.slug])

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

  const handleWorldHover = useCallback((preview: WorldHoverPreview, hovering: boolean) => {
    setHoveredWorldPreview((current) => {
      if (hovering) return preview
      return current?.slug === preview.slug ? null : current
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.code !== 'Backquote') return
      event.preventDefault()
      setUiHidden((hidden) => !hidden)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!targetSlug && !editMatch && !match && worlds.length > 0) {
    return <Redirect to={`/${worlds[0].slug}`} />
  }
  
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
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none [&_*]:focus:outline-none [&_*]:focus-visible:outline-none [&_*]:focus:ring-0 [&_*]:focus-visible:ring-0">
      <ViewerModeHotkeys />
      {!editing && LevaPanel && DebugPanel && showLeva && uiVisible && (
        <div className="hidden md:block">
          <Suspense fallback={null}>
            <LevaPanel
              collapsed={{ collapsed: levaCollapsed, onChange: setLevaCollapsed }}
              theme={{ sizes: { rootWidth: '380px', controlWidth: '180px' } }}
            />
            <DebugPanel />
          </Suspense>
        </div>
      )}
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
        uiVisible={uiVisible}
        onObjectHover={handleObjectHover}
        onSceneProjectSaved={updateSceneProject}
        onRefreshWorlds={onRefreshWorlds}
        refreshingWorlds={refreshingWorlds}
      />
      {!editing && uiVisible && emptyWorld && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-6 gap-2">
          <div className="bg-black/25 rounded px-2 py-1 flex items-center gap-2">
            <TerminalWindowIcon size={18} weight="regular" className='animate-pulse' />
            <span className="truncate text-center font-mono text-sm text-white/75">
              waiting for objects and environment...
            </span>
          </div>
        </div>
      )}
      {uiVisible && (
        <div className={`fixed inset-x-4 top-4 sm:left-4 sm:right-auto ${editing ? 'z-30' : 'z-10'}`}>
          <WorldSidebar
            worlds={worlds}
            activeSlug={entry.slug}
            compact={editing}
            activeSceneProject={sceneProject}
            activeSceneProjectEnabled={sceneProjectActive}
            onActiveSceneProjectToggle={() => setSceneProjectEnabled((enabled) => !enabled)}
            activeWorldVersionIndex={activeWorldVersionIndex}
            hoveredObjectAssetId={hoveredObjectAssetId}
            hoveredObjectInstanceId={hoveredObjectInstanceId}
            onObjectHover={handleObjectHover}
            onWorldHover={handleWorldHover}
            onActiveWorldVersionChange={(index) => setSelectedWorldVersions((versions) => ({
              ...versions,
              [entry.slug]: index,
            }))}
          />
        </div>
      )}
      {!editing && uiVisible && (
        <>
          <TouchControls />
        </>
      )}
      {uiVisible && (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4 sm:left-4 sm:right-auto sm:justify-start sm:px-0">
          <BottomLeftControls />
        </div>
      )}
    </div>
  )
}
