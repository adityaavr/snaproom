import { writeFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { filename, data, roomName, worldSlug } = req.body
    
    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' })
    }

    console.log(`📁 Uploading ${filename} for ${roomName || 'room'}`)
    
    // Ensure input directory exists
    await mkdir('input', { recursive: true })
    
    // Convert base64 to buffer and save file
    const buffer = Buffer.from(data, 'base64')
    const inputPath = path.join('input', filename)
    await writeFile(inputPath, buffer)
    
    console.log(`✅ Saved ${filename} to input/`)
    
    // If worldSlug is provided, trigger world generation
    if (worldSlug && roomName) {
      console.log(`🌍 Starting world generation for ${roomName}`)
      
      const prompt = `A modern ${roomName.toLowerCase()} interior - static environment without any personal items or objects`
      
      // Call the world generation script
      const child = spawn('node', [
        '.claude/scripts/world/generate-world.mjs',
        '--world', worldSlug,
        '--image', inputPath,
        '--prompt', prompt
      ], {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      
      // Don't wait for completion, return immediately
      res.status(200).json({
        success: true,
        message: 'File uploaded and world generation started',
        filename,
        inputPath,
        worldSlug,
        command: `node .claude/scripts/world/generate-world.mjs --world ${worldSlug} --image ${inputPath} --prompt "${prompt}"`
      })
      
    } else {
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        filename,
        inputPath
      })
    }
    
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    })
  }
}