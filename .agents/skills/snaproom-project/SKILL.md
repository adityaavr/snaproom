---
name: snaproom-project
description: Create, inspect, and manage an snaproom project envelope under worlds/<slug>. Use before other snaproom skills (snaproom-uncover, snaproom-world, snaproom-3d, etc.) or whenever the user asks about active project state.
argument-hint: [world-name or description] [optional instructions]
allowed-tools: Read Write Glob Bash(ls *) Bash(node .Codex/scripts/project/project-state.mjs *) Bash(node .Codex/scripts/project/indexed-path.mjs *) Bash(node .Codex/scripts/project/download.mjs *) Bash(node .Codex/scripts/project/ensure-local-assets.mjs *) Bash(node .Codex/scripts/project/delete.mjs *)
---

Create or inspect an Image Blast project. Input: `$ARGUMENTS`.

## Instructions

Follow the generic file convention in `.Codex/rules/project.md`. Inspect generated directories with `ls -a` before reading JSON details.

Use generic project tools for local indexed asset path computation, explicit downloads, local asset repair, and deletion. Provider-specific scripts are only for provider generation/polling.

1. Resolve the project slug:
   - If `$0` is an existing `worlds/<slug>` directory or a slug-like name, use it.
   - Otherwise derive a lowercase hyphenated slug from `$ARGUMENTS`.
   - If no usable input is provided, ask the user which project/world to use.
2. Run the project-state helper from the repo root. If `input/` contains images or the user asked to use staged input, include `--stage-input` so files move immediately into stable source paths:

```bash
node .Codex/scripts/project/project-state.mjs --world "<slug>" --stage-input
```

3. The helper creates and validates:

```text
worlds/<slug>/
  project.json
  scene.json
  image.json
  source/
    <image-name>.json
  output/
    world/
    sfx/
    <object-slug>/
```

Only minimal `project.json` and directories are created automatically. `/snaproom-uncover` writes per-image `source/<image-name>.json` and root `image.json`, then waits for user confirmation before writing per-object `output/<object-slug>/object.json` files.

4. Read the printed project state or `worlds/<slug>/project.json`.
5. Report:
   - project slug and display name
   - source file count
   - per-image JSON count
   - staged files moved from `input/`, if any
   - whether World Labs output exists
   - whether `image.json` exists
   - derived object count
   - whether world-level SFX exists
   - whether `scene.json` exists
6. If source images now exist and `image.json` is missing, continue directly with the `/snaproom-uncover` workflow for no-cost image analysis and object directory creation. If no source images exist and the user needs to add images, report the `input/` path and ask them to add files there.

7. Recommend downstream actions only after no-cost setup/analysis is complete, in this order:
   - `Agent(snaproom-plate)` for clean plate/source cleanup after object confirmation, when requested or one-shotting
   - `Agent(snaproom-world)` for static 3D environment world generation
   - `Agent(snaproom-3d)` per object 3D generation
   - `Agent(snaproom-sfx)` for ambient, object-impact, or arbitrary sound effects
   - `Agent(snaproom-image-edit)` for generic standalone prompt-based image editing
