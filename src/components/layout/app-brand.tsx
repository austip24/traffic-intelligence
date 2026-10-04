import { Waypoints } from "lucide-react"
import Link from "next/link"

export function AppBrand() {
  return (
    <Link
      href="/map"
      className="flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Waypoints className="size-4 text-primary" aria-hidden />
      <span>Traffic Intelligence</span>
    </Link>
  )
}
