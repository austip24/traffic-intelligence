import { MapPinOff } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function NotFound() {
  return (
    <Empty className="h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MapPinOff />
        </EmptyMedia>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>
          The page you&apos;re looking for doesn&apos;t exist.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/map" />}>
          Back to the map
        </Button>
      </EmptyContent>
    </Empty>
  )
}
