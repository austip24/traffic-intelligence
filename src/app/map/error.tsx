"use client"

import { TriangleAlert } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function MapError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Empty className="h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>The map couldn&apos;t load</EmptyTitle>
        <EmptyDescription>
          Something went wrong while loading the explorer.
          {error.digest && (
            <span className="mt-1 block font-mono text-xs">
              Reference: {error.digest}
            </span>
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={retry}>Try again</Button>
      </EmptyContent>
    </Empty>
  )
}
