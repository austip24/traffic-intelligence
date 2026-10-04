import { spawn } from "node:child_process"

const RESULT_MARKER = "@@RESULT "

/** Called by a worker process to hand its result back to the parent. */
export function emitResult(result: unknown) {
  process.stdout.write(`${RESULT_MARKER}${JSON.stringify(result)}\n`)
}

/**
 * Re-runs the current script in a child process with `args` and returns the
 * value it passed to emitResult(), retrying if the child crashes.
 *
 * Why: on some Windows Node 22 installs, parsing several hundred MB of CSV in
 * one process intermittently segfaults inside V8. A process per unit of work
 * bounds memory and turns a crash into a retry. Work must be idempotent
 * (each FARS year is one transaction, so a crash rolls back cleanly).
 */
export async function runIsolated<T>(
  args: string[],
  { retries = 3, label = args.join(" ") } = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const outcome = await runOnce<T>(args)
    if (outcome.ok) return outcome.result
    if (attempt > retries) {
      throw new Error(`${label}: failed after ${attempt} attempts (${outcome.reason})`)
    }
    console.warn(`  ${label}: ${outcome.reason}; retrying (${attempt}/${retries})`)
  }
}

function runOnce<T>(
  args: string[]
): Promise<{ ok: true; result: T } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [...process.execArgv, process.argv[1], ...args],
      { stdio: ["ignore", "pipe", "inherit"] }
    )
    let result: T | undefined
    let buffer = ""
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk
      let newline: number
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        if (line.startsWith(RESULT_MARKER)) {
          result = JSON.parse(line.slice(RESULT_MARKER.length)) as T
        } else {
          console.log(line)
        }
      }
    })
    child.on("close", (code, signal) => {
      if (code === 0 && result !== undefined) resolve({ ok: true, result })
      else resolve({ ok: false, reason: signal ? `signal ${signal}` : `exit code ${code}` })
    })
  })
}
