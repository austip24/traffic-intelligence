"use client"

import { Loader2, MapPin, Search } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { useMapHandle, useSelection } from "@/components/explorer/explorer-provider"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { usePlaceSearch } from "@/hooks/use-explorer-data"
import type { SearchResult } from "@/lib/api/schemas"
import { areaLabel, STATES } from "@/lib/domain/area"

const noop = () => () => {}

/** ⌘ on Apple platforms, Ctrl elsewhere; "Ctrl" during SSR. */
export function useShortcutModifier(): string {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl"
  )
}

function ResultItem({ result, onChoose }: { result: SearchResult; onChoose: () => void }) {
  return (
    <CommandItem value={result.geoid} onSelect={onChoose}>
      <MapPin />
      <span className="truncate">{areaLabel(result)}</span>
      <span className="ml-auto text-xs text-muted-foreground">
        {result.level === "state" ? "State" : STATES[result.stateFips]?.name}
      </span>
    </CommandItem>
  )
}

/**
 * Finds a state or county by name, then moves the map to it and opens its
 * profile. The keyboard path to every area on the map.
 */
export function PlaceSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { data, isFetching, isError, refetch } = usePlaceSearch(query)
  const { select } = useSelection()
  const { fitBBox } = useMapHandle()
  const modifier = useShortcutModifier()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const choose = (result: SearchResult) => {
    setOpen(false)
    setQuery("")
    select({ type: "area", geoid: result.geoid })
    fitBBox(result.bbox)
  }

  const tooShort = query.trim().length < 2
  const results = tooShort ? [] : (data ?? [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Search places"
        className="gap-2 text-muted-foreground sm:w-56 sm:justify-start"
      >
        <Search />
        <span className="max-sm:sr-only">Search places…</span>
        <Kbd className="ml-auto max-md:hidden">{modifier} K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search places"
        description="Find a state or county and open its profile"
      >
        {/* Results come from the server already ranked; don't re-filter them. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="State or county, e.g. Cook IL"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {tooShort ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type at least two letters.
              </p>
            ) : isError ? (
              <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">
                Search failed.{" "}
                <button type="button" className="underline" onClick={() => refetch()}>
                  Retry
                </button>
              </p>
            ) : results.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                {isFetching ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Searching…
                  </>
                ) : (
                  "No states or counties match."
                )}
              </p>
            ) : (
              <CommandGroup heading="Places">
                {results.map((result) => (
                  <ResultItem key={result.geoid} result={result} onChoose={() => choose(result)} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
