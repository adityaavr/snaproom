#!/usr/bin/env node

/**
 * Simple script to save uploaded files to input directory
 * This bridges the gap between UI uploads and the world generation scripts
 */

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

async function saveFileToInput(filename, base64Data) {
  try {
    // Ensure input directory exists
    await mkdir('input', { recursive: true })
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Save file
    const filePath = path.join('input', filename)
    await writeFile(filePath, buffer)
    
    console.log(`✅ Saved ${filename} to input/`)
    return filePath
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error.message)
    throw error
  }
}

// For CLI usage
if (process.argv.length > 2) {
  const filename = process.argv[2]
  const base64Data = process.argv[3]
  
  if (!filename || !base64Data) {
    console.error('Usage: node upload-to-input.js <filename> <base64data>')
    process.exit(1)
  }
  
  saveFileToInput(filename, base64Data)
    .then(() => console.log('File upload complete'))
    .catch(() => process.exit(1))
}

export { saveFileToInput }