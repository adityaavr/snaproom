import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorldEntry } from '../types/world'

/**
 * Worlds generated in the browser this session. The hosted build can't run the
 * local disk-based pipeline, so freshly generated worlds live here (mirrored to
 * localStorage) and are merged into the world list alongside the build-time
 * committed worlds. Asset URLs point straight at the World Labs CDN.
 */
interface SessionWorldsState {
  worlds: WorldEntry[]
  addWorld: (entry: WorldEntry) => void
  removeWorld: (slug: string) => void
}

export const useSessionWorlds = create<SessionWorldsState>()(
  persist(
    (set) => ({
      worlds: [],
      addWorld: (entry) =>
        set((state) => ({
          worlds: [...state.worlds.filter((w) => w.slug !== entry.slug), entry],
        })),
      removeWorld: (slug) =>
        set((state) => ({ worlds: state.worlds.filter((w) => w.slug !== slug) })),
    }),
    { name: 'snaproom-session-worlds', version: 1 },
  ),
)
