import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Gear, Globe, Cube, SpeakerHigh, Eye, Pulse } from '@phosphor-icons/react'
import { AppButton } from './AppButton'
import { FloorPlanProcessor } from '../services/floorplanProcessor'

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

export function ProcessingInterface({ roomName, fileCount, uploadedFiles, onComplete, onCancel }: Props) {
  const [, setCurrentStepIndex] = useState(0)
  const [generatedWorldSlug, setGeneratedWorldSlug] = useState<string | null>(null)
  
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

  // Process the uploaded files based on type
  useEffect(() => {
    const processSteps = async () => {
      try {
        for (let i = 0; i < steps.length; i++) {
          // Update current step to running
          setCurrentStepIndex(i)
          setSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index === i ? 'running' : index < i ? 'completed' : 'pending'
          })))

          const currentStep = steps[i]
          
          // Handle different processing steps
          if (hasFloorPlans) {
            switch (currentStep.id) {
              case 'upload':
                // Simulate file upload
                await new Promise(resolve => setTimeout(resolve, 2000))
                break
                
              case 'floorplan-analysis':
                // Analyze floor plan structure
                await new Promise(resolve => setTimeout(resolve, 3000))
                break
                
              case 'room-generation':
                // Generate realistic room images from floor plan
                console.log('🏠 Starting floor plan to room image generation...')
                const floorPlanResult = await FloorPlanProcessor.processFloorPlanToWorld({
                  uploadedFiles,
                  roomName
                })
                
                if (!floorPlanResult.success) {
                  console.error('Floor plan processing failed:', floorPlanResult.error)
                  // Continue anyway for demo purposes
                }
                console.log('✅ Generated room images:', floorPlanResult.roomImages)
                console.log('🌍 World generation status:', floorPlanResult.worldGenerated)
                
                // Store the generated world slug
                if (floorPlanResult.worldSlug) {
                  setGeneratedWorldSlug(floorPlanResult.worldSlug)
                }
                break
                
              case 'world':
                // Convert generated images to 3D environment
                await new Promise(resolve => setTimeout(resolve, 4000))
                break
                
              case 'audio':
                // Generate ambient audio
                await new Promise(resolve => setTimeout(resolve, 2000))
                break
            }
          } else {
            // Regular photo processing pipeline
            switch (currentStep.id) {
              case 'upload':
                await new Promise(resolve => setTimeout(resolve, 2000))
                break
                
              case 'analysis':
                console.log('📸 Processing regular photos...')
                const photoResult = await FloorPlanProcessor.processRegularPhotos({
                  uploadedFiles,
                  roomName
                })
                
                if (!photoResult.success) {
                  console.error('Photo processing failed:', photoResult.error)
                }
                break
                
              case 'world':
                await new Promise(resolve => setTimeout(resolve, 5000))
                break
                
              case 'objects':
                await new Promise(resolve => setTimeout(resolve, 4000))
                break
                
              case 'audio':
                await new Promise(resolve => setTimeout(resolve, 2000))
                break
            }
          }

          // Mark step as completed
          setSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index <= i ? 'completed' : 'pending'
          })))
        }

        // All steps completed, use generated world slug or fallback
        const roomSlug = generatedWorldSlug || roomName.toLowerCase()
          .replace(/[^a-z0-9\s]/gi, '')
          .replace(/\s+/g, '-')
          .slice(0, 30)
        
        console.log('🎯 Completing processing with world slug:', roomSlug)
        
        // Small delay before completing
        setTimeout(() => onComplete(roomSlug), 1000)
        
      } catch (error) {
        console.error('Processing error:', error)
        // Mark current step as error
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: step.status === 'running' ? 'error' : step.status
        })))
      }
    }

    processSteps()
  }, [roomName, onComplete, hasFloorPlans, steps, uploadedFiles])

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
                  <p className="text-sm text-[var(--text-2)]">{step.description}</p>
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
