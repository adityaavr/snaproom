#!/usr/bin/env node

import { runFalWildcard } from "../fal/run-fal.mjs";
import { pathExists, readJson, writeJson, ensureDir } from "../asset-pipeline/fal-queue.mjs";
import path from "node:path";

/**
 * Generates realistic room images from floor plan using FAL AI
 * 
 * Usage:
 * node .claude/scripts/floorplan/generate-rooms-from-floorplan.mjs \
 *   --input-file input/floorplan.png \
 *   --room-name "Living Room" \
 *   --output-dir output/rooms \
 *   --style modern
 */

async function generateRoomsFromFloorplan(options) {
  const {
    inputImagePath,
    roomName = "Living Room", 
    outputDir = "output/rooms",
    style = "modern",
    roomType = "living_room",
    promptSuffix = ""
  } = options;

  if (!inputImagePath) {
    throw new Error("--input-file is required");
  }

  if (!await pathExists(inputImagePath)) {
    throw new Error(`Input file not found: ${inputImagePath}`);
  }

  await ensureDir(outputDir);

  // Determine the best FAL endpoint for floor plan to room conversion
  // Based on research, we'll use architectural visualization models
  const endpoint = "fal-ai/flux-pro/v1.1";
  
  // Create a comprehensive prompt for floor plan to realistic room conversion
  const basePrompt = `Convert this architectural floor plan into a realistic, photorealistic interior room image. 
Room type: ${roomType}. 
Room name: ${roomName}. 
Interior design style: ${style}. 
Show detailed furniture placement, realistic lighting, textures, and materials. 
Include appropriate furniture, decor, and ambiance for a ${roomType}. 
High resolution, professional architectural visualization quality. 
${promptSuffix}`.trim();

  const input = {
    image_url: inputImagePath,
    prompt: basePrompt,
    image_size: "landscape_16_9",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 4,  // Generate multiple variations
    enable_safety_checker: true,
    sync_mode: false
  };

  console.log(`🏠 Generating room images from floor plan...`);
  console.log(`📁 Input: ${inputImagePath}`);
  console.log(`🎨 Style: ${style}`);
  console.log(`🏠 Room: ${roomName} (${roomType})`);
  console.log(`💫 Prompt: ${basePrompt.substring(0, 100)}...`);

  try {
    const result = await runFalWildcard({
      endpoint,
      input,
      outputDir,
      outputSlug: `${roomName.toLowerCase().replace(/\s+/g, '-')}-${roomType}`,
      kind: "floorplan-to-room",
      mode: "queue",
      pollIntervalMs: 3000,
      downloadOutputs: true,
      userPrompt: `Generate realistic room images for ${roomName} from floor plan`
    });

    console.log(`✅ Successfully generated ${result.output_files?.length || 0} room images`);
    console.log(`📂 Output directory: ${outputDir}`);
    
    // Save additional metadata about the conversion
    const metadataPath = path.join(outputDir, `${roomName.toLowerCase().replace(/\s+/g, '-')}-metadata.json`);
    await writeJson(metadataPath, {
      schema_version: 1,
      conversion_type: "floorplan_to_room",
      room_name: roomName,
      room_type: roomType,
      style: style,
      input_floorplan: inputImagePath,
      generated_images: result.output_files || [],
      prompt: basePrompt,
      created_at: new Date().toISOString(),
      fal_endpoint: endpoint,
      processing_metadata: result
    });

    return {
      success: true,
      roomImages: result.output_files || [],
      metadata: metadataPath,
      roomName,
      roomType,
      style
    };

  } catch (error) {
    console.error(`❌ Error generating room images:`, error.message);
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const { parseArgs } = await import("../asset-pipeline/fal-queue.mjs");
  const { flags } = parseArgs();

  const inputImagePath = flags["input-file"]?.[0] || flags["input"]?.[0];
  const roomName = flags["room-name"]?.[0] || flags["room"]?.[0] || "Living Room";
  const outputDir = flags["output-dir"]?.[0] || flags["output"]?.[0] || "output/rooms";
  const style = flags["style"]?.[0] || "modern";
  const roomType = flags["room-type"]?.[0] || flags["type"]?.[0] || "living_room";
  const promptSuffix = flags["prompt-suffix"]?.[0] || "";

  try {
    const result = await generateRoomsFromFloorplan({
      inputImagePath,
      roomName,
      outputDir,
      style,
      roomType,
      promptSuffix
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { generateRoomsFromFloorplan };