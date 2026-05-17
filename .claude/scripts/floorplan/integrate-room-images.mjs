#!/usr/bin/env node

import { runFalWildcard } from "../fal/run-fal.mjs";
import { pathExists, readJson, writeJson, ensureDir } from "../asset-pipeline/fal-queue.mjs";
import path from "node:path";

/**
 * Integrates generated room images from floor plans into Snaproom 3D rendering pipeline
 * This script takes the AI-generated room images and prepares them for 3D world generation
 */

async function integrateRoomImages(options) {
  const {
    roomImagesDir,
    roomName,
    outputWorldDir = "worlds",
    roomSlug
  } = options;

  if (!roomImagesDir) {
    throw new Error("--room-images-dir is required");
  }

  if (!await pathExists(roomImagesDir)) {
    throw new Error(`Room images directory not found: ${roomImagesDir}`);
  }

  const slug = roomSlug || roomName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const worldDir = path.join(outputWorldDir, slug);
  
  await ensureDir(worldDir);

  console.log(`🔗 Integrating room images for ${roomName}...`);
  console.log(`📂 Room images: ${roomImagesDir}`);
  console.log(`🌍 World directory: ${worldDir}`);

  try {
    // Read the room images metadata
    const metadataPath = path.join(roomImagesDir, `${roomName.toLowerCase().replace(/\s+/g, '-')}-metadata.json`);
    let roomMetadata = {};
    
    if (await pathExists(metadataPath)) {
      roomMetadata = await readJson(metadataPath);
    }

    const roomImages = roomMetadata.generated_images || [];
    
    if (!roomImages.length) {
      throw new Error("No room images found to integrate");
    }

    // Select the best room image for world generation (first one for now)
    const primaryRoomImage = roomImages[0];
    
    console.log(`🎯 Primary room image: ${primaryRoomImage}`);

    // Generate 3D world from the room image using World Labs API
    console.log(`🏗️  Generating 3D world from room image...`);
    
    // Use the existing world generation script's endpoint
    const worldGenerationResult = await runFalWildcard({
      endpoint: "worldlabs/3d-world-generation",  // Placeholder endpoint
      input: {
        image_url: primaryRoomImage,
        prompt: `Generate a detailed 3D walkable environment from this ${roomMetadata.room_type || 'room'} image. Create accurate depth, geometry, and spatial layout for an immersive VR/3D experience.`,
        quality: "high",
        style: roomMetadata.style || "realistic"
      },
      outputDir: worldDir,
      outputSlug: "world",
      kind: "room-to-world",
      mode: "queue",
      pollIntervalMs: 5000,
      downloadOutputs: true,
      userPrompt: `Generate 3D world from floor plan-derived room image for ${roomName}`
    });

    // Create Snaproom project structure
    const projectMetadata = {
      schema_version: 1,
      project_type: "floorplan_generated",
      display_name: roomName,
      slug: slug,
      room_type: roomMetadata.room_type,
      style: roomMetadata.style,
      source_type: "floorplan",
      original_floorplan: roomMetadata.input_floorplan,
      generated_images: roomImages,
      primary_image: primaryRoomImage,
      world_generation: worldGenerationResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save project metadata
    const projectMetadataPath = path.join(worldDir, "project.json");
    await writeJson(projectMetadataPath, projectMetadata);

    // Create world metadata compatible with Snaproom structure
    const worldMetadata = {
      schema_version: 1,
      slug: slug,
      display_name: roomName,
      created_at: new Date().toISOString(),
      source_image_url: primaryRoomImage,
      room_type: roomMetadata.room_type || "living_room",
      generation_method: "floorplan_to_room_to_world",
      assets: {
        splats: {
          spz_urls: {}  // Will be populated when world generation completes
        }
      }
    };

    const worldMetadataPath = path.join(worldDir, "world.json");
    await writeJson(worldMetadataPath, worldMetadata);

    console.log(`✅ Successfully integrated room images into Snaproom world structure`);
    console.log(`📁 World directory: ${worldDir}`);
    console.log(`📄 Project metadata: ${projectMetadataPath}`);
    console.log(`🌍 World metadata: ${worldMetadataPath}`);

    return {
      success: true,
      worldDir,
      projectMetadata: projectMetadataPath,
      worldMetadata: worldMetadataPath,
      slug,
      roomName,
      primaryImage: primaryRoomImage,
      roomImages
    };

  } catch (error) {
    console.error(`❌ Error integrating room images:`, error.message);
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const { parseArgs } = await import("../asset-pipeline/fal-queue.mjs");
  const { flags } = parseArgs();

  const roomImagesDir = flags["room-images-dir"]?.[0] || flags["images"]?.[0];
  const roomName = flags["room-name"]?.[0] || flags["room"]?.[0] || "Generated Room";
  const outputWorldDir = flags["output-world-dir"]?.[0] || flags["worlds"]?.[0] || "worlds";
  const roomSlug = flags["room-slug"]?.[0] || flags["slug"]?.[0];

  try {
    const result = await integrateRoomImages({
      roomImagesDir,
      roomName,
      outputWorldDir,
      roomSlug
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { integrateRoomImages };