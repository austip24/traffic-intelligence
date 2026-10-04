"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Subscribes to a CSS media query. Returns false during SSR and hydration, so
 * only use it for things that render after interaction (e.g. which side a
 * sheet opens from), not for layout that must match the server HTML.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
