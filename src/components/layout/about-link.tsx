import { Info } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function AboutLink() {
  return (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href="/about" />}
      aria-label="About the data"
    >
      <Info />
      <span className="max-lg:sr-only">About the data</span>
    </Button>
  )
}
