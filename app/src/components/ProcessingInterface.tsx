import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Clock, Gear, Globe, Cube, SpeakerHigh, Eye, Pulse } from '@phosphor-icons/react'
import { AppButton } from './AppButton'

interface ProcessingStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  icon: React.ReactNode
  estimatedTime?: string
}

interface UploadedFile {
  id: string
  file: File
  preview: string
  type: 'photo' | 'floorplan'
}

interface Props {
  roomName: string
  fileCount: number
  uploadedFiles: UploadedFile[]
  onComplete: (roomSlug: string) => void
  onCancel?: () => void
}

function slugifyRoomName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'room'
  )
}

/**
 * Read a File as base64 with no data-URI prefix. FileReader is used instead of
 * btoa(String.fromCharCode(...bytes)) because the spread overflows the call
 * stack on multi-MB images.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Trigger world generation via the dev-server endpoint. A photo goes straight
 * to World Labs; a floor plan is first rendered into a photoreal interior by
 * FAL, then handed to World Labs. Throws on failure — no silent fallback.
 */
async function requestWorldGeneration(
  file: File,
  roomName: string,
  worldSlug: string,
  isFloorplan: boolean,
) {
  const data = await fileToBase64(file)
  const response = await fetch('/__upload-and-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, data, roomName, worldSlug, isFloorplan }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`World generation request failed (${response.status}). ${detail}`.trim())
  }
  return (await response.json()) as { worldSlug: string; command?: string }
}

