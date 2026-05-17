# PLAN.md

Roadmap for Snaproom. These are planned features — **not yet built**. For the
current operational guide, see [AGENTS.md](./AGENTS.md).

## Vision

Snaproom turns a flat floor plan or hand-drawn sketch into a fully furnished,
walkable 3D world in minutes. Upload a plan, and Snaproom reconstructs the
space, fills it with furniture that fits the layout, and lets you walk through
your future home before a single wall goes up.

## Input → Output

**Input** — one of:

- A normal photo of an artist-inspired / styled room.
- A 2D floor plan.

**Output** — a 3D space reconstructed from the uploaded image.

If a **2D floor plan** is uploaded, an extra step runs first: FAL AI generates a
2D visualization (a rendered view) of the floor plan, and *that* render is what
gets sent into the image blaster pipeline. A normal room photo skips this and
goes straight into the pipeline.

> Status: the floor-plan → FAL 2D visualization step has no skill or script
> yet. Today the pipeline (see AGENTS.md) starts from a source image directly.

## Features

1. **Live Augmented Reality** — view the reconstructed space through a mobile
   phone camera.
2. **Semantic layer** — live, clickable annotations over objects; tapping an
   object surfaces its details.

## AR handoff (web → mobile)

Once the 3D render is generated, the web app produces a **QR code**. Scanning it
opens the companion **Expo** mobile app via a **deep link**, which then runs an
**AR scan** of that generated render.

- The QR encodes a deep link that targets the Expo app (in development, opened
  through **Expo Go**).
- The deep link carries the identity of the generated render so the mobile app
  knows which world/asset to load into AR.
- This is the bridge between the desktop viewer (`app/`) and the separate Expo
  mobile project — they are linked by the deep-link scheme, not a shared build.

### Open questions

- Define the deep-link scheme (e.g. `snaproom://render/<world-slug>`).
- Decide where the Expo mobile project lives — separate repo, or a `mobile/`
  workspace alongside `app/`.
