import worlds from 'virtual:worlds'
import { type World, type WorldEntry } from '../types/world'

export function loadWorlds(): WorldEntry[] {
  return worlds as WorldEntry[]
}

export async function fetchWorlds(): Promise<WorldEntry[]> {
  if (!import.meta.env.DEV) return loadWorlds()

  const response = await fetch('/__worlds', { cache: 'no-store' })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<WorldEntry[]>
}

/**
 * A renderable asset URL. Committed worlds use local `/worlds/...` paths;
 * browser-generated (session) worlds point straight at the World Labs CDN,
 * so absolute http(s) URLs are accepted too.
 */
export function usableAssetUrl(url: string | undefined): string {
  if (!url) return ''
  return url.startsWith('/worlds/') || url.startsWith('http://') || url.startsWith('https://')
    ? url
    : ''
}

export function getSplatUrl(world: World): string {
  return usableAssetUrl(world.assets.splats.spz_urls.full_res)
}
