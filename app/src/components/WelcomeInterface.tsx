import { ArrowUpRight } from '@phosphor-icons/react'
import { ModelStage } from './ModelStage'

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

const PIPELINE = [
  { no: '01', title: 'Reconstruct', desc: 'Reads plan geometry and room structure.' },
  { no: '02', title: 'Furnish', desc: 'Generates fitted meshes and placed objects.' },
  { no: '03', title: 'Atmosphere', desc: 'Layers ambient sound across the walkthrough.' },
]

/** Extruded-cube mark: a flat plan lifted into volume. */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="1.75" y="6.75" width="10.5" height="10.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M1.75 6.75 6.75 1.75H17.25V12.25M12.25 17.25 17.25 12.25M12.25 6.75 17.25 1.75"
        stroke="var(--accent)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const TICK_POS: Record<string, string> = {
  tl: 'left-0 top-0 border-l border-t',
  tr: 'right-0 top-0 border-r border-t',
  bl: 'left-0 bottom-0 border-l border-b',
  br: 'right-0 bottom-0 border-r border-b',
}

/** Registration crosshair pinned to a viewport corner. */
function CornerTick({ pos }: { pos: keyof typeof TICK_POS }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-3.5 w-3.5 border-[var(--accent)]/70 ${TICK_POS[pos]}`}
    />
  )
}

export function WelcomeInterface({ onStartUpload, recentRooms = [], onOpenRoom }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-0)] text-[var(--text-1)] lg:h-screen lg:overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-1)]">
            <Mark />
          </span>
          <span className="text-[15px] font-bold tracking-[-0.01em]">Snaproom</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)] sm:inline">
            / spatial reconstruction
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Local build
          </span>
          {import.meta.env.DEV && (
            <a
              href="?legacy=true"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] underline-offset-4 hover:text-[var(--text-1)] hover:underline"
            >
              Developer
            </a>
          )}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:overflow-hidden">
        {/* Content */}
        <section className="order-2 flex flex-col justify-center overflow-y-auto px-5 py-12 sm:px-8 lg:order-1 lg:px-12 lg:py-0">
          <div className="w-full max-w-[33rem]">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-3)]">
              <span className="h-px w-7 bg-[var(--accent)]" />
              Spatial reconstruction engine
            </div>

            <h1 className="mt-5 text-[2.15rem] font-bold leading-[1.06] tracking-[-0.025em] sm:text-[2.6rem]">
              Turn a floor plan into a space you can walk through.
            </h1>

            <p className="mt-5 max-w-[54ch] text-[15px] leading-relaxed text-[var(--text-2)]">
              Snaproom reconstructs the room, furnishes it, and builds its ambient
              sound from a single source image, then hands you a walkable result.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={onStartUpload}
                className="group inline-flex items-center gap-2.5 rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[oklch(0.22_0.04_195)] transition-[filter,transform] duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-px"
              >
                Upload a floor plan
                <ArrowUpRight
                  size={16}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-3)]">
                8-13 min / world
              </span>
            </div>

            {/* Pipeline spec sheet */}
            <ul className="mt-10 border-t border-[var(--line)]">
              {PIPELINE.map((step) => (
                <li
                  key={step.no}
                  className="flex items-baseline gap-4 border-b border-[var(--line)] py-3.5"
                >
                  <span className="font-mono text-xs text-[var(--accent)]">{step.no}</span>
                  <span className="w-24 shrink-0 text-sm font-semibold tracking-[-0.01em]">
                    {step.title}
                  </span>
                  <span className="text-[13px] leading-snug text-[var(--text-3)]">
                    {step.desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Model stage */}
        <section className="relative order-1 min-h-[46vh] border-b border-[var(--line)] lg:order-2 lg:min-h-0 lg:border-b-0 lg:border-l">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,var(--bg-1),var(--bg-0))]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'linear-gradient(oklch(0.7 0.02 245 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(0.7 0.02 245 / 0.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage:
                'radial-gradient(ellipse 75% 70% at 50% 50%, #000 40%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 75% 70% at 50% 50%, #000 40%, transparent 100%)',
            }}
          />

          {/* Framed viewport */}
          <div className="absolute inset-5 border border-[var(--line)] sm:inset-7 lg:inset-9">
            <ModelStage />
            <CornerTick pos="tl" />
            <CornerTick pos="tr" />
            <CornerTick pos="bl" />
            <CornerTick pos="br" />

            <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
              Model.glb
            </span>
            <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]/80">
              Auto-orbit
            </span>
            <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
              Drag to rotate
            </span>
            <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
              WebGL · realtime
            </span>
          </div>
        </section>
      </main>

      {/* ── Recent rooms tray ───────────────────────────────────── */}
      {recentRooms.length > 0 && (
        <section className="flex shrink-0 items-center gap-4 border-t border-[var(--line)] px-5 py-3 sm:px-8">
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)] sm:inline">
            Recent rooms
          </span>
          <div className="flex gap-2 overflow-x-auto">
            {recentRooms.map((room) => (
              <button
                key={room.slug}
                type="button"
                onClick={() => onOpenRoom?.(room.slug)}
                className="group flex shrink-0 items-center gap-2.5 rounded border border-[var(--line)] bg-[var(--surface)] py-1.5 pl-2.5 pr-3.5 text-left transition-colors duration-150 hover:border-[var(--accent)]/50"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-3)] transition-colors duration-150 group-hover:bg-[var(--accent)]" />
                <span className="max-w-[14rem] truncate text-xs font-medium">{room.name}</span>
                <span className="font-mono text-[10px] tabular-nums text-[var(--text-3)]">
                  {room.createdAt.toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
