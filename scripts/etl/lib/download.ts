import { createWriteStream } from "node:fs"
import { mkdir, rename, stat } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"

import type { SourceFile } from "../sources"

export const RAW_DIR = path.resolve(".data", "raw")

export function rawPath(source: SourceFile): string {
  return path.join(RAW_DIR, source.fileName)
}

async function fileSize(filePath: string): Promise<number | null> {
  try {
    return (await stat(filePath)).size
  } catch {
    return null
  }
}

/**
 * Downloads a source into .data/raw unless an identical-size copy exists.
 * Writes to a temp file first so an interrupted download is never mistaken
 * for a complete one.
 */
export async function download(
  source: SourceFile,
  { force = false } = {}
): Promise<{ path: string; cached: boolean; bytes: number }> {
  await mkdir(RAW_DIR, { recursive: true })
  const target = rawPath(source)
  const existing = await fileSize(target)

  if (existing !== null && !force) {
    const head = await fetch(source.url, { method: "HEAD" })
    const remote = Number(head.headers.get("content-length"))
    // Some servers omit content-length; trust the cache in that case.
    if (!head.ok || !remote || remote === existing) {
      return { path: target, cached: true, bytes: existing }
    }
  }

  const res = await fetch(source.url)
  if (!res.ok || !res.body) {
    throw new Error(`Download failed for ${source.id}: HTTP ${res.status} ${source.url}`)
  }

  const temp = `${target}.part`
  // fetch() is typed with DOM streams; Node's stream helpers want node:stream/web.
  const body = res.body as unknown as NodeReadableStream<Uint8Array>
  await pipeline(Readable.fromWeb(body), createWriteStream(temp))
  await rename(temp, target)
  return { path: target, cached: false, bytes: (await fileSize(target)) ?? 0 }
}