export function ProcessingInterface({ roomName, fileCount, uploadedFiles, onComplete, onCancel }: Props) {
  const [, setCurrentStepIndex] = useState(0)
  const startedRef = useRef(false)

  // Check if we have floor plans to determine processing pipeline
  const hasFloorPlans = uploadedFiles.some(file => file.type === 'floorplan')

  const [steps, setSteps] = useState<ProcessingStep[]>(hasFloorPlans ? [
    {
      id: 'upload',
      title: 'Uploading Floor Plans',
      description: 'Sending your floor plan to our processing servers',
      status: 'running',
      icon: <Globe size={20} />,
      estimatedTime: '30s'
    },
    {
      id: 'floorplan-analysis',
      title: 'Analyzing Floor Plan',
      description: 'Understanding room layout and architectural elements',
      status: 'pending',
      icon: <Eye size={20} />,
      estimatedTime: '1-2 min'
    },
    {
      id: 'room-generation',
      title: 'Generating Room Images',
      description: 'Creating realistic room visuals from floor plan using AI',
      status: 'pending',
      icon: <Gear size={20} />,
      estimatedTime: '3-4 min'
    },
    {
      id: 'world',
      title: 'Building 3D Environment',
      description: 'Converting generated images to walkable 3D space',
      status: 'pending',
      icon: <Cube size={20} />,
      estimatedTime: '4-5 min'
    },
    {
      id: 'audio',
      title: 'Adding Ambient Sounds',
      description: 'Generating room-appropriate audio atmosphere',
      status: 'pending',
      icon: <SpeakerHigh size={20} />,
      estimatedTime: '1-2 min'
    }
  ] : [
    {
      id: 'upload',
      title: 'Uploading Images',
      description: 'Sending your photos to our processing servers',
      status: 'running',
      icon: <Globe size={20} />,
      estimatedTime: '30s'
    },
    {
      id: 'analysis',
      title: 'Analyzing Room Structure',
      description: 'Understanding the layout and identifying objects',
      status: 'pending',
      icon: <Eye size={20} />,
      estimatedTime: '2-3 min'
    },
    {
      id: 'world',
      title: 'Building 3D Environment',
      description: 'Creating the walkable 3D space and textures',
      status: 'pending',
      icon: <Cube size={20} />,
      estimatedTime: '3-4 min'
    },
    {
      id: 'objects',
      title: 'Generating 3D Objects',
      description: 'Creating furniture and object models',
      status: 'pending',
      icon: <Gear size={20} />,
      estimatedTime: '2-3 min'
    },
    {
      id: 'audio',
      title: 'Adding Ambient Sounds',
      description: 'Generating room-appropriate audio atmosphere',
      status: 'pending',
      icon: <SpeakerHigh size={20} />,
      estimatedTime: '1-2 min'
    }
  ])

  // Drive the pipeline exactly once on mount. The `world` step performs the
  // real World Labs generation; the other steps are visual progress only.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const worldSlug = slugifyRoomName(roomName)

    const runStep = async (stepId: string) => {
      if (stepId !== 'world') {
        // Analysis / objects / audio are not wired to backends yet.
        await new Promise(resolve => setTimeout(resolve, 1500))
        return
      }

      const primary = uploadedFiles[0]
      if (!primary) {
        throw new Error('No uploaded image is available to generate a world from.')
      }

      const isFloorplan = primary.type === 'floorplan'
      console.log(
        `🌍 Generating world "${worldSlug}" from ${primary.file.name}` +
          (isFloorplan ? ' (floor plan → FAL interior → World Labs)…' : ' via World Labs…'),
      )
      const result = await requestWorldGeneration(primary.file, roomName, worldSlug, isFloorplan)
      console.log('✅ Generation started:', result.command ?? worldSlug)
    }

    const processSteps = async () => {
      try {
        for (let i = 0; i < steps.length; i++) {
          setCurrentStepIndex(i)
          setSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index === i ? 'running' : index < i ? 'completed' : 'pending'
          })))

          await runStep(steps[i].id)

          setSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index <= i ? 'completed' : step.status
          })))
        }

        console.log('🎯 Processing complete, opening world:', worldSlug)
        setTimeout(() => onComplete(worldSlug), 1000)
      } catch (error) {
        console.error('Processing error:', error)
        setSteps(prev => prev.map(step => ({
          ...step,
          status: step.status === 'running' ? 'error' : step.status
        })))
      }
    }

    processSteps()
    // Mount-only: startedRef guards against React re-running this effect.
  }, [])

  const totalEstimatedTime = hasFloorPlans ? "9-14 minutes" : "8-13 minutes"
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const progressPercentage = (completedSteps / steps.length) * 100

  return (
    <div className="min-h-screen px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">
              {hasFloorPlans ? 'Converting floor plan to 3D room' : 'Building your 3D room'}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              {roomName} • {fileCount} {hasFloorPlans ? 'floor plan' : 'images'}{fileCount !== 1 ? 's' : ''} • {totalEstimatedTime}
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-3)]">
            <p>{Math.round(progressPercentage)}%</p>
            <p>{completedSteps}/{steps.length}</p>
          </div>
        </div>

        <div className="mb-4 h-2 w-full rounded-full bg-black/35">
          <div
            className="h-2 rounded-full bg-[var(--accent)] transition-all duration-1000 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`rounded-lg border p-3 ${
                step.status === 'running'
                  ? 'border-[var(--accent)]/55 bg-black/35'
                  : step.status === 'completed'
                    ? 'border-emerald-400/35 bg-emerald-500/10'
                    : step.status === 'error'
                      ? 'border-red-400/45 bg-red-500/10'
                      : 'border-[var(--line)] bg-black/15'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[var(--text-2)]">
                  {step.status === 'completed' ? (
                    <CheckCircle size={18} weight="fill" className="text-emerald-300" />
                  ) : step.status === 'running' ? (
                    <Pulse size={18} className="animate-pulse text-[var(--accent)]" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{index + 1}. {step.title}</h3>
                    {step.status === 'running' && step.estimatedTime && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <Clock size={11} />
                        {step.estimatedTime}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-2)]">
                    {step.status === 'error' ? 'This step failed — see the browser console for details.' : step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {onCancel && (
          <AppButton
            onClick={onCancel}
            className="mt-4 w-full justify-center rounded-lg border border-[var(--line)] bg-black/25 py-2 text-[var(--text-2)] hover:bg-black/40"
          >
            Cancel run
          </AppButton>
        )}
      </div>
    </div>
  )
}
