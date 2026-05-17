#!/usr/bin/env node
import {
  ensureDir,
  many,
  one,
  parseArgs,
  pathExists,
} from "../asset-pipeline/fal-queue.mjs";
import { runImageEdit } from "../asset-pipeline/image-edit.mjs";
import { generateWorld } from "../world/generate-world.mjs";

/**
 * Floor plan -> 3D world.
 *
 * World Labs Marble expects a photo-like scene image, not a top-down 2D
 * schematic. So a floor plan is first run through an image-conditioned FAL
 * edit (nano-banana) that renders a photorealistic interior matching the
 * plan's layout, and that interior is what gets handed to World Labs.
 */

// Prompt that turns a top-down 2D floor plan into an interior view Marble can
// reconstruct. nano-banana is image-conditioned, so it follows the plan.
const FLOORPLAN_TO_INTERIOR_PROMPT = [
  "Transform this 2D architectural floor plan into a single photorealistic",
  "interior photograph taken from inside the space, at standing eye level.",
  "Reconstruct real walls, floor, ceiling, windows and doorways that match the",
  "floor plan's layout, proportions and room shape. Natural daylight,",
  "realistic materials and textures, wide-angle interior view.",
  "Keep it an empty, unfurnished static environment — no furniture, no people,",
  "no text, no floor-plan lines or labels. Architectural visualization quality.",
].join(" ");

function logStep(message) {
  console.error(`[floorplan->world ${new Date().toISOString()}] ${message}`);
}

/** Pick the first downloadable image from an image-edit result summary. */
function firstGeneratedImage(summary) {
  return (summary.downloaded_files || []).find((file) => {
    const contentType = file.source?.content_type || "";
    return contentType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.path);
  });
}

export async function generateWorldFromFloorplan(options) {
  const { world, image, prompt, regenerate = false } = options;

  if (!world) throw new Error("world is required.");
  if (!image) throw new Error("image (floor plan) is required.");
  if (!(await pathExists(image))) {
    throw new Error(`Floor plan image not found: ${image}`);
  }

  const sourceDir = `worlds/${world}/source`;
  await ensureDir(sourceDir);

  // Step 1 — FAL image edit: floor plan -> photoreal interior.
  logStep(`converting floor plan to a photoreal interior via FAL: ${image}`);
  const edit = await runImageEdit({
    prompt: prompt
      ? `${FLOORPLAN_TO_INTERIOR_PROMPT}\n\nAdditional direction: ${prompt}`
      : FLOORPLAN_TO_INTERIOR_PROMPT,
    images: [image],
    outputDir: sourceDir,
    numImages: 1,
    outputFormat: "png",
  });

  const roomImage = firstGeneratedImage(edit);
  if (!roomImage) {
    throw new Error("FAL image edit did not return a room image for the floor plan.");
  }
  logStep(`room visualization ready: ${roomImage.path}`);

  // Step 2 — World Labs: photoreal interior -> explorable 3D world.
  logStep("generating the 3D world from the room visualization...");
  const result = await generateWorld({ world, image: roomImage.path, prompt, regenerate });
  logStep("floor plan -> world pipeline complete.");

  return {
    ...result,
    floorplan_image: image,
    room_image: roomImage.path,
  };
}

async function main() {
  const { flags } = parseArgs();
  const world = one(flags, "world");
  const image = one(flags, "image");
  const prompt =
    [...many(flags, "prompt"), ...many(flags, "description")].join("\n").trim() || undefined;

  if (!world || !image) {
    throw new Error(
      "Usage: node generate-world-from-floorplan.mjs --world <slug> --image <floor-plan-path> [--prompt <text>] [--regenerate]"
    );
  }

  const result = await generateWorldFromFloorplan({
    world,
    image,
    prompt,
    regenerate: Boolean(flags.regenerate),
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
