import { create } from 'zustand'
import { SemanticAnchor3D } from '../types/semantic'

interface SemanticState {
  anchors: SemanticAnchor3D[]
  labelsVisible: boolean
  scanStatus: 'idle' | 'scanning' | 'error'
  triggerScan: number // A simple counter to trigger a scan from outside
  toggleLabels: () => void
  setLabelsVisible: (visible: boolean) => void
  setAnchors: (anchors: SemanticAnchor3D[]) => void
  addAnchors: (newAnchors: SemanticAnchor3D[]) => void
  clearAnchors: () => void
  setScanStatus: (status: 'idle' | 'scanning' | 'error') => void
  setTriggerScan: (value: number) => void
  doTriggerScan: () => void
}

export const useSemanticStore = create<SemanticState>((set) => ({
  anchors: [],
  labelsVisible: false,
  scanStatus: 'idle',
  triggerScan: 0,
  toggleLabels: () => set((state) => ({ labelsVisible: !state.labelsVisible })),
  setLabelsVisible: (visible) => set({ labelsVisible: visible }),
  setAnchors: (anchors) => set({ anchors }),
  addAnchors: (newAnchors) => set((state) => ({ anchors: [...state.anchors, ...newAnchors] })),
  clearAnchors: () => set({ anchors: [] }),
  setScanStatus: (status) => set({ scanStatus: status }),
  setTriggerScan: (value) => set({ triggerScan: value }),
  doTriggerScan: () => set((state) => ({ triggerScan: state.triggerScan + 1 })),
}))
