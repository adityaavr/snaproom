# AGENTS.md

Operational guide for agents working on this repo. Describes what exists today.
For planned features (floor-plan ingestion, AR, semantic layer, mobile handoff)
see [PLAN.md](./PLAN.md).

## What Snaproom is

Snaproom creates 3D environments, SFX, and meshes from a single input image,
pipelining Claude skills, World Labs (`marble-1.1`), and FAL (`hunyuan-3d`,
`nano-banana`, `gpt-image-2`, `elevenlabs-sfx`). One image becomes an explorable
environment, 3D object meshes, and sound — disk-first, no manual modeling.

## Pipeline (order of operations)

1. Inspect project state and `input/`.
2. Initialize a project (`snaproom-project`) and stage inputs into
   `worlds/<slug>/source/`.
3. Start the viewer: check port 5173, then `bun install && bun run dev`.
4. Uncover/analyze the source image (`snaproom-uncover`).
5. Confirm objects, write one `object.json` per object, decide on a clean plate.
6. Generate the world from the newest source image (`snaproom-world`).
7. One 3D agent per confirmed object (`snaproom-3d`).
8. SFX agents for ambience and per-object impacts (`snaproom-sfx`).
9. Report final project state and viewer URLs.

## Repo layout

```
app/        React + Vite + react-three-fiber viewer (Three.js, Spark splats)
input/      drop-zone for source images
worlds/     per-world envelopes: project.json, scene.json, source/, output/
output/     shared generated output
.claude/    skills, agents, hooks, scripts, rules
```

`worlds/<slug>/source/` holds stable source files; `output/` holds generated
assets. Generated files use `N-slug.ext` indexing — `0` is the original,
higher numbers are derived. Hidden `.N-slug-request.json` sidecars sit beside
each generated file. Inspect state with `ls -a` and read the JSON sidecars.

## Commands

| Task          | Command          |
| ------------- | ---------------- |
| Dev viewer    | `bun run dev`    |
| Build         | `bun run build`  |
| Test          | `bun run test`   |
| Typecheck     | `bun run typecheck` |

The app workspace lives in `app/`; the root `package.json` proxies these.

## Conventions for agents

- **Use skills, don't reimplement them.** Every generation request (3D, world,
  SFX, image edit) runs through its skill. To fix a bad generation, route it
  back through the appropriate skill.
- **Run generation skills non-blocking** via `Agent(..., run_in_background: true)`.
- **Generation scripts are synchronous** — `generate-world.mjs`,
  `generate-single-asset.mjs`, etc. block and print results. Never background
  them or `tail -f` their output.
- **Don't read generated images into context.** Trust script output, indexed
  filenames, and JSON sidecars. To show the user a result, open its folder.
- **Disk-first assets.** Provider URLs in JSON are provenance/resume metadata
  only; the frontend loads local `/worlds/...` files.
- **Showing folders/URLs:** use `.claude/scripts/project/show-folder.mjs` and
  `show-url.mjs` rather than calling `open` directly.

## Setup

Copy `.env.example` to `.env` and set `WORLD_LABS_API_KEY` (worlds) and
`FAL_KEY` (3D, SFX, image edits).
