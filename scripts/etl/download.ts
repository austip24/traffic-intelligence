/**
 * Downloads every source file into .data/raw (cached).
 * Usage: pnpm etl:download [--force]
 */
import { download } from "./lib/download"
import { allSources } from "./sources"

const force = process.argv.includes("--force")
const CONCURRENCY = 4

const queue = allSources()
let failed = 0

async function worker() {
  for (let source = queue.shift(); source; source = queue.shift()) {
    try {
      const result = await download(source, { force })
      const mb = (result.bytes / 1_048_576).toFixed(1)
      console.log(`${result.cached ? "cached " : "fetched"}  ${source.id.padEnd(14)} ${mb} MB`)
    } catch (error) {
      failed++
      console.error(`FAILED   ${source.id}: ${(error as Error).message}`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
if (failed > 0) {
  console.error(`${failed} download(s) failed`)
  process.exit(1)
}
