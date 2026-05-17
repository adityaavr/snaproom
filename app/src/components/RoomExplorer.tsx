import { useState, useCallback } from 'react'
import * as React from 'react'
import { Upload, Share, Gear, Eye, EyeSlash, SpeakerHigh, SpeakerSlash, ArrowsOut, Question, Tag, Scan } from '@phosphor-icons/react'
import { AppButton } from './AppButton'
import { useAudioStore } from '../store/audio'
import { useDebugStore, type ControllerMode } from '../store/debug'
import { useSemanticStore } from '../store/semantic'
import { ViewerQuality } from '../types/world'
import { clearSemanticLayer } from '../features/semantic-labels/semanticStorage'

interface Props {
  roomName: string
  roomSlug: string
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

export function RoomExplorer({ roomName, roomSlug, onNewRoom, onShareRoom, children }: Props) {
  const [showControls, setShowControls] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  
  const muted = useAudioStore((s) => s.muted)
  const toggleMuted = useAudioStore((s) => s.toggleMuted)
  const controllerMode = useDebugStore((s) => s.controllerMode)
  const setControllerMode = useDebugStore((s) => s.setControllerMode)
  const viewerQuality = useDebugStore((s) => s.viewerQuality)
  const setViewerQuality = useDebugStore((s) => s.setViewerQuality)
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
        if (e.shiftKey) {
          doTriggerScan()
        } else {
          toggleLabels()
        }
        break
    }
  }, [controllerMode, viewerQuality, setControllerMode, setViewerQuality, toggleMuted, toggleLabels, doTriggerScan])

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Viewer */}
      {children}

      {/* Top Bar */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center">
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <div className="w-4 h-4 bg-white/90 rounded-sm" />
            </div>
            <span className="text-white font-semibold">{roomName}</span>
          </div>
          
          <div className="flex gap-2">
            <AppButton
              onClick={doTriggerScan}
              disabled={scanStatus === 'scanning'}
              className={`bg-black/40 backdrop-blur-sm border hover:bg-white/10 text-white px-4 py-2 flex items-center gap-2 ${scanStatus === 'scanning' ? 'border-cyan-500/50 text-cyan-200' : 'border-white/20'}`}
            >
              <Scan size={16} className={scanStatus === 'scanning' ? 'animate-pulse text-cyan-400' : ''} />
              <span className="hidden sm:inline">{scanStatus === 'scanning' ? 'Scanning...' : 'Scan Room'}</span>
            </AppButton>
            <AppButton
              onClick={onNewRoom}
              className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white px-4 py-2 flex items-center gap-2"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">New Room</span>
            </AppButton>
            
            {onShareRoom && (
              <AppButton
                onClick={onShareRoom}
                className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white px-4 py-2 flex items-center gap-2"
              >
                <Share size={16} />
                Share
              </AppButton>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
          {/* Movement Mode */}
          <AppButton
            onClick={() => setControllerMode(nextMode(CONTROLLER_MODES, controllerMode))}
            className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white px-3 py-2 flex items-center gap-2 text-sm"
          >
            <ArrowsOut size={16} />
            {currentControllerMode.label}
          </AppButton>

          {/* Audio */}
          <AppButton
            onClick={toggleMuted}
            className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white p-2"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
          </AppButton>

          {/* Quality */}
          <AppButton
            onClick={() => setViewerQuality(nextMode(QUALITY_MODES, viewerQuality))}
            className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white px-3 py-2 flex items-center gap-2 text-sm"
          >
            <Gear size={16} />
            {currentQuality.label}
          </AppButton>

          {/* Help */}
          <AppButton
            onClick={() => setShowHelp(prev => !prev)}
            className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white p-2"
            title="Help"
          >
            <Question size={16} />
          </AppButton>

          {/* Labels */}
          <AppButton
            onClick={toggleLabels}
            className={`bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 px-3 py-2 flex items-center gap-2 text-sm ${labelsVisible ? 'text-cyan-400' : 'text-white'}`}
            title={labelsVisible ? 'Hide Labels' : 'Show Labels'}
          >
            <Tag size={16} weight={labelsVisible ? 'fill' : 'regular'} />
            {anchors.length > 0 && <span>{anchors.length}</span>}
          </AppButton>

          {/* Clear Labels */}
          {anchors.length > 0 && (
            <AppButton
              onClick={() => {
                clearAnchors()
                clearSemanticLayer(roomSlug)
              }}
              className="bg-black/40 backdrop-blur-sm border border-red-500/30 hover:bg-red-500/20 text-red-400 px-3 py-2 text-sm"
              title="Clear all labels"
            >
              ✕
            </AppButton>
          )}
        </div>
      )}

      {/* Hide UI Toggle */}
      <div className="absolute bottom-4 right-4 z-30">
        <AppButton
          onClick={() => setShowControls(prev => !prev)}
          className="bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/10 text-white p-2"
          title={showControls ? 'Hide Controls' : 'Show Controls'}
        >
          {showControls ? <EyeSlash size={16} /> : <Eye size={16} />}
        </AppButton>
      </div>

      {/* Help Panel */}
      {showHelp && showControls && (
        <div className="absolute inset-4 z-40 flex items-center justify-center">
          <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h3 className="text-white font-medium">Controls</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
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
                  <div className="flex justify-between text-cyan-200">
                    <span>L</span>
                    <span>Toggle labels</span>
                  </div>
                  <div className="flex justify-between text-cyan-200">
                    <span>Shift + L</span>
                    <span>Scan room</span>
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
    </div>
  )
}
