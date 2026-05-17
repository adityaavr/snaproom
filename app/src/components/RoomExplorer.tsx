import { useState, useCallback } from 'react'
import * as React from 'react'
import {
  Upload,
  Share,
  Gear,
  Eye,
  EyeSlash,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsOut,
  Question,
  DeviceMobile,
  Tag,
  Scan,
  Trash,
  type Icon,
} from '@phosphor-icons/react'
import { AppButton } from './AppButton'
import { ArQrModal } from './ArQrModal'
import { ViewerModeHotkeys, OBJECT_MODES, WORLD_MODES } from './BottomLeftControls'
import { useAudioStore } from '../store/audio'
import { useDebugStore, type ControllerMode } from '../store/debug'
import { useSemanticStore } from '../store/semantic'
import { clearSemanticLayer } from '../features/semantic-labels/semanticStorage'
import { ViewerQuality } from '../types/world'

interface Props {
  roomName: string
  roomSlug: string
  /** True once the world has finished generating — gates the AR QR action. */
  worldReady?: boolean
  /** The image this room was generated from, shown as an on-canvas reference. */
  sourceImageUrl?: string
  onNewRoom: () => void
  onShareRoom?: () => void
  children?: React.ReactNode
}

const CONTROLLER_MODES: readonly { mode: ControllerMode; label: string }[] = [
  { mode: 'fly', label: 'Fly' },
  { mode: 'fps', label: 'Walk' },
]

const QUALITY_MODES = [
  { mode: ViewerQuality.Low, label: 'Low' },
  { mode: ViewerQuality.High, label: 'High' },
] as const

function nextMode<T>(items: readonly { mode: T }[], current: T) {
  const index = items.findIndex((item) => item.mode === current)
  return items[(index + 1) % items.length].mode
}

/** A segmented icon group for a 3D render mode (scene visibility / object shading). */
function ModeGroup<T extends string>({
  modes,
  active,
  onSelect,
}: {
  modes: readonly { readonly mode: T; readonly Icon: Icon; readonly label: string }[]
  active: T
  onSelect: (mode: T) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-black/45 p-1 backdrop-blur-sm">
      {modes.map(({ mode, Icon: ModeIcon, label }) => {
        const isActive = active === mode
        return (
          <button
            key={String(mode)}
            type="button"
            onClick={() => onSelect(mode)}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
              isActive ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ModeIcon size={16} weight={isActive ? 'fill' : 'regular'} />
          </button>
        )
      })}
    </div>
  )
}

