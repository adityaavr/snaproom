import { useState, useCallback, useRef } from 'react'
import { Upload, Camera, House, ArrowRight, X, CheckCircle } from '@phosphor-icons/react'
import { AppButton } from './AppButton'

interface UploadedFile {
  id: string
  file: File
  preview: string
  type: 'photo' | 'floorplan'
}

interface Props {
  onStartProcessing: (files: UploadedFile[], roomName: string) => void
  onCancel?: () => void
}

export function UploadInterface({ onStartProcessing, onCancel }: Props) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [roomName, setRoomName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((files: FileList) => {
    const newFiles: UploadedFile[] = []
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const id = Math.random().toString(36).substr(2, 9)
        const preview = URL.createObjectURL(file)
        
        // Enhanced heuristic to detect floorplans vs photos
        const isFloorplan = file.name.toLowerCase().includes('floor') || 
                           file.name.toLowerCase().includes('plan') ||
                           file.name.toLowerCase().includes('layout') ||
                           file.name.toLowerCase().includes('blueprint') ||
                           file.name.toLowerCase().includes('schematic')
        
        newFiles.push({
          id,
          file,
          preview,
          type: isFloorplan ? 'floorplan' : 'photo'
        })
      }
    })
    
    setUploadedFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      // Revoke object URL to prevent memory leaks
      const removed = prev.find(f => f.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }, [])

  const toggleFileType = useCallback((id: string) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === id 
        ? { ...file, type: file.type === 'photo' ? 'floorplan' : 'photo' }
        : file
    ))
  }, [])

  const canStartProcessing = uploadedFiles.length > 0 && roomName.trim().length > 0
  const hasFloorPlan = uploadedFiles.some(file => file.type === 'floorplan')
  const hasPhotos = uploadedFiles.some(file => file.type === 'photo')

  const handleStartProcessing = useCallback(() => {
    if (canStartProcessing) {
      onStartProcessing(uploadedFiles, roomName.trim())
    }
  }, [uploadedFiles, roomName, canStartProcessing, onStartProcessing])

  return (
    <div className="min-h-screen px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Upload source images</h1>
            {onCancel && (
              <AppButton onClick={onCancel} className="h-8 w-8 justify-center rounded-md border border-[var(--line)] p-1">
                <X size={16} />
              </AppButton>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[var(--text-2)]">Room name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Living room"
                className="w-full rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`rounded-lg border border-dashed p-6 text-center ${dragOver ? 'border-[var(--accent)] bg-black/35' : 'border-[var(--line)] bg-black/15'}`}
            >
              <Upload size={30} className="mx-auto text-[var(--accent)]" />
              <p className="mt-2 text-sm text-[var(--text-2)]">
                Drag images here or{' '}
                <button onClick={() => fileInputRef.current?.click()} className="underline underline-offset-4 text-[var(--text-1)]">
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                ✨ <strong>New:</strong> Upload floor plans to automatically generate realistic room images, then convert to 3D spaces
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="rounded-lg border border-[var(--line)] bg-black/15 p-3">
                <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-2)]">
                  <span>Files</span>
                  <span>{uploadedFiles.length}</span>
                </div>
                {hasFloorPlan && (
                  <div className="mb-2 rounded px-2 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    🏗️ Floor plan detected! This will be converted to realistic room images using AI architectural visualization.
                  </div>
                )}
                {hasFloorPlan && hasPhotos && (
                  <div className="mb-2 rounded px-2 py-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    ⚠️ Mixed content: Floor plans and photos detected. Floor plan workflow will take priority.
                  </div>
                )}
                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="group relative">
                      <div className="aspect-square overflow-hidden rounded-md border border-[var(--line)] bg-black/30">
                        <img src={file.preview} alt={file.file.name} className="h-full w-full object-cover" />
                      </div>
                      <button
                        onClick={() => toggleFileType(file.id)}
                        className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px]"
                      >
                        {file.type === 'photo' ? <Camera size={10} /> : <House size={10} />}
                        {file.type === 'photo' ? 'Photo' : 'Plan'}
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 opacity-0 group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AppButton
              onClick={handleStartProcessing}
              disabled={!canStartProcessing}
              className={`w-full justify-center rounded-lg py-2.5 font-medium ${
                canStartProcessing ? 'bg-[var(--accent)] text-slate-900 hover:opacity-90' : 'bg-black/30 text-[var(--text-3)]'
              }`}
            >
              <CheckCircle size={16} />
              {hasFloorPlan ? 'Convert floor plan to 3D room' : 'Generate 3D room'}
              <ArrowRight size={16} />
            </AppButton>
          </div>
          </section>
      </div>
    </div>
  )
}
