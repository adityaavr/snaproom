# Design

## Visual Theme
Dark architectural studio.
The interface feels like a drafting table at dusk: structured grids, muted materials, and focused accent color for action.

## Color Strategy
Restrained with two cool accents.

### Core tokens (OKLCH)
- `--bg-0`: `oklch(0.15 0.012 245)`
- `--bg-1`: `oklch(0.19 0.014 245)`
- `--bg-2`: `oklch(0.24 0.018 245)`
- `--surface`: `oklch(0.28 0.02 244 / 0.72)`
- `--surface-strong`: `oklch(0.34 0.024 244 / 0.84)`
- `--text-1`: `oklch(0.95 0.01 235)`
- `--text-2`: `oklch(0.81 0.016 236)`
- `--text-3`: `oklch(0.68 0.014 236)`
- `--line`: `oklch(0.5 0.014 240 / 0.34)`
- `--accent`: `oklch(0.73 0.11 176)`
- `--accent-2`: `oklch(0.7 0.09 208)`

## Typography
- Display: Fraunces (headline moments only)
- UI/body: Manrope
- Max body line length target: 65-75 characters
- Scale emphasizes clear jumps between metadata, body text, and section headers

## Layout
- Panels are split by task, not nested card stacks.
- Primary pages use `max-w-6xl` with asymmetrical grid columns for better rhythm.
- Any region that can exceed viewport height must explicitly use `overflow-y-auto`.

## Components
- Primary CTA: solid accent fill, rounded-xl, high contrast text
- Secondary controls: translucent dark background with line token border
- Status rows: border and background shift by state (`pending`, `running`, `completed`)
- Tags/pills: compact metadata markers for process and file type context

## Motion
- Keep transitions short and purposeful (`180ms-300ms`, ease-out).
- Use opacity and color transitions for state changes.
- Avoid decorative, non-informative motion.
