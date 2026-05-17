/**
 * API handler for world generation
 * This would be implemented as a backend service in production
 */

import { writeFile } from 'fs/promises'
import path from 'path'

interface WorldGenerationRequest {
  worldSlug: string
  roomName: string
  image: string
  textPrompt: string
  base64Data: string
  fileExtension: string
}

export async function generateWorld(request: WorldGenerationRequest) {
  const { worldSlug, roomName, image, textPrompt, base64Data, fileExtension } = request
  
  try {
    console.log(`🏗️ Starting world generation for ${roomName}`)
    
    // Step 1: Save uploaded file to input directory
    const inputPath = path.join(process.cwd(), 'input', image)
    const buffer = Buffer.from(base64Data, 'base64')
    await writeFile(inputPath, buffer)
    
    console.log(`📁 Saved ${image} to input directory`)
    
    // Step 2: Call the actual world generation script
    const { spawn } = await import('child_process')
    
    return new Promise((resolve, reject) => {
      const scriptPath = '.claude/scripts/world/generate-world.mjs'
      const args = [
        scriptPath,
        '--world', worldSlug,
        '--image', inputPath,
        '--prompt', textPrompt,
        '--output-dir', 'worlds'
      ]
      
      console.log(`🚀 Running: node ${args.join(' ')}`)
      
      const child = spawn('node', args, {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe']
      })
      
      let output = ''
      let errorOutput = ''
      
      child.stdout?.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log(text)
      })
      
      child.stderr?.on('data', (data) => {
        const text = data.toString()
        errorOutput += text
        console.error(text)
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ World generation completed for ${worldSlug}`)
          resolve({
            success: true,
            worldSlug,
            output
          })
        } else {
          console.error(`❌ World generation failed with code ${code}`)
          reject(new Error(`World generation script failed: ${errorOutput}`))
        }
      })
      
      child.on('error', (error) => {
        console.error('❌ Failed to start world generation script:', error)
        reject(error)
      })
    })
    
  } catch (error) {
    console.error('❌ World generation error:', error)
    throw error
  }
}