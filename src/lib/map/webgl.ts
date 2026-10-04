/** MapLibre requires WebGL; check up front so we can show a useful fallback. */
export function isWebGLSupported(): boolean {
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"))
  } catch {
    return false
  }
}
