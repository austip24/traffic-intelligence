import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-svh flex-col">
      <div className="flex h-12 items-center gap-2 border-b px-3">
        <Skeleton className="size-7" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-80 border-r p-3 lg:block">
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="flex-1 rounded-none" />
        <div className="hidden w-96 border-l xl:block" />
      </div>
    </div>
  )
}