export function RoomExplorer({
  roomName,
  roomSlug,
  worldReady,
  sourceImageUrl,
  onNewRoom,
  onShareRoom,
  children,
}: Props) {
  const [showControls, setShowControls] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showAr, setShowAr] = useState(false)
  const [refExpanded, setRefExpanded] = useState(false)
  const [refError, setRefError] = useState(false)

  const muted = useAudioStore((s) => s.muted)
  const toggleMuted = useAudioStore((s) => s.toggleMuted)
  const controllerMode = useDebugStore((s) => s.controllerMode)
  const setControllerMode = useDebugStore((s) => s.setControllerMode)
  const viewerQuality = useDebugStore((s) => s.viewerQuality)
  const setViewerQuality = useDebugStore((s) => s.setViewerQuality)
  const worldRenderMode = useDebugStore((s) => s.worldRenderMode)
  const setWorldRenderMode = useDebugStore((s) => s.setWorldRenderMode)
  const objectRenderMode = useDebugStore((s) => s.objectRenderMode)
  const setObjectRenderMode = useDebugStore((s) => s.setObjectRenderMode)
  const { labelsVisible, toggleLabels, scanStatus, doTriggerScan, clearAnchors, anchors } = useSemanticStore()

  const currentControllerMode = CONTROLLER_MODES.find(item => item.mode === controllerMode) ?? CONTROLLER_MODES[0]
  const currentQuality = QUALITY_MODES.find(item => item.mode === viewerQuality) ?? QUALITY_MODES[0]

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.target && (e.target as Element).tagName === 'INPUT') return

    switch (e.key.toLowerCase()) {
      case 'h':
        setShowHelp(prev => !prev)
        break
      case 'u':
        setShowControls(prev => !prev)
        break
      case 'm':
        toggleMuted()
        break
      case 'c':
        setControllerMode(nextMode(CONTROLLER_MODES, controllerMode))
        break
      case 'q':
        setViewerQuality(nextMode(QUALITY_MODES, viewerQuality))
        break
      case 'l':
        if (e.shiftKey) doTriggerScan()
        else toggleLabels()
        break
    }
  }, [controllerMode, viewerQuality, setControllerMode, setViewerQuality, toggleMuted, toggleLabels, doTriggerScan])

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const showReference = showControls && Boolean(sourceImageUrl) && !refError

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Viewer */}
      {children}

      {/* Alt+digit / Shift+digit shortcuts for render modes */}
      <ViewerModeHotkeys />

      {/* Top Bar */}
      {showControls && (
        <div className="absolute left-3 right-3 top-3 z-30 flex items-center justify-between gap-3 md:left-4 md:right-4 md:top-4">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-black/55 px-4 py-3 backdrop-blur-md">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-black/35">
              <div className="h-4 w-4 rounded-sm bg-[var(--accent)]" />
            </div>
            <span className="text-white font-semibold">{roomName}</span>
          </div>

          <div className="flex gap-2">
            {worldReady && (
              <AppButton
                onClick={() => setShowAr(true)}
                className="bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white px-4 py-2 flex items-center gap-2 font-medium shadow-lg shadow-cyan-500/20"
              >
                <DeviceMobile size={16} />
                View in AR
              </AppButton>
            )}

            <AppButton
              onClick={doTriggerScan}
              disabled={scanStatus === 'scanning'}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-white backdrop-blur-sm ${
                scanStatus === 'scanning'
                  ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200'
                  : 'border-[var(--line)] bg-black/45 hover:bg-black/70'
              }`}
              title="Scan the room for semantic labels"
            >
              <Scan size={16} className={scanStatus === 'scanning' ? 'animate-pulse text-cyan-300' : ''} />
              <span className="hidden sm:inline">{scanStatus === 'scanning' ? 'Scanning…' : 'Scan Room'}</span>
            </AppButton>

            <AppButton
              onClick={onNewRoom}
              className="hidden items-center gap-2 rounded-lg border border-[var(--line)] bg-black/45 px-3 py-2 text-white backdrop-blur-sm hover:bg-black/70 sm:inline-flex"
            >
              <Upload size={16} />
              New Room
            </AppButton>

            {onShareRoom && (
              <AppButton
                onClick={onShareRoom}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-black/45 px-3 py-2 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <Share size={16} />
                <span className="hidden sm:inline">Share</span>
              </AppButton>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-30 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2">
          {/* Movement Mode */}
          <AppButton
            onClick={() => setControllerMode(nextMode(CONTROLLER_MODES, controllerMode))}
            className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-black/45 px-3 py-2 text-sm text-white backdrop-blur-sm hover:bg-black/70"
          >
            <ArrowsOut size={16} />
            {currentControllerMode.label}
          </AppButton>

          {/* Audio */}
          <AppButton
            onClick={toggleMuted}
            className="rounded-lg border border-[var(--line)] bg-black/45 p-2 text-white backdrop-blur-sm hover:bg-black/70"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
          </AppButton>

          {/* Quality */}
          <AppButton
            onClick={() => setViewerQuality(nextMode(QUALITY_MODES, viewerQuality))}
            className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-black/45 px-3 py-2 text-sm text-white backdrop-blur-sm hover:bg-black/70"
          >
            <Gear size={16} />
            {currentQuality.label}
          </AppButton>

          {/* Help */}
          <AppButton
            onClick={() => setShowHelp(prev => !prev)}
            className="rounded-lg border border-[var(--line)] bg-black/45 p-2 text-white backdrop-blur-sm hover:bg-black/70"
          >
            <Question size={16} />
          </AppButton>

          {/* Semantic labels */}
          <AppButton
            onClick={toggleLabels}
            className={`flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-black/45 px-3 py-2 text-sm backdrop-blur-sm hover:bg-black/70 ${
              labelsVisible ? 'text-cyan-300' : 'text-white'
            }`}
            title={labelsVisible ? 'Hide labels' : 'Show labels'}
          >
            <Tag size={16} weight={labelsVisible ? 'fill' : 'regular'} />
            {anchors.length > 0 && <span>{anchors.length}</span>}
          </AppButton>

          {anchors.length > 0 && (
            <AppButton
              onClick={() => {
                clearAnchors()
                clearSemanticLayer(roomSlug)
              }}
              className="rounded-lg border border-red-500/30 bg-black/45 p-2 text-red-300 backdrop-blur-sm hover:bg-red-500/15"
              title="Clear all labels"
            >
              <Trash size={16} />
            </AppButton>
          )}

          <div className="hidden h-7 w-px bg-[var(--line)] sm:block" />

          {/* Render modes: scene visibility + object shading (wireframe) */}
          <ModeGroup modes={WORLD_MODES} active={worldRenderMode} onSelect={setWorldRenderMode} />
          <ModeGroup modes={OBJECT_MODES} active={objectRenderMode} onSelect={setObjectRenderMode} />
        </div>
      )}

      {/* Bottom-right: source reference + UI toggle */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
        {showReference && (
          <figure className="overflow-hidden rounded-lg border border-[var(--line)] bg-black/55 backdrop-blur-md">
            <figcaption className="flex items-center justify-between gap-6 border-b border-[var(--line)] px-2.5 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                Source image
              </span>
              <button
                type="button"
                onClick={() => setRefExpanded((v) => !v)}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 transition-colors hover:text-[var(--accent)]"
              >
                {refExpanded ? 'Shrink' : 'Expand'}
              </button>
            </figcaption>
            <img
              src={sourceImageUrl}
              alt={`Reference image for ${roomName}`}
              onError={() => setRefError(true)}
              className={`block bg-black/40 object-contain ${refExpanded ? 'h-60 w-80' : 'h-28 w-48'}`}
            />
          </figure>
        )}

        <AppButton
          onClick={() => setShowControls(prev => !prev)}
          className="self-end rounded-lg border border-[var(--line)] bg-black/45 p-2 text-white backdrop-blur-sm hover:bg-black/70"
          title={showControls ? 'Hide Controls' : 'Show Controls'}
        >
          {showControls ? <EyeSlash size={16} /> : <Eye size={16} />}
        </AppButton>
      </div>

      {/* Help Panel */}
      {showHelp && showControls && (
        <div className="absolute inset-4 z-40 flex items-center justify-center">
          <div className="max-h-full w-full max-w-md overflow-hidden rounded-lg border border-[var(--line)] bg-black/85 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[var(--line)] p-4">
              <h3 className="text-white font-medium">Controls</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
              <div>
                <h4 className="text-white/80 font-medium mb-2">Navigation</h4>
                <div className="space-y-1 text-sm text-white/60">
                  <div className="flex justify-between">
                    <span>Mouse/Touch</span>
                    <span>Look around</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WASD / Arrows</span>
                    <span>Move</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scroll / Pinch</span>
                    <span>Zoom</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white/80 font-medium mb-2">Shortcuts</h4>
                <div className="space-y-1 text-sm text-white/60">
                  <div className="flex justify-between">
                    <span>C</span>
                    <span>Switch mode</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M</span>
                    <span>Toggle audio</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Q</span>
                    <span>Toggle quality</span>
                  </div>
                  <div className="flex justify-between">
                    <span>U</span>
                    <span>Toggle UI</span>
                  </div>
                  <div className="flex justify-between text-cyan-300/80">
                    <span>L</span>
                    <span>Toggle labels</span>
                  </div>
                  <div className="flex justify-between text-cyan-300/80">
                    <span>Shift + L</span>
                    <span>Scan room</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shift + 1/2/3</span>
                    <span>Scene render mode</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alt + 1/2/3</span>
                    <span>Object shading</span>
                  </div>
                  <div className="flex justify-between">
                    <span>H</span>
                    <span>This help</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AR QR modal */}
      <ArQrModal
        slug={roomSlug}
        roomName={roomName}
        open={showAr}
        onClose={() => setShowAr(false)}
      />
    </div>
  )
}
