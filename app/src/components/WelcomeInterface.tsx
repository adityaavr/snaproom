import { Upload, ArrowRight, Cube, SpeakerHigh, Ruler } from '@phosphor-icons/react'
import { AppButton } from './AppButton'

interface Props {
  onStartUpload: () => void
  recentRooms?: Array<{
    slug: string
    name: string
    thumbnail?: string
    createdAt: Date
  }>
  onOpenRoom?: (slug: string) => void
}

export function WelcomeInterface({ onStartUpload, recentRooms = [], onOpenRoom }: Props) {
  return (
    <div className="min-h-screen px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-3)]">Snaproom</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Turn one floor plan into a walkable 3D home preview.
          </h1>
          <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-[var(--text-2)] md:text-base">
            Upload a flat plan or sketch, Snaproom reconstructs the space, furnishes it, and lets you walk through the result.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <AppButton
              onClick={onStartUpload}
              className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-slate-900 hover:opacity-90"
            >
              <Upload size={17} />
              Start now
              <ArrowRight size={17} />
            </AppButton>
            <span className="text-sm text-[var(--text-3)]">8-13 minutes per world</span>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <Ruler size={18} className="text-[var(--accent)]" />
            <h3 className="mt-2 font-medium">Rebuild layout</h3>
            <p className="mt-1 text-sm text-[var(--text-2)]">Reads floor plans and room structure.</p>
          </article>
          <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <Cube size={18} className="text-[var(--accent)]" />
            <h3 className="mt-2 font-medium">Generate objects</h3>
            <p className="mt-1 text-sm text-[var(--text-2)]">Creates meshes and fitting furniture.</p>
          </article>
          <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <SpeakerHigh size={18} className="text-[var(--accent)]" />
            <h3 className="mt-2 font-medium">Add ambience</h3>
            <p className="mt-1 text-sm text-[var(--text-2)]">Builds ambient sound for walkthroughs.</p>
          </article>
        </section>

        {recentRooms.length > 0 && (
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--text-2)]">Recent rooms</h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {recentRooms.map((room) => (
                <button
                  key={room.slug}
                  onClick={() => onOpenRoom?.(room.slug)}
                  className="w-full rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2 text-left hover:bg-black/35"
                >
                  <p className="truncate text-sm font-medium">{room.name}</p>
                  <p className="text-xs text-[var(--text-3)]">{room.createdAt.toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {import.meta.env.DEV && (
          <div className="text-center text-xs text-[var(--text-3)]">
            <a href="?legacy=true" className="underline underline-offset-4">Developer mode</a>
          </div>
        )}
      </div>
    </div>
  )
}
