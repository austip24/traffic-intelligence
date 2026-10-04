import { readFile } from "node:fs/promises"
import { Readable } from "node:stream"
import { parse } from "csv-parse"
import { unzipSync } from "fflate"

export type CsvRow = Record<string, string>

const DECODE_CHUNK_BYTES = 1 << 20

/**
 * Decodes CSV bytes incrementally. Files with a UTF-8 byte-order mark are
 * UTF-8 (e.g. FARS 2021 accident.csv); everything else from NHTSA and Census
 * is Windows-1252. Text is produced in 1 MB pieces so 100+ MB files never
 * exist as one giant string.
 */
export function* decodeCsv(bytes: Uint8Array): Generator<string> {
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const decoder = new TextDecoder(hasBom ? "utf-8" : "windows-1252")
  const body = hasBom ? bytes.subarray(3) : bytes
  for (let i = 0; i < body.length; i += DECODE_CHUNK_BYTES) {
    // stream: true keeps multi-byte UTF-8 sequences split across chunks intact.
    yield decoder.decode(body.subarray(i, i + DECODE_CHUNK_BYTES), { stream: true })
  }
  yield decoder.decode()
}

/** Extracts one file from a zip by basename, case-insensitively and in any folder. */
export async function readZipEntry(
  zipPath: string,
  baseName: string
): Promise<Uint8Array> {
  const pattern = new RegExp(`(^|/)${baseName.replace(".", "\\.")}$`, "i")
  const entries = unzipSync(await readFile(zipPath), {
    filter: (file) => pattern.test(file.name),
  })
  const matches = Object.values(entries)
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${baseName} in ${zipPath}, found ${matches.length}`
    )
  }
  return matches[0]
}

/**
 * Streams CSV rows, keeping only `columns`. FARS person/vehicle files are
 * 100+ MB with ~200 columns; materializing every field would waste memory.
 */
export async function* readCsv(
  bytes: Uint8Array,
  columns: readonly string[]
): AsyncGenerator<CsvRow> {
  const keep = new Set(columns)
  const parser = Readable.from(decodeCsv(bytes)).pipe(
    parse({
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      columns: (header: string[]) => {
        const missing = columns.filter((c) => !header.includes(c))
        if (missing.length > 0) {
          throw new Error(`CSV is missing columns: ${missing.join(", ")}`)
        }
        // `false` tells csv-parse to skip the column entirely.
        return header.map((name) => (keep.has(name) ? name : false))
      },
    })
  )
  for await (const row of parser) yield row as CsvRow
}
